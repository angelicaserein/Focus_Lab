import React, { useState } from "react";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";

export default function ScenarioForm() {
  const { addScenario } = useScenarios();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    addScenario(name, description);
    setTitle("");
    setDescription("");
  };

  return (
    <form className="scenario-form" onSubmit={submit}>
      <div className="scenario-form-fields">
        <input
          className="scenario-input"
          placeholder={t("scenario.form.titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label={t("scenario.form.titleAria")}
        />
        <input
          className="scenario-input"
          placeholder={t("scenario.form.descPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label={t("scenario.form.descAria")}
        />
      </div>
      <button type="submit" className="add-btn" aria-label={t("scenario.form.addAria")}>
        {t("scenario.form.add")}
      </button>
    </form>
  );
}
