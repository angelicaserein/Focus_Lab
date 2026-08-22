// 前台应用探测：现在最前面的窗口属于哪个程序。
//
// 没有用 active-win / get-windows 那类原生模块——它们要为每个 Electron ABI
// 重新编译，打包链路上多一个会在墙内下载失败的环节。这里改成起一个常驻的
// PowerShell 子进程，里面 P/Invoke user32 的 GetForegroundWindow，
// 每隔一秒多往 stdout 打一行 JSON。零依赖、不用 rebuild，代价是 Windows-only。
//
// 探测器是「按需启动」的：只有真的开着这个功能、且正在专注时才拉起子进程。
// 不专注的时候机器上不该有一个常驻的进程在盯着用户开了什么——
// 这既是省电，也是这功能唯一说得过去的隐私姿态。

const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");

const POLL_MS = 1200;

// 写到磁盘再用 -File 跑，而不是把整段脚本塞进 -Command：
// 一是省掉一层嵌套引号地狱，二是打包后 electron/ 在 asar 里，
// PowerShell 读不到 asar 内部的路径，必须落到真实文件系统上。
const PS_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class FLWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder text, int count);
  public static string Title(IntPtr h) {
    StringBuilder sb = new StringBuilder(512);
    GetWindowTextW(h, sb, sb.Capacity);
    return sb.ToString();
  }
}
'@

$last = ''
while ($true) {
  $name = ''
  $desc = ''
  $title = ''
  $h = [FLWin]::GetForegroundWindow()
  if ($h -ne [IntPtr]::Zero) {
    # 注意不能叫 $pid —— 那是 PowerShell 的只读自动变量，赋值会报错
    $procId = [uint32]0
    [void][FLWin]::GetWindowThreadProcessId($h, [ref]$procId)
    $title = [FLWin]::Title($h)
    if ($procId -gt 0) {
      $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if ($p) {
        $name = $p.ProcessName
        # 受保护进程读不到 MainModule，Description 会是空的，回落到进程名
        $desc = $p.Description
      }
    }
  }
  $line = [pscustomobject]@{ n = $name; d = $desc; t = $title } | ConvertTo-Json -Compress
  # 没变就不打：前台窗口大部分时间是不动的，没必要每秒刷一行
  if ($line -ne $last) {
    $last = $line
    [Console]::Out.WriteLine($line)
    [Console]::Out.Flush()
  }
  Start-Sleep -Milliseconds ${POLL_MS}
}
`;

// 子进程意外退出后重启，但不无限重试：连续起不来说明这台机器上就是跑不了
// （PowerShell 被策略禁掉之类），一直重试只会刷日志。
const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 3000;

class AppWatcher extends EventEmitter {
  constructor(scriptDir) {
    super();
    this.scriptPath = path.join(scriptDir, "app-watch.ps1");
    this.child = null;
    this.restarts = 0;
    this.stopped = true;
    this.buf = "";
  }

  get running() {
    return !!this.child;
  }

  start() {
    this.stopped = false;
    if (this.child) return;
    try {
      // BOM 不能省：Windows PowerShell 5.1 读 .ps1 时，没有 BOM 就按系统 ANSI
      // （简中机器上是 GBK）解码。注释里的中文会变成乱码，而乱码里随机出现的
      // 引号/反引号会直接把脚本解析坏——报的还是「第 47 行意外的 }」这种
      // 完全指不到病根的错。
      fs.writeFileSync(this.scriptPath, `﻿${PS_SCRIPT}`, "utf8");
    } catch {
      return; // 写不进 userData 就没法跑，静默放弃（功能降级，不影响主流程）
    }

    let child;
    try {
      child = spawn(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.scriptPath],
        { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      return;
    }

    this.child = child;
    this.buf = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      // 收到第一行就说明这一次是真的起来了，重试计数清零。
      // 不清的话，连续三次是「起不来」，而一天里偶尔崩一次、崩到第四次也会被
      // 判成 unavailable —— 那之后功能永久关闭，直到用户重启整个 app。
      this.restarts = 0;
      this.#consume(chunk);
    });
    child.on("error", () => { /* spawn 失败会顺带触发 exit，在那里统一处理 */ });
    child.on("exit", () => {
      if (this.child !== child) return; // 已经被 stop() 换掉了
      this.child = null;
      if (this.stopped) return;
      if (++this.restarts > MAX_RESTARTS) { this.emit("unavailable"); return; }
      setTimeout(() => { if (!this.stopped) this.start(); }, RESTART_DELAY_MS);
    });
  }

  stop() {
    this.stopped = true;
    this.restarts = 0;
    const child = this.child;
    this.child = null;
    if (child) { try { child.kill(); } catch { /* 已经没了 */ } }
  }

  // stdout 是流，一次 data 未必正好是一整行（也可能是好几行）
  #consume(chunk) {
    this.buf += chunk;
    const lines = this.buf.split(/\r?\n/);
    this.buf = lines.pop() ?? "";
    for (const line of lines) {
      const text = line.trim();
      if (!text) continue;
      let raw;
      try { raw = JSON.parse(text); } catch { continue; }
      const name = String(raw?.n || "").trim();
      if (!name) continue;
      this.emit("app", {
        // 统一小写：白名单比对、去重都以它为准
        name: name.toLowerCase(),
        label: String(raw?.d || "").trim() || name,
        title: String(raw?.t || "").trim(),
      });
    }
  }
}

module.exports = { AppWatcher, SUPPORTED: process.platform === "win32" };
