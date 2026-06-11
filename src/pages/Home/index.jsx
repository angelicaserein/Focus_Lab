import React from "react";
import TodoApp from "../../components/TodoApp";
import "./Home.module.css";

export default function Home() {
  return (
    <main className="page page-home">
      <TodoApp />
    </main>
  );
}
