import { MicrosoftTeamsMock } from './external/teams.mock.js';
import { FirebaseMessagingMock } from './external/fcm.mock.js';
import { SchedulePublishPayload, ExecutionResult, JobOptions } from './types.js';

interface QueuedJob {
  id: string;
  payload: SchedulePublishPayload;
  deviceTokens: string[];
  options: JobOptions;
  currentAttempt: number;
}

export class BullMqQueueService {
  private teams: MicrosoftTeamsMock;
  private fcm: FirebaseMessagingMock;

  // Cola en memoria que emula con precisión el comportamiento de BullMQ sobre Redis
  private queue: QueuedJob[] = [];
  private isWorkerBusy = false;

  public onJobCompleted?: (jobId: string, durationMs: number) => void;
  public onJobRetry?: (jobId: string, attempt: number, error: string) => void;
  public onJobFailed?: (jobId: string, error: string) => void;

  constructor(teams: MicrosoftTeamsMock, fcm: FirebaseMessagingMock) {
    this.teams = teams;
    this.fcm = fcm;
  }

  /**
   * Controlador HTTP: Encola la tarea en Redis y responde de inmediato con HTTP 202 Accepted
   */
  async handlePublishScheduleRequest(
    payload: SchedulePublishPayload,
    deviceTokens: string[],
    options: JobOptions = { attempts: 3, backoffDelayMs: 150 }
  ): Promise<{ status: number; httpLatencyMs: number; jobId: string }> {
    const startHttp = performance.now();

    // 1. Guardar en base de datos (~80ms)
    await new Promise((resolve) => setTimeout(resolve, 80));

    // 2. Encolar el evento en Redis (operación en memoria ultrarrápida: ~4ms)
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const job: QueuedJob = {
      id: jobId,
      payload,
      deviceTokens,
      options,
      currentAttempt: 1
    };

    this.queue.push(job);
    const httpLatencyMs = performance.now() - startHttp;

    // Disparar worker en background de forma desacoplada
    setTimeout(() => this.processNextJob(), 0);

    return {
      status: 202, // 202 Accepted
      httpLatencyMs,
      jobId
    };
  }

  /**
   * Worker en segundo plano (emula BullMQ Worker con concurrencia y reintentos)
   */
  private async processNextJob(): Promise<void> {
    if (this.isWorkerBusy || this.queue.length === 0) return;
    this.isWorkerBusy = true;

    const job = this.queue.shift()!;
    const workerStart = performance.now();

    let jobCompleted = false;

    while (job.currentAttempt <= job.options.attempts && !jobCompleted) {
      try {
        // Tarea A: Despacho a Microsoft Teams con reintentos
        await this.teams.sendChannelNotification(
          `[BullMQ Worker] Malla de turnos ${job.payload.weekId} publicada por ${job.payload.supervisorName}`
        );

        // Tarea B: Despacho masivo a Firebase FCM en lotes
        await this.fcm.sendPushBatchOptimized(
          job.deviceTokens,
          'Nuevo Horario Publicado',
          `Revisa tus turnos de la semana ${job.payload.weekId}`
        );

        jobCompleted = true;
        const workerElapsed = performance.now() - workerStart;
        if (this.onJobCompleted) this.onJobCompleted(job.id, workerElapsed);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (this.onJobRetry) this.onJobRetry(job.id, job.currentAttempt, errorMsg);

        if (job.currentAttempt < job.options.attempts) {
          // Retroceso exponencial (Exponential Backoff de BullMQ)
          const backoff = job.options.backoffDelayMs * Math.pow(2, job.currentAttempt - 1);
          job.currentAttempt++;
          await new Promise((resolve) => setTimeout(resolve, backoff));
        } else {
          // Excedió reintentos: Enviar a Dead Letter Queue (DLQ)
          if (this.onJobFailed) this.onJobFailed(job.id, errorMsg);
          break;
        }
      }
    }

    this.isWorkerBusy = false;
    if (this.queue.length > 0) {
      setTimeout(() => this.processNextJob(), 0);
    }
  }

  /**
   * Helper para esperar a que la cola termine de procesar en background (usado en benchmarks)
   */
  async waitForQueueIdle(): Promise<void> {
    while (this.isWorkerBusy || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}
