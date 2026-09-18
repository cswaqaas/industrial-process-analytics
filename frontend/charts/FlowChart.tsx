"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { AlertEvent, Measurement } from "@/types/domain";

const FLOW_LIMIT = 59;
const PHASE_COLORS: Record<string, string> = {
  Heating: "#2563eb",
  Holding: "#7c3aed",
  Cooling: "#0f766e",
  Stopped: "#64748b"
};

type ChartPoint = {
  timeLabel: string;
  timestamp: number;
  flow: number | null;
  temperature?: number;
  pressure?: number;
  phase?: string;
  alertFlow?: number | null;
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatFullTime(timestamp: number) {
  return new Date(timestamp).toLocaleString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", month: "short", day: "numeric" });
}

function numberOrDash(value?: number | null, digits = 1) {
  return typeof value === "number" ? value.toFixed(digits) : "-";
}

function summarize(points: ChartPoint[]) {
  const flows = points.map((point) => point.flow).filter((value): value is number => typeof value === "number");
  const low = flows.filter((value) => value < FLOW_LIMIT).length;
  return {
    average: flows.length ? flows.reduce((sum, value) => sum + value, 0) / flows.length : null,
    minimum: flows.length ? Math.min(...flows) : null,
    maximum: flows.length ? Math.max(...flows) : null,
    lowPercent: flows.length ? Math.round((low / flows.length) * 100) : 0
  };
}

function phaseSegments(points: ChartPoint[]) {
  const segments: { phase: string; start: number; end: number }[] = [];
  for (const point of points) {
    const phase = point.phase ?? "Unknown";
    const current = segments[segments.length - 1];
    if (!current || current.phase !== phase) {
      segments.push({ phase, start: point.timestamp, end: point.timestamp });
    } else {
      current.end = point.timestamp;
    }
  }
  return segments.filter((segment) => segment.end > segment.start);
}

export function FlowChart({ measurements, alerts }: { measurements: Measurement[]; alerts: AlertEvent[] }) {
  const alertTimes = new Set(alerts.map((alert) => new Date(alert.triggered_at).getTime()));
  const points: ChartPoint[] = measurements
    .filter((m) => typeof m.flow === "number")
    .map((m) => {
      const timestamp = new Date(m.recorded_at).getTime();
      return {
        timeLabel: formatTime(timestamp),
        timestamp,
        flow: m.flow ?? null,
        temperature: m.temperature,
        pressure: m.pressure,
        phase: m.phase,
        alertFlow: alertTimes.has(timestamp) ? m.flow ?? null : null
      };
    });

  const stats = summarize(points);
  const segments = phaseSegments(points);
  const alertMarkers = points.filter((point) => typeof point.alertFlow === "number");

  if (points.length === 0) {
    return <div className="chart-empty">No flow readings available for this selection.</div>;
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Flow Trend</h3>
          <p>Green is acceptable flow. Red markers show the exact readings that triggered alert events.</p>
        </div>
        <div className="chart-legend">
          <span><i className="legend-line safe" /> Flow</span>
          <span><i className="legend-line limit" /> 59 L/s limit</span>
          <span><i className="legend-dot alert-dot" /> Alert trigger</span>
        </div>
      </div>

      <div className="chart-kpis">
        <div><span>Average flow</span><strong>{numberOrDash(stats.average)} L/s</strong></div>
        <div><span>Lowest flow</span><strong>{numberOrDash(stats.minimum)} L/s</strong></div>
        <div><span>Highest flow</span><strong>{numberOrDash(stats.maximum)} L/s</strong></div>
        <div><span>Below limit</span><strong>{stats.lowPercent}%</strong></div>
      </div>

      <ResponsiveContainer width="100%" height={390}>
        <ComposedChart data={points} margin={{ top: 18, right: 28, left: 8, bottom: 24 }}>
          <defs>
            <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dce3ee" strokeDasharray="3 3" vertical={false} />
          {segments.map((segment) => (
            <ReferenceArea
              key={`${segment.phase}-${segment.start}`}
              x1={segment.start}
              x2={segment.end}
              fill={PHASE_COLORS[segment.phase] ?? "#94a3b8"}
              fillOpacity={0.055}
              strokeOpacity={0}
            />
          ))}
          <ReferenceArea y1={0} y2={FLOW_LIMIT} fill="#fee2e2" fillOpacity={0.55} strokeOpacity={0} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTime}
            tick={{ fontSize: 12, fill: "#475569" }}
            minTickGap={48}
          />
          <YAxis
            dataKey="flow"
            domain={[52, "dataMax + 2"]}
            tick={{ fontSize: 12, fill: "#475569" }}
            label={{ value: "Flow L/s", angle: -90, position: "insideLeft", fill: "#475569" }}
          />
          <Tooltip content={<FlowTooltip />} />
          <ReferenceLine
            y={FLOW_LIMIT}
            stroke="#b42318"
            strokeWidth={2}
            strokeDasharray="6 5"
            label={{ value: "Minimum allowed flow: 59 L/s", position: "insideTopRight", fill: "#b42318", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="flow" fill="url(#flowFill)" stroke="none" isAnimationActive={false} />
          <Line type="monotone" dataKey="flow" stroke="#0f766e" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} isAnimationActive={false} />
          <Scatter data={alertMarkers} dataKey="alertFlow" fill="#b42318" shape="circle" />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="phase-strip">
        {Object.entries(PHASE_COLORS).map(([phase, color]) => <span key={phase}><i style={{ background: color }} /> {phase}</span>)}
      </div>
    </div>
  );
}

function FlowTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{formatFullTime(point.timestamp)}</strong>
      <span>Flow: {numberOrDash(point.flow)} L/s</span>
      <span>Temperature: {numberOrDash(point.temperature)} C</span>
      <span>Pressure: {numberOrDash(point.pressure, 0)} mbar</span>
      <span>Phase: {point.phase ?? "-"}</span>
      {typeof point.flow === "number" && point.flow < FLOW_LIMIT && <em>Below 59 L/s limit</em>}
    </div>
  );
}
