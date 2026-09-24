export class FirebaseMessagingMock {
  private totalDispatched = 0;

  /**
   * Envío síncrono inline (uno a uno o en bucle interactivo)
   */
  async sendPushBatchSequential(deviceTokens: string[], title: string, body: string): Promise<{ sent: number; durationMs: number }> {
    const start = performance.now();

    // Simula 40ms por dispositivo (50 dispositivos * 40ms = ~2.000 ms bloqueados)
    for (const token of deviceTokens) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      this.totalDispatched++;
    }

    const durationMs = performance.now() - start;
    return { sent: deviceTokens.length, durationMs };
  }

  /**
   * Envío en segundo plano optimizado en lotes (Batching multihilo)
   */
  async sendPushBatchOptimized(deviceTokens: string[], title: string, body: string): Promise<{ sent: number; durationMs: number }> {
    const start = performance.now();

    // Divide en lotes de 20 dispositivos concurrentes en segundo plano
    const BATCH_SIZE = 20;
    for (let i = 0; i < deviceTokens.length; i += BATCH_SIZE) {
      await new Promise((resolve) => setTimeout(resolve, 60)); // latencia de lote
      this.totalDispatched += Math.min(BATCH_SIZE, deviceTokens.length - i);
    }

    const durationMs = performance.now() - start;
    return { sent: deviceTokens.length, durationMs };
  }

  getTotalDispatched(): number {
    return this.totalDispatched;
  }

  reset() {
    this.totalDispatched = 0;
  }
}
