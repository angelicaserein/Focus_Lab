import React, { useCallback, useRef, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/ui/ConfirmDialog.css";

// 把 ConfirmDialog 包成 window.confirm 那样的一句话调用：
//   const [confirm, confirmDialog] = useConfirm();
//   if (await confirm({ title: "删除？", danger: true })) doIt();
//   return <>… {confirmDialog}</>;
// 这样每个调用点不必各自维护「待确认的是哪一项」那份 state。
// confirmLabel / cancelLabel 省略时用通用的「删除 / 取消」。
export default function useConfirm() {
  const { t } = useLanguage();
  const [opts, setOpts] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    setOpts(options);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = useCallback((answer) => {
    setOpts(null);
    resolveRef.current?.(answer);
    resolveRef.current = null;
  }, []);

  const dialog = opts ? (
    <ConfirmDialog
      title={opts.title}
      message={opts.message}
      danger={opts.danger}
      confirmLabel={opts.confirmLabel ?? t("common.confirm")}
      cancelLabel={opts.cancelLabel ?? t("common.cancel")}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return [confirm, dialog];
}
