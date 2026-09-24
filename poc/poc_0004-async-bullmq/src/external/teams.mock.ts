export class MicrosoftTeamsMock {
  private failedAttemptsRemaining = 0;
  private callCount = 0;

  setSimulatedFailures(failuresCount: number) {
    this.failedAttemptsRemaining = failuresCount;
  }

  async sendChannelNotification(message: string): Promise<{ success: boolean; latencyMs: number; status: number }> {
    this.callCount++;
    const start = performance.now();

    // Latencia de red HTTPS hacia Microsoft Teams (200 - 300 ms)
    const delay = 220 + Math.floor(Math.random() * 80);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const latencyMs = performance.now() - start;

    if (this.failedAttemptsRemaining > 0) {
      this.failedAttemptsRemaining--;
      throw new Error(`[Teams API Error 503]: Service Unavailable. Intentos de fallo restantes: ${this.failedAttemptsRemaining}`);
    }

    return {
      success: true,
      latencyMs,
      status: 200
    };
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset() {
    this.callCount = 0;
    this.failedAttemptsRemaining = 0;
  }
}
