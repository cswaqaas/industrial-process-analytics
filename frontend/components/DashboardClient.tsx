"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, BarChart3, Download, FileArchive, FileUp, Gauge, RotateCcw, Save, Settings, TableProperties, Trash2 } from "lucide-react";
import { FlowChart } from "@/charts/FlowChart";
import { getAlerts, getAnalytics, getBatches, getCycles, getDashboard, getEvaluations, getMeasurements, getRules, resetImportedData, updateRule, uploadBatchZip, uploadReports } from "@/services/api";
import type { AlertEvent, Batch, BulkUploadResult, Cycle, CycleEvaluation, Measurement, Rule } from "@/types/domain";

type TabId = "overview" | "single" | "bulk" | "batches" | "report" | "analytics" | "alerts" | "rules";

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Gauge size={18} /> },
  { id: "single", label: "Single Cycle", icon: <FileUp size={18} /> },
  { id: "bulk", label: "Bulk Batch", icon: <FileArchive size={18} /> },
  { id: "batches", label: "Batch Reports", icon: <TableProperties size={18} /> },
  { id: "report", label: "Cycle Report", icon: <TableProperties size={18} /> },
  { id: "analytics", label: "Flow Analytics", icon: <BarChart3 size={18} /> },
  { id: "alerts", label: "Alerts", icon: <AlertTriangle size={18} /> },
  { id: "rules", label: "Rules & Settings", icon: <Settings size={18} /> }
];

const emptyDashboard = { total_cycles: 0, cycles_without_alerts: 0, cycles_with_alerts: 0, total_alert_events: 0, recent_cycles: [] as Cycle[] };
const defaultLowFlowRule = {
  name: "Low flow warning",
  parameter: "flow",
  operator: "<",
  threshold: 59.0,
  consecutive_count: 3,
  phase: "ANY_ACTIVE_PHASE",
  severity: "warning",
  enabled: true,
  configuration_json: {}
};

function niceDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function minutes(seconds?: number) {
  return typeof seconds === "number" ? `${(seconds / 60).toFixed(1)} min` : "-";
}

