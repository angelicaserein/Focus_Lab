import React, { useState } from "react";
import PrivacyNotice from "@/components/privacy/PrivacyNotice";
import { readAck, shouldShowNotice, writeAck } from "@/utils/privacy/privacyNotice";

// 首启告知的挂载点：判断该不该弹，弹完记下来。挂在 App 顶层，平时渲染 null。
//
// 初值在 useState 的惰性初始化里一次算完，不放 useEffect——放 effect 会先渲染一帧
// 没有卡片的主界面再盖上去，第一眼就闪一下。
export default function PrivacyNoticeHost() {
  const [open, setOpen] = useState(() => shouldShowNotice(readAck()));

  if (!open) return null;

  return (
    <PrivacyNotice
      onAck={() => {
        writeAck();
        setOpen(false);
      }}
    />
  );
}
