import React, { useState } from "react";
import { useScenarios } from "@/context/ScenarioContext";

export default function ScenarioForm() {
  const { addScenario } = useScenarios();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    addScenario(t, description);
    setTitle("");
    setDescription("");
  };

  return (
    <form className="scenario-form" onSubmit={submit}>
      <div className="scenario-form-fields">
        <input
          className="scenario-input"
          placeholder="情景名称，如「深度工作」"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="新增情景名称"
        />
        <input
          className="scenario-input"
          placeholder="描述（选填）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="新增情景描述"
        />
      </div>
      <button type="submit" className="add-btn" aria-label="添加情景按钮">
        添加
      </button>
    </form>
  );
}
