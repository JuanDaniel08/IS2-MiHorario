import { MicrosoftTeamsMock } from './external/teams.mock.js';
import { FirebaseMessagingMock } from './external/fcm.mock.js';
import { SchedulePublishPayload, ExecutionResult } from './types.js';

export class SynchronousPublisher {
  private teams: MicrosoftTeamsMock;
  private fcm: FirebaseMessagingMock;

  constructor(teams: MicrosoftTeamsMock, fcm: FirebaseMessagingMock) {
    this.teams = teams;
    this.fcm = fcm;
  }

  /**
   * Simula un endpoint REST síncrono donde todo se ejecuta en el mismo hilo de la petición HTTP
   */
  async publishScheduleSync(payload: SchedulePublishPayload, deviceTokens: string[]): Promise<ExecutionResult> {
    const startHttp = performance.now();

    try {
      // 1. Guardar en base de datos (~80ms)
      await new Promise((resolve) => setTimeout(resolve, 80));

      // 2. Notificar síncronamente al canal de Microsoft Teams (bloquea el hilo ~250ms)
      await this.teams.sendChannelNotification(`Nueva malla publicada por ${payload.supervisorName} para ${payload.department}`);

      // 3. Despachar notificaciones push a 50 colaboradores secuencialmente (bloquea el hilo ~2.000ms)
      const pushResult = await this.fcm.sendPushBatchSequential(
        deviceTokens,
        'Nuevo Horario Publicado',
        `Revisa tus turnos de la semana ${payload.weekId}`
      );

      const httpElapsed = performance.now() - startHttp;

      return {
        mode: 'SYNCHRONOUS',
        httpResponseStatus: 200,
        httpLatencyMs: httpElapsed,
        teamsDelivered: true,
        fcmAlertsSent: pushResult.sent,
        backgroundProcessingTimeMs: 0,
        totalEndToEndTimeMs: httpElapsed,
        error: null
      };
    } catch (err: unknown) {
      const httpElapsed = performance.now() - startHttp;
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        mode: 'SYNCHRONOUS',
        httpResponseStatus: 500, // Error al supervisor
        httpLatencyMs: httpElapsed,
        teamsDelivered: false,
        fcmAlertsSent: 0,
        backgroundProcessingTimeMs: 0,
        totalEndToEndTimeMs: httpElapsed,
        error: errorMessage
      };
    }
  }
}
