export type ShiftType = 'ORDINARY' | 'SURCHARGE' | 'OVERTIME' | 'REST';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  day: number;
  dateStr: string;
  hours: number;
  type: ShiftType;
  location: string;
}

export interface ScheduleWeek {
  weekId: string;
  department: string;
  year: number;
  totalEmployees: number;
  shifts: Shift[];
  version: number;
  updatedAt: string;
}

export interface DatabaseMetrics {
  totalQueries: number;
  totalTimeMs: number;
  activeConnections: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  writes: number;
  invalidations: number;
  hitRatePercent: number;
}

export interface BenchmarkResult {
  scenarioName: string;
  concurrentUsers: number;
  totalRequests: number;
  totalDurationMs: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  dbQueriesExecuted: number;
  cacheHitRate: number;
}