function value(value?: number, suffix = "") {
  return typeof value === "number" ? `${value.toFixed(2)}${suffix}` : "-";
}

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [evaluations, setEvaluations] = useState<CycleEvaluation[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number | null>>({});
  const [batches, setBatches] = useState<Batch[]>([]);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [phase, setPhase] = useState("All");
  const [r1a, setR1a] = useState<File | null>(null);
  const [r1b, setR1b] = useState<File | null>(null);
  const [batchZip, setBatchZip] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const selectedCycle = useMemo(() => cycles.find((cycle) => cycle.id === selectedCycleId) ?? cycles[0], [cycles, selectedCycleId]);

  async function refresh() {
    const [dashboardData, cycleRows, ruleRows, batchRows] = await Promise.all([
      getDashboard().catch(() => emptyDashboard),
      getCycles().catch(() => []),
      getRules().catch(() => []),
      getBatches().catch(() => [])
    ]);
    setDashboard(dashboardData);
    setCycles(cycleRows);
    setRules(ruleRows);
    setBatches(batchRows);
    if (!selectedCycleId && cycleRows[0]) setSelectedCycleId(cycleRows[0].id);
  }

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  useEffect(() => {
    const id = selectedCycle?.id;
    if (!id) return;
    Promise.all([getMeasurements(id, phase), getAnalytics(id), getAlerts(id), getEvaluations(id)]).then(([measurementRows, analyticsData, alertRows, evaluationRows]) => {
      setMeasurements(measurementRows);
      setAnalytics(analyticsData);
      setAlerts(alertRows);
      setEvaluations(evaluationRows);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Could not load cycle data"));
  }, [selectedCycle?.id, phase]);

  async function analyzeReports() {
    if (!r1a || !r1b) return;
    setMessage("Reading PDFs, matching cycle, calculating flow, and applying rules...");
    try {
      const cycle = await uploadReports(r1a, r1b);
      await refresh();
      setSelectedCycleId(cycle.id);
      setActiveTab("report");
      setMessage(`Cycle ${cycle.cycle_no} is ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function analyzeBatch() {
    if (!batchZip) return;
    setMessage("Scanning ZIP, classifying PDFs, pairing A/B reports, and processing valid cycles...");
    try {
      const result = await uploadBatchZip(batchZip);
      setBulkResult(result);
      await refresh();
      setActiveTab("bulk");
      setMessage(`Batch processed: ${result.successful} successful, ${result.failed} need review.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Batch upload failed");
    }
  }

  function downloadCycleXlsx() {
    if (selectedCycle) window.location.href = `http://localhost:8000/api/cycles/${selectedCycle.id}/export.xlsx`;
  }

  function downloadBatchXlsx(batchId: string) {
    window.location.href = `http://localhost:8000/api/batches/${batchId}/export.xlsx`;
  }

  async function saveRule(rule: Rule) {
    setMessage("Saving rule settings...");
    try {
      const saved = await updateRule(rule);
      setRules((current) => current.map((item) => item.id === saved.id ? saved : item));
      setMessage("Rule saved. New uploads will use this setting.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rule save failed");
    }
  }

  async function resetRule(rule: Rule) {
    await saveRule({ ...rule, ...defaultLowFlowRule });
  }

  async function resetDashboardData() {
    const confirmed = window.confirm(
      "This will permanently delete all imported reports, cycles, measurements, evaluations, alerts, and batch records from the dashboard. Rule settings will stay available. Continue?"
    );
    if (!confirmed) return;
    setMessage("Cleaning imported reports, cycles, measurements, evaluations, and alerts...");
    try {
      const result = await resetImportedData();
      setDashboard(emptyDashboard);
      setCycles([]);
      setSelectedCycleId("");
      setMeasurements([]);
      setAlerts([]);
      setEvaluations([]);
      setAnalytics({});
      setBatches([]);
      setBulkResult(null);
      await refresh();
      setMessage(
        `${result.message} Removed ${result.deleted_cycles} cycle(s), ${result.deleted_batches} batch(es), ${result.deleted_measurements} measurement(s), and ${result.deleted_alerts} alert event(s).`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dashboard reset failed");
    }
  }

  const timeline = selectedCycle ? [
    ["Cycle start", selectedCycle.cycle_start],
    ["Steam input", selectedCycle.steam_input],
    ["Sterilization start", selectedCycle.sterilization_start],
    ["Cooling start", selectedCycle.cooling_start],
    ["End of cycle", selectedCycle.cycle_end]
  ] : [];

  if (!mounted) {
    return <main className="dashboard-shell" suppressHydrationWarning><div className="notice">Loading dashboard...</div></main>;
  }

  return (
    <main className="dashboard-shell" suppressHydrationWarning>
      <section className="page-title">
        <div>
          <p className="eyebrow">SURDRY sterilization process analytics</p>
          <h1>Production Cycle Dashboard</h1>
        </div>
        <select className="input cycle-select" value={selectedCycle?.id ?? ""} onChange={(event) => setSelectedCycleId(event.target.value)}>
          {cycles.length === 0 && <option>No cycles imported</option>}
          {cycles.map((cycle) => <option value={cycle.id} key={cycle.id}>Retort {cycle.retort_no} / Cycle {cycle.cycle_no} / {cycle.batch_no}</option>)}
        </select>
      </section>

      <section className="tabbar" aria-label="Dashboard sections">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </section>

      {message && <div className="notice">{message}</div>}

      {activeTab === "overview" && (
        <section className="grid">
          <div className="grid stats">
            <div className="card"><div className="muted">Total cycles imported</div><div className="metric">{dashboard.total_cycles}</div></div>
            <div className="card"><div className="muted">Cycles without alerts</div><div className="metric good">{dashboard.cycles_without_alerts}</div></div>
            <div className="card"><div className="muted">Cycles with alerts</div><div className="metric warn">{dashboard.cycles_with_alerts}</div></div>
            <div className="card"><div className="muted">Total alert events</div><div className="metric danger">{dashboard.total_alert_events}</div></div>
          </div>
          <div>
            <h2>Recent cycles</h2>
            <table className="table">
              <thead><tr><th>Retort</th><th>Cycle</th><th>Product</th><th>Batch</th><th>Operator</th><th>Started</th></tr></thead>
              <tbody>{cycles.map((cycle) => <tr key={cycle.id} onClick={() => { setSelectedCycleId(cycle.id); setActiveTab("report"); }}><td>{cycle.retort_no}</td><td>{cycle.cycle_no}</td><td>{cycle.product}</td><td>{cycle.batch_no}</td><td>{cycle.operator}</td><td>{niceDate(cycle.cycle_start)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "single" && (
        <section className="two-column">
          <div className="grid">
            <h2>Single Cycle</h2>
            <label>Report A, cycle summary PDF<input className="input" type="file" accept="application/pdf" onChange={(event) => setR1a(event.target.files?.[0] ?? null)} /></label>
            <label>Report B, instant data PDF<input className="input" type="file" accept="application/pdf" onChange={(event) => setR1b(event.target.files?.[0] ?? null)} /></label>
            <button className="button row" onClick={analyzeReports} disabled={!r1a || !r1b}><Activity size={18} /> Analyze Cycle</button>
          </div>
          <div className="explain">
            <h2>What the software checks</h2>
            <p>It matches Retort, Cycle Number, and cycle date context before saving the cycle.</p>
            <p>It converts decimal commas such as 58,5 into 58.5 and handles cycles that pass midnight.</p>
            <p>It stores every instant reading with source page and row so report values can be audited later.</p>
          </div>
        </section>
      )}

      {activeTab === "bulk" && (
        <section className="grid">
          <div className="two-column">
            <div className="grid">
              <h2>Bulk Batch</h2>
              <label>Batch ZIP file<input className="input" type="file" accept=".zip,application/zip" onChange={(event) => setBatchZip(event.target.files?.[0] ?? null)} /></label>
              <button className="button row" onClick={analyzeBatch} disabled={!batchZip}><FileArchive size={18} /> Process Batch</button>
            </div>
            <div className="explain">
              <h2>ZIP scanning rules</h2>
              <p>The backend scans folders recursively, classifies PDFs by content, pairs A/B reports by Retort and Cycle Number, and keeps processing valid cycles even if another cycle fails.</p>
            </div>
          </div>
          {bulkResult && (
            <>
              <div className="grid stats">
                <div className="card"><div className="muted">Folders scanned</div><div className="metric">{bulkResult.folders_scanned}</div></div>
                <div className="card"><div className="muted">PDFs found</div><div className="metric">{bulkResult.pdfs_found}</div></div>
                <div className="card"><div className="muted">Valid pairs</div><div className="metric good">{bulkResult.valid_pairs}</div></div>
                <div className="card"><div className="muted">Needs review</div><div className="metric warn">{bulkResult.failed}</div></div>
              </div>
              <div className="row spread"><h2>Batch result</h2><button className="button row" onClick={() => downloadBatchXlsx(bulkResult.batch.id)}><Download size={18} /> Download Batch XLSX</button></div>
              <table className="table">
                <thead><tr><th>Status</th><th>Retort</th><th>Cycle</th><th>Reason</th></tr></thead>
                <tbody>{bulkResult.results.map((row, index) => <tr key={index}><td>{String(row.status ?? "")}</td><td>{String(row.retort ?? "")}</td><td>{String(row.cycle ?? "")}</td><td>{String(row.reason ?? "")}</td></tr>)}</tbody>
              </table>
            </>
          )}
        </section>
      )}

      {activeTab === "batches" && (
        <section className="grid">
          <h2>Batch Reports</h2>
          <table className="table">
            <thead><tr><th>Batch No</th><th>Date</th><th>Cycles</th><th>Successful</th><th>Failed</th><th>Status</th><th>Created At</th><th>Download</th></tr></thead>
            <tbody>{batches.map((batch) => <tr key={batch.id}><td>{batch.batch_no}</td><td>{niceDate(batch.batch_date)}</td><td>{batch.total_cycles}</td><td>{batch.successful_cycles}</td><td>{batch.failed_cycles}</td><td>{batch.status}</td><td>{niceDate(batch.created_at)}</td><td><button className="button secondary" onClick={() => downloadBatchXlsx(batch.id)}>XLSX</button></td></tr>)}</tbody>
          </table>
        </section>
      )}

      {activeTab === "report" && selectedCycle && (
        <section className="grid">
          <div className="summary-band">
            <div><span>Retort</span><strong>{selectedCycle.retort_no}</strong></div>
            <div><span>Cycle</span><strong>{selectedCycle.cycle_no}</strong></div>
            <div><span>Product</span><strong>{selectedCycle.product}</strong></div>
            <div><span>Batch</span><strong>{selectedCycle.batch_no}</strong></div>
            <div><span>Operator</span><strong>{selectedCycle.operator}</strong></div>
          </div>
          <div className="row spread">
            <h2>Section evaluation</h2>
            <button className="button row" onClick={downloadCycleXlsx}><Download size={18} /> Download Cycle XLSX</button>
          </div>
          <div className="section-grid">
            {evaluations.map((evaluation) => <EvaluationCard key={evaluation.id} evaluation={evaluation} />)}
          </div>
          <div className="timeline">{timeline.map(([label, value]) => <div className="card" key={label}><div className="muted">{label}</div><strong>{niceDate(value)}</strong></div>)}</div>
          <section>
            <div className="row spread"><h2>Flow over time</h2><PhaseFilter phase={phase} setPhase={setPhase} /></div>
            <FlowChart measurements={measurements} alerts={alerts} />
          </section>
        </section>
      )}

      {activeTab === "analytics" && (
        <section className="grid">
          <h2>Flow analytics</h2>
          <div className="grid stats">
            {Object.entries(analytics).map(([key, value]) => <div className="card" key={key}><div className="muted">{key.replaceAll("_", " ")}</div><div className="metric">{value ?? "-"}</div></div>)}
          </div>
          <div className="explain">
            <p>Active-process average excludes Stopped phase so parked equipment does not drag the flow average down.</p>
            <p>Heating, Holding, and Cooling averages are calculated separately for phase-level troubleshooting.</p>
          </div>
        </section>
      )}

      {activeTab === "alerts" && (
        <section className="grid">
          <h2>Alert report</h2>
          {alerts.length === 0 && <div className="notice">No alert events for the selected cycle.</div>}
          <table className="table">
            <thead><tr><th>Severity</th><th>Phase</th><th>First violation</th><th>Triggered</th><th>Resolved</th><th>Min</th><th>Average</th><th>Samples</th><th>Status</th></tr></thead>
            <tbody>{alerts.map((alert) => <tr key={alert.id}><td>{alert.severity}</td><td>{alert.phase}</td><td>{niceDate(alert.first_violation_at)}</td><td>{niceDate(alert.triggered_at)}</td><td>{niceDate(alert.resolved_at)}</td><td>{alert.min_value}</td><td>{alert.average_value.toFixed(2)}</td><td>{alert.sample_count}</td><td>{alert.status}</td></tr>)}</tbody>
          </table>
        </section>
      )}

      {activeTab === "rules" && (
        <section className="grid">
          <h2>Rules & settings</h2>
          <div className="explain">
            <p>Rules are evaluated after a PDF pair is analyzed. By default, Stopped phase is excluded from active low-flow alerts.</p>
          </div>
          {rules.map((rule) => <RuleEditor key={rule.id} rule={rule} onChange={(next) => setRules((current) => current.map((item) => item.id === next.id ? next : item))} onSave={saveRule} onReset={resetRule} />)}
          <div className="danger-zone">
            <div>
              <h3>Reset imported dashboard data</h3>
              <p>Use this when you want a clean dashboard before importing a new set of reports. It removes uploaded report records, cycles, measurements, analytics evaluations, alerts, and batch history.</p>
            </div>
            <button className="button danger row" onClick={resetDashboardData}><Trash2 size={18} /> Reset All Imported Data</button>
          </div>
        </section>
      )}
    </main>
  );
}

function PhaseFilter({ phase, setPhase }: { phase: string; setPhase: (phase: string) => void }) {
  return <div className="tabs">{["All", "Heating", "Holding", "Cooling"].map((item) => <button key={item} className={phase === item ? "active" : ""} onClick={() => setPhase(item)}>{item}</button>)}</div>;
}

function RuleEditor({ rule, onChange, onSave, onReset }: { rule: Rule; onChange: (rule: Rule) => void; onSave: (rule: Rule) => void; onReset: (rule: Rule) => void }) {
  return (
    <div className="rule-editor">
      <label>Rule name<input className="input" value={rule.name} onChange={(event) => onChange({ ...rule, name: event.target.value })} /></label>
      <label>Parameter<select className="input" value={rule.parameter} onChange={(event) => onChange({ ...rule, parameter: event.target.value })}><option>flow</option><option>temperature</option><option>pressure</option><option>f_value</option><option>water_level</option></select></label>
      <label>Operator<select className="input" value={rule.operator} onChange={(event) => onChange({ ...rule, operator: event.target.value })}><option>{"<"}</option><option>{"<="}</option><option>{">"}</option><option>{">="}</option><option>{"=="}</option><option>{"!="}</option></select></label>
      <label>Threshold<input className="input" type="number" step="0.1" value={rule.threshold} onChange={(event) => onChange({ ...rule, threshold: Number(event.target.value) })} /></label>
      <label>Consecutive readings<input className="input" type="number" min="1" value={rule.consecutive_count} onChange={(event) => onChange({ ...rule, consecutive_count: Number(event.target.value) })} /></label>
      <label>Phase<select className="input" value={rule.phase} onChange={(event) => onChange({ ...rule, phase: event.target.value })}><option>ANY_ACTIVE_PHASE</option><option>Heating</option><option>Holding</option><option>Cooling</option><option>Stopped</option></select></label>
      <label>Severity<select className="input" value={rule.severity} onChange={(event) => onChange({ ...rule, severity: event.target.value })}><option>warning</option><option>critical</option><option>info</option></select></label>
      <label className="toggle"><input type="checkbox" checked={rule.enabled} onChange={(event) => onChange({ ...rule, enabled: event.target.checked })} /> Enabled</label>
      <div className="rule-actions">
        <button className="button row" onClick={() => onSave(rule)}><Save size={18} /> Save Rule</button>
        <button className="button secondary row" onClick={() => onReset(rule)}><RotateCcw size={18} /> Reset</button>
      </div>
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: CycleEvaluation }) {
  const label = evaluation.section.replaceAll("_", " ");
  return (
    <div className={`evaluation-card ${evaluation.status === "NOT OK" ? "not-ok" : "ok"}`}>
      <div className="row spread">
        <h3>{label}</h3>
        <strong>{evaluation.status}</strong>
      </div>
      <dl>
        <div><dt>Start</dt><dd>{niceDate(evaluation.start_time)}</dd></div>
        <div><dt>End</dt><dd>{niceDate(evaluation.end_time)}</dd></div>
        <div><dt>Duration</dt><dd>{minutes(evaluation.duration_seconds)}</dd></div>
        <div><dt>Min</dt><dd>{value(evaluation.minimum_flow, " L/s")}</dd></div>
        <div><dt>Max</dt><dd>{value(evaluation.maximum_flow, " L/s")}</dd></div>
        <div><dt>Median</dt><dd>{value(evaluation.median_flow, " L/s")}</dd></div>
        <div><dt>Average</dt><dd>{value(evaluation.average_flow, " L/s")}</dd></div>
        <div><dt>Readings</dt><dd>{evaluation.reading_count}</dd></div>
      </dl>
      <p>{evaluation.comment}</p>
    </div>
  );
}
