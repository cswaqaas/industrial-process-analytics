import type { AlertEvent, Batch, BulkUploadResult, Cycle, CycleEvaluation, Measurement, ResetDataResult, Rule } from "@/types/domain";

const API_BASE = typeof window === "undefined"
  ? process.env.API_INTERNAL_BASE ?? "http://backend:8000"
  : process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || response.statusText);
  }
  return response.json() as Promise<T>;
}

export function getDashboard() {
  return request<{ total_cycles: number; cycles_without_alerts: number; cycles_with_alerts: number; total_alert_events: number; recent_cycles: Cycle[] }>("/api/dashboard");
}

export function getCycles() {
  return request<Cycle[]>("/api/cycles");
}

export function getCycle(id: string) {
  return request<Cycle>(`/api/cycles/${id}`);
}

export function getMeasurements(id: string, phase = "All") {
  return request<Measurement[]>(`/api/cycles/${id}/measurements?phase=${phase}`);
}

export function getAnalytics(id: string) {
  return request<Record<string, number | null>>(`/api/cycles/${id}/analytics`);
}

export function getEvaluations(id: string) {
  return request<CycleEvaluation[]>(`/api/cycles/${id}/evaluations`);
}

export function getAlerts(id: string) {
  return request<AlertEvent[]>(`/api/cycles/${id}/alerts`);
}

export function getRules() {
  return request<Rule[]>("/api/rules");
}

export function getBatches() {
  return request<Batch[]>("/api/batches");
}

export async function uploadBatchZip(batchZip: File) {
  const data = new FormData();
  data.append("batch_zip", batchZip);
  return request<BulkUploadResult>("/api/batches/upload", { method: "POST", body: data });
}

export function updateRule(rule: Rule) {
  return request<Rule>(`/api/rules/${rule.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: rule.name,
      parameter: rule.parameter,
      operator: rule.operator,
      threshold: Number(rule.threshold),
      consecutive_count: Number(rule.consecutive_count),
      phase: rule.phase,
      severity: rule.severity,
      enabled: rule.enabled,
      configuration_json: rule.configuration_json ?? {}
    })
  });
}

export async function uploadReports(r1a: File, r1b: File) {
  const data = new FormData();
  data.append("r1a", r1a);
  data.append("r1b", r1b);
  return request<Cycle>("/api/uploads/analyze", { method: "POST", body: data });
}

export function resetImportedData() {
  return request<ResetDataResult>("/api/settings/reset-imported-data", { method: "POST" });
}
