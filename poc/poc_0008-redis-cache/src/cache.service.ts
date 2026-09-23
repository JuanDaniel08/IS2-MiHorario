import Redis from 'ioredis';
// @ts-expect-error ioredis-mock does not have full ESM type definitions
import RedisMock from 'ioredis-mock';
import { CockroachDbMock } from './database.mock.js';
import { ScheduleWeek, CacheMetrics } from './types.js';

export class ScheduleCacheService {
  private redis: Redis;
  private db: CockroachDbMock;
  private readonly DEFAULT_TTL_SECONDS = 900; // 15 minutos (ADR-0008)

  // Protección contra Cache Stampede (Single-flight deduplication)
  private inFlightPromises: Map<string, Promise<ScheduleWeek | null>> = new Map();

  private hits = 0;
  private misses = 0;
  private writes = 0;
  private invalidations = 0;

  constructor(db: CockroachDbMock) {
    this.db = db;

    if (process.env.REDIS_URL) {
      console.log(' Conectando a servidor Redis real:', process.env.REDIS_URL);
      this.redis = new Redis(process.env.REDIS_URL);
    } else {
      this.redis = new RedisMock();
    }
  }

  /**
   * Patrón Cache-Aside (Lazy Loading) con protección Single-Flight contra estampida (Thundering Herd)
   */
  async getScheduleWithCacheAside(weekId: string): Promise<{ data: ScheduleWeek | null; source: 'CACHE_HIT' | 'CACHE_MISS' }> {
    const cacheKey = `schedule:${weekId}`;

    // 1. Intentar leer de Redis (RAM)
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      this.hits++;
      return {
        data: JSON.parse(cachedData) as ScheduleWeek,
        source: 'CACHE_HIT'
      };
    }

    // 2. Si hay una petición en vuelo hacia la BD para la misma clave, esperar la misma promesa (Deduplicación)
    if (this.inFlightPromises.has(cacheKey)) {
      this.hits++; // Protegido por la caché / deduplicador
      const sharedData = await this.inFlightPromises.get(cacheKey)!;
      return {
        data: sharedData,
        source: 'CACHE_HIT'
      };
    }

    // 3. Cache Miss: Primera consulta que va a la base de datos
    this.misses++;
    const fetchPromise = (async () => {
      try {
        const dbData = await this.db.querySchedule(weekId);
        if (dbData) {
          await this.redis.set(cacheKey, JSON.stringify(dbData), 'EX', this.DEFAULT_TTL_SECONDS);
          this.writes++;
        }
        return dbData;
      } finally {
        this.inFlightPromises.delete(cacheKey);
      }
    })();

    this.inFlightPromises.set(cacheKey, fetchPromise);
    const result = await fetchPromise;

    return {
      data: result,
      source: 'CACHE_MISS'
    };
  }

  /**
   * Invalidación proactiva orientada a eventos (ADR-0008 Punto 2)
   */
  async invalidateSchedule(weekId: string): Promise<void> {
    const cacheKey = `schedule:${weekId}`;
    await this.redis.del(cacheKey);
    this.inFlightPromises.delete(cacheKey);
    this.invalidations++;
  }

  /**
   * Modificación transaccional con invalidación inmediata (Doble Candado)
   */
  async updateShiftAndInvalidate(
    weekId: string,
    shiftId: string,
    hours: number,
    type: 'ORDINARY' | 'SURCHARGE' | 'OVERTIME' | 'REST'
  ): Promise<ScheduleWeek> {
    // 1. Persistir en CockroachDB
    const updated = await this.db.updateShift(weekId, shiftId, hours, type);

    // 2. Invalidación proactiva en Redis
    await this.invalidateSchedule(weekId);

    return updated;
  }

  async flushCache(): Promise<void> {
    await this.redis.flushall();
    this.inFlightPromises.clear();
    this.resetMetrics();
  }

  getMetrics(): CacheMetrics {
    const total = this.hits + this.misses;
    const hitRatePercent = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      invalidations: this.invalidations,
      hitRatePercent
    };
  }

  resetMetrics() {
    this.hits = 0;
    this.misses = 0;
    this.writes = 0;
    this.invalidations = 0;
    this.inFlightPromises.clear();
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
