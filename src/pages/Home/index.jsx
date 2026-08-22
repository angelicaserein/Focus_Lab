import React from "react";
import { useFocus } from "@/context/FocusContext";
import TodayTasks from "@/pages/Home/TodayTasks";
import FocusHeatmap from "@/pages/Home/FocusHeatmap";
import DeadlineHorizon from "@/pages/Home/DeadlineHorizon";
import "./Home.css";

// 首屏按「离现在多近」自上而下排：
//   今天要做的事（每条自带「现在专注这件事」直达沉浸层）→ 截止临近（这几天）→ 热力图（回顾）。
// 不再单独放一颗「开始专注」大按钮：它只能把人送到专注页再挑一次任务，
// 而每条任务尾部那颗 ▶ 是一步到位的，留着两条入口反而要先做选择。
// 热力图沉到最后：它是回顾性的，放在首屏顶端会让人一进门先被过去的记录评判一遍。
export default function Home() {
  const { focusRecords } = useFocus();

  return (
    <main className="page page-home">
      <TodayTasks />
      <DeadlineHorizon />
      <FocusHeatmap records={focusRecords} />
    </main>
  );
}
