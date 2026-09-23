import { ScheduleWeek, Shift, ShiftType, DatabaseMetrics } from './types.js';

export class CockroachDbMock {
  private schedules: Map<string, ScheduleWeek> = new Map();
  private queryCount = 0;
  private totalQueryTimeMs = 0;
  private activeConnections = 0;
  private readonly MAX_POOL_SIZE = 20;

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const shifts: Shift[] = [];
    const roles = ['Operador Atracciones', 'Auxiliar Taquilla', 'Logística Parque', 'Mantenimiento'];

    for (let emp = 1; emp <= 50; emp++) {
      const empId = `EMP-${1000 + emp}`;
      const empName = `Colaborador Comfama ${emp}`;
      const role = roles[emp % roles.length];

      for (let day = 1; day <= 30; day++) {
        let type: ShiftType = 'ORDINARY';
        let hours = 8;
        if (day % 7 === 0) {
          type = 'REST';
          hours = 0;
        } else if (day % 5 === 0) {
          type = 'SURCHARGE';
        } else if (day === 15) {
          type = 'OVERTIME';
          hours = 12;
        }

        shifts.push({
          id: `SHIFT-${empId}-D${day}`,
          employeeId: empId,
          employeeName: empName,
          role,
          day,
          dateStr: `2026-10-${day.toString().padStart(2, '0')}`,
          hours,
          type,
          location: 'Parque Rionegro'
        });
      }
    }

    this.schedules.set('week_42', {
      weekId: 'week_42',
      department: 'Operaciones Parque',
      year: 2026,
      totalEmployees: 50,
      shifts,
      version: 1,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Simula una consulta SELECT en CockroachDB
   * Incluye latencia realista de I/O en disco (80-120ms) y cola por pool de conexiones
   */
  async querySchedule(weekId: string): Promise<ScheduleWeek | null> {
    this.queryCount++;
    this.activeConnections++;

    // Simulación de encolamiento si supera el pool de conexiones
    let poolContentionDelay = 0;
    if (this.activeConnections > this.MAX_POOL_SIZE) {
      poolContentionDelay = (this.activeConnections - this.MAX_POOL_SIZE) * 8;
    }

    // Latencia normal de red distribuida + ejecución SQL en CockroachDB (85ms a 115ms)
    const baseLatency = 85 + Math.floor(Math.random() * 30);
    const totalDelay = baseLatency + poolContentionDelay;

    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, totalDelay));
    const elapsed = performance.now() - start;

    this.totalQueryTimeMs += elapsed;
    this.activeConnections--;

    const schedule = this.schedules.get(weekId);
    if (!schedule) return null;

    // Retorna copia clonada para simular deserialización
    return JSON.parse(JSON.stringify(schedule));
  }

  /**
   * Simula un UPDATE transaccional en CockroachDB
   */
  async updateShift(weekId: string, shiftId: string, updatedHours: number, updatedType: ShiftType): Promise<ScheduleWeek> {
    this.queryCount++;
    // Latencia de commit distribuido (two-phase commit en CockroachDB: ~120-160ms)
    await new Promise((resolve) => setTimeout(resolve, 140));

    const schedule = this.schedules.get(weekId);
    if (!schedule) throw new Error(`Semana ${weekId} no encontrada`);

    const shift = schedule.shifts.find((s) => s.id === shiftId);
    if (shift) {
      shift.hours = updatedHours;
      shift.type = updatedType;
    }

    schedule.version++;
    schedule.updatedAt = new Date().toISOString();
    return JSON.parse(JSON.stringify(schedule));
  }

  getMetrics(): DatabaseMetrics {
    return {
      totalQueries: this.queryCount,
      totalTimeMs: this.totalQueryTimeMs,
      activeConnections: this.activeConnections
    };
  }

  resetMetrics() {
    this.queryCount = 0;
    this.totalQueryTimeMs = 0;
    this.activeConnections = 0;
  }
}
