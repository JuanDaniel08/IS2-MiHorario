import { MicrosoftTeamsMock } from './external/teams.mock.js';
import { FirebaseMessagingMock } from './external/fcm.mock.js';
import { SynchronousPublisher } from './sync-publisher.js';
import { BullMqQueueService } from './async-queue.service.js';
import { SchedulePublishPayload, ExecutionResult } from './types.js';

export async function runBenchmarks(): Promise<{
  syncResult: ExecutionResult;
  asyncResult: ExecutionResult;
  resilienceTest: { syncFailed: boolean; asyncRecovered: boolean; retryLogs: string[] };
}> {
  const teams = new MicrosoftTeamsMock();
  const fcm = new FirebaseMessagingMock();

  const syncPublisher = new SynchronousPublisher(teams, fcm);
  const bullMqService = new BullMqQueueService(teams, fcm);

  // Generar tokens ficticios para 50 colaboradores
  const deviceTokens = Array.from({ length: 50 }, (_, i) => `fcm_token_device_${1001 + i}`);

  const payload: SchedulePublishPayload = {
    weekId: 'week_42',
    department: 'Operaciones Parque Rionegro',
    supervisorName: 'Daniel Rodríguez',
    employeeCount: 50,
    totalShifts: 1500,
    timestamp: new Date().toISOString()
  };

  // -------------------------------------------------------------
  // Test 1: Publicación Síncrona Tradicional
  // -------------------------------------------------------------
  teams.reset();
  fcm.reset();
  const syncResult = await syncPublisher.publishScheduleSync(payload, deviceTokens);

  // -------------------------------------------------------------
  // Test 2: Publicación Asíncrona con BullMQ (Sin fallos)
  // -------------------------------------------------------------
  teams.reset();
  fcm.reset();

  let asyncBackgroundDuration = 0;
  bullMqService.onJobCompleted = (_jobId, durationMs) => {
    asyncBackgroundDuration = durationMs;
  };

  const asyncHttpStart = performance.now();
  const httpResponse = await bullMqService.handlePublishScheduleRequest(payload, deviceTokens);
  const asyncHttpLatency = performance.now() - asyncHttpStart;

  // Esperar a que el worker termine en segundo plano para registrar el tiempo total
  await bullMqService.waitForQueueIdle();

  const asyncResult: ExecutionResult = {
    mode: 'ASYNC_BULLMQ',
    httpResponseStatus: httpResponse.status,
    httpLatencyMs: httpResponse.httpLatencyMs,
    teamsDelivered: true,
    fcmAlertsSent: fcm.getTotalDispatched(),
    backgroundProcessingTimeMs: asyncBackgroundDuration,
    totalEndToEndTimeMs: asyncHttpLatency + asyncBackgroundDuration,
    error: null
  };

  // -------------------------------------------------------------
  // Test 3: Prueba de Resiliencia (Microsoft Teams falla 2 veces)
  // -------------------------------------------------------------
  const retryLogs: string[] = [];

  // 3.1 Probar enfoque síncrono con Teams caído
  teams.reset();
  fcm.reset();
  teams.setSimulatedFailures(2); // 2 fallos iniciales
  const syncFailureTest = await syncPublisher.publishScheduleSync(payload, deviceTokens);

  // 3.2 Probar enfoque asíncrono BullMQ con Teams caído
  teams.reset();
  fcm.reset();
  teams.setSimulatedFailures(2); // Mismos 2 fallos

  bullMqService.onJobRetry = (_jobId, attempt, error) => {
    retryLogs.push(`[BullMQ Reintento #${attempt}]: ${error} -> Aplicando backoff exponencial...`);
  };

  bullMqService.onJobCompleted = (_jobId, durationMs) => {
    retryLogs.push(`[BullMQ Completado]: Entregado con éxito tras reintentos en ${durationMs.toFixed(1)} ms.`);
  };

  const asyncResilienceHttp = await bullMqService.handlePublishScheduleRequest(payload, deviceTokens, {
    attempts: 4,
    backoffDelayMs: 100
  });

  await bullMqService.waitForQueueIdle();

  return {
    syncResult,
    asyncResult,
    resilienceTest: {
      syncFailed: syncFailureTest.httpResponseStatus === 500,
      asyncRecovered: asyncResilienceHttp.status === 202 && teams.getCallCount() === 3,
      retryLogs
    }
  };
}
