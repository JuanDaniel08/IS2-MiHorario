export interface SchedulePublishPayload {
  weekId: string;
  department: string;
  supervisorName: string;
  employeeCount: number;
  totalShifts: number;
  timestamp: string;
}

export interface JobOptions {
  attempts: number;
  backoffDelayMs: number;
}

export interface ExecutionResult {
  mode: 'SYNCHRONOUS' | 'ASYNC_BULLMQ';
  httpResponseStatus: number;
  httpLatencyMs: number;
  teamsDelivered: boolean;
  fcmAlertsSent: number;
  backgroundProcessingTimeMs: number;
  totalEndToEndTimeMs: number;
  error: string | null;
}
