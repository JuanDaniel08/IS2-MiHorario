export type ShiftType = 'ORDINARY' | 'SURCHARGE' | 'OVERTIME' | 'REST';

export interface Shift {
  id: string;
  employeeId: string;
  day: number;
  dateStr: string;
  startTime: string;
  endTime: string;
  type: ShiftType;
  hours: number;
  label: string;
  location: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  role: string;
  department: string;
  avatarColor: string;
  shifts: Record<number, Shift>;
}

export interface PerformanceMetrics {
  renderTimeMs: number;
  fps: number;
  activeDomNodes: number;
  mode: 'traditional' | 'virtualized';
  employeeCount: number;
  totalShifts: number;
}
