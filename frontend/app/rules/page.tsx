"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  useEffect(() => { fetch(`${API_BASE}/api/rules`).then((r) => r.json()).then(setRules).catch(() => setRules([])); }, []);
  return (
    <main className="grid">
      <h1>Rules Settings</h1>
      <table className="table">
        <thead><tr><th>Name</th><th>Parameter</th><th>Operator</th><th>Threshold</th><th>Consecutive</th><th>Phase</th><th>Enabled</th></tr></thead>
        <tbody>{rules.map((rule) => <tr key={rule.id}><td>{rule.name}</td><td>{rule.parameter}</td><td>{rule.operator}</td><td>{rule.threshold}</td><td>{rule.consecutive_count}</td><td>{rule.phase}</td><td>{String(rule.enabled)}</td></tr>)}</tbody>
      </table>
    </main>
  );
}
