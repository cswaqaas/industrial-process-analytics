export type Cycle = {
  id: string;
  retort_no: number;
  cycle_no: number;
  cycle_date: string;
  product?: string;
  recipe_no?: number;
  batch_no?: string;
  operator?: string;
  containers?: number;
  cycle_start?: string;
  steam_input?: string;
  sterilization_start?: string;
  cooling_start?: string;
  cycle_end?: string;
};

export type Measurement = {
  id: string;
  recorded_at: string;
  temperature?: number;
  product_temperature?: number;
  pressure?: number;
  f_value?: number;
  flow?: number;
  water_level?: number;
  phase?: string;
  machine_state?: string;
};

export type AlertEvent = {
  id: string;
  triggered_at: string;
  first_violation_at: string;
  resolved_at?: string;
  phase?: string;
  min_value: number;
  average_value: number;
  sample_count: number;
  severity: string;
  status: string;
};

export type Rule = {
  id: string;
  name: string;
  parameter: string;
  operator: string;
  threshold: number;
  consecutive_count: number;
  phase: string;
  severity: string;
  enabled: boolean;
  configuration_json?: Record<string, unknown>;
};

export type CycleEvaluation = {
  id: string;
  cycle_id: string;
  section: string;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  minimum_flow?: number;
  maximum_flow?: number;
  median_flow?: number;
  average_flow?: number;
  min_from_r1b_report?: number;
  reading_count: number;
  comment?: string;
  status: string;
  first_violation_at?: string;
  triggered_at?: string;
};

export type Batch = {
  id: string;
  batch_no?: string;
  batch_date?: string;
  production_start?: string;
  production_end?: string;
  source_name?: string;
  source_folder?: string;
  status?: string;
  total_cycles: number;
  successful_cycles: number;
  failed_cycles: number;
  created_at: string;
};

export type BulkUploadResult = {
  batch: Batch;
  folders_scanned: number;
  pdfs_found: number;
  a_reports: number;
  b_reports: number;
  valid_pairs: number;
  missing_a: number;
  missing_b: number;
  pairing_errors: number;
  successful: number;
  failed: number;
  results: Array<Record<string, unknown>>;
};

export type ResetDataResult = {
  deleted_cycles: number;
  deleted_batches: number;
  deleted_measurements: number;
  deleted_alerts: number;
  deleted_evaluations: number;
  deleted_cycle_files: number;
  deleted_parse_warnings: number;
  message: string;
};
