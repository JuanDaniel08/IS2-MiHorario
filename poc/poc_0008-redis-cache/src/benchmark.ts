import { CockroachDbMock } from './database.mock.js';
import { ScheduleCacheService } from './cache.service.js';
import { BenchmarkResult } from './types.js';

function calculatePercentiles(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return { avg, min, max, p50, p95, p99 };
}

/**
 * Escenario A: 100 consultas directas a base de datos (Sin Caché)
 */
export async function runDirectDbBenchmark(
  db: CockroachDbMock,
  concurrentUsers = 100
): Promise<BenchmarkResult> {
  db.resetMetrics();
  const latencies: number[] = [];

  const startTime = performance.now();

  const promises = Array.from({ length: concurrentUsers }, async () => {
    const reqStart = performance.now();
    await db.querySchedule('week_42');
    const reqElapsed = performance.now() - reqStart;
    latencies.push(reqElapsed);
  });

  await Promise.all(promises);
  const totalDuration = performance.now() - startTime;

  const stats = calculatePercentiles(latencies);
  const dbMetrics = db.getMetrics();

  return {
    scenarioName: 'Direct Database Read (CockroachDB sin Caché)',
    concurrentUsers,
    totalRequests: concurrentUsers,
    totalDurationMs: totalDuration,
    avgLatencyMs: stats.avg,
    minLatencyMs: stats.min,
    maxLatencyMs: stats.max,
    p95LatencyMs: stats.p95,
    p99LatencyMs: stats.p99,
    dbQueriesExecuted: dbMetrics.totalQueries,
    cacheHitRate: 0
  };
}

/**
 * Escenario B: 100 consultas concurrentes en frío con Cache-Aside y Single-Flight
 */
export async function runColdCacheAsideBenchmark(
  db: CockroachDbMock,
  cacheService: ScheduleCacheService,
  concurrentUsers = 100
): Promise<BenchmarkResult> {
  db.resetMetrics();
  await cacheService.flushCache();

  const latencies: number[] = [];
  const startTime = performance.now();

  const promises = Array.from({ length: concurrentUsers }, async () => {
    const reqStart = performance.now();
    await cacheService.getScheduleWithCacheAside('week_42');
    const reqElapsed = performance.now() - reqStart;
    latencies.push(reqElapsed);
  });

  await Promise.all(promises);
  const totalDuration = performance.now() - startTime;

  const stats = calculatePercentiles(latencies);
  const dbMetrics = db.getMetrics();
  const cacheMetrics = cacheService.getMetrics();

  return {
    scenarioName: 'Cold Cache-Aside con Single-Flight (1 Miss + 99 Hits deduplicados)',
    concurrentUsers,
    totalRequests: concurrentUsers,
    totalDurationMs: totalDuration,
    avgLatencyMs: stats.avg,
    minLatencyMs: stats.min,
    maxLatencyMs: stats.max,
    p95LatencyMs: stats.p95,
    p99LatencyMs: stats.p99,
    dbQueriesExecuted: dbMetrics.totalQueries,
    cacheHitRate: cacheMetrics.hitRatePercent
  };
}

/**
 * Escenario B.2: 100 consultas concurrentes en caliente (Pico de operación con turnos en RAM)
 */
export async function runWarmCacheBenchmark(
  db: CockroachDbMock,
  cacheService: ScheduleCacheService,
  concurrentUsers = 100
): Promise<BenchmarkResult> {
  db.resetMetrics();
  cacheService.resetMetrics();

  // Asegurar que la clave existe en Redis
  await cacheService.getScheduleWithCacheAside('week_42');
  cacheService.resetMetrics();
  db.resetMetrics();

  const latencies: number[] = [];
  const startTime = performance.now();

  const promises = Array.from({ length: concurrentUsers }, async () => {
    const reqStart = performance.now();
    await cacheService.getScheduleWithCacheAside('week_42');
    const reqElapsed = performance.now() - reqStart;
    latencies.push(reqElapsed);
  });

  await Promise.all(promises);
  const totalDuration = performance.now() - startTime;

  const stats = calculatePercentiles(latencies);
  const dbMetrics = db.getMetrics();
  const cacheMetrics = cacheService.getMetrics();

  return {
    scenarioName: 'Warm Redis Cache (100% lectura en RAM)',
    concurrentUsers,
    totalRequests: concurrentUsers,
    totalDurationMs: totalDuration,
    avgLatencyMs: stats.avg,
    minLatencyMs: stats.min,
    maxLatencyMs: stats.max,
    p95LatencyMs: stats.p95,
    p99LatencyMs: stats.p99,
    dbQueriesExecuted: dbMetrics.totalQueries,
    cacheHitRate: cacheMetrics.hitRatePercent
  };
}

/**
 * Escenario C: Prueba de Consistencia con Invalidación Proactiva
 */
export async function runConsistencyTest(
  cacheService: ScheduleCacheService
): Promise<{ passed: boolean; details: string[] }> {
  const logs: string[] = [];
  await cacheService.flushCache();

  // 1. Lectura inicial (Miss)
  const step1 = await cacheService.getScheduleWithCacheAside('week_42');
  logs.push(`Paso 1: Primera lectura -> ${step1.source} (Versión ${step1.data?.version})`);

  // 2. Segunda lectura (Hit)
  const step2 = await cacheService.getScheduleWithCacheAside('week_42');
  logs.push(`Paso 2: Segunda lectura -> ${step2.source} (Leído desde RAM en submilisegundos)`);

  // 3. Supervisor edita un turno
  logs.push('Paso 3: Supervisor aprueba turno extraordinario (12h) en CockroachDB...');
  const shiftToUpdate = step2.data!.shifts[0].id;
  await cacheService.updateShiftAndInvalidate('week_42', shiftToUpdate, 12, 'OVERTIME');
  logs.push('Paso 3.1: Evento emitido -> Clave "schedule:week_42" eliminada de Redis (Invalidación Proactiva)');

  // 4. Siguiente lectura post-invalidación
  const step4 = await cacheService.getScheduleWithCacheAside('week_42');
  const updatedShift = step4.data?.shifts.find((s) => s.id === shiftToUpdate);
  logs.push(`Paso 4: Lectura post-modificación -> ${step4.source} (Dato fresco obtenido: Versión ${step4.data?.version}, Horas: ${updatedShift?.hours}h)`);

  // 5. Lecturas subsecuentes
  const step5 = await cacheService.getScheduleWithCacheAside('week_42');
  logs.push(`Paso 5: Lecturas posteriores -> ${step5.source} (Caché actualizada a versión ${step5.data?.version})`);

  const passed = updatedShift?.hours === 12 && step4.source === 'CACHE_MISS' && step5.source === 'CACHE_HIT';
  return { passed, details: logs };
}
