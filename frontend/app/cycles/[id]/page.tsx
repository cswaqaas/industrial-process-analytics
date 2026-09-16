import { FlowChart } from "@/charts/FlowChart";
import { getAlerts, getAnalytics, getCycle, getMeasurements } from "@/services/api";

export default async function CycleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cycle, measurements, analytics, alerts] = await Promise.all([getCycle(id), getMeasurements(id), getAnalytics(id), getAlerts(id)]);
  const timeline = [
    ["Cycle start", cycle.cycle_start],
    ["Steam input", cycle.steam_input],
    ["Sterilization", cycle.sterilization_start],
    ["Cooling", cycle.cooling_start],
    ["End", cycle.cycle_end]
  ];
  return (
    <main className="grid">
      <section className="row">
        <h1>Retort {cycle.retort_no} / Cycle {cycle.cycle_no}</h1>
        <span className="muted">{cycle.product} / {cycle.batch_no} / {cycle.operator}</span>
      </section>
      <section className="timeline">
        {timeline.map(([label, value]) => <div className="card" key={label}><div className="muted">{label}</div><strong>{value ? new Date(value).toLocaleString() : "-"}</strong></div>)}
      </section>
      <section><FlowChart measurements={measurements} alerts={alerts} /></section>
      <section className="grid stats">
        {Object.entries(analytics).map(([key, value]) => <div className="card" key={key}><div className="muted">{key.replaceAll("_", " ")}</div><div className="metric">{value ?? "-"}</div></div>)}
      </section>
      <section className="grid">
        <h2>Alerts</h2>
        {alerts.map((alert) => <div className="card alert" key={alert.id}><strong>{alert.severity} / {alert.status}</strong><div>{new Date(alert.triggered_at).toLocaleString()} / min {alert.min_value} / avg {alert.average_value.toFixed(2)} / samples {alert.sample_count}</div></div>)}
      </section>
    </main>
  );
}
