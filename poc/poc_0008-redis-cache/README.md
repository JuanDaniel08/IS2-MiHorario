# PoC-0008: Validación Empírica del Patrón Cache-Aside con Redis para Consultas Concurrentes de Mallas Horarias

* **Proyecto:** MiHorario Comfama
* **Asignatura:** Software 2 (Semestre 2-2026)
* **ADR Asociado:** [ADR-0008: Estrategia de Caché en Memoria con Redis para Optimización de Consultas de Turnos y Catálogo de Parámetros](../../doc/adr/adr-0008.md)
* **Enfoque Metodológico:** HDD (*Hypothesis-Driven Design* / Diseño Guiado por Hipótesis)
* **Decidentes:** Angie - Daniel
* **Fecha:** Septiembre 2026

---

## 1. Contexto y Problema Arquitectónico

En la operación de **MiHorario**, el acceso a la agenda horaria presenta un comportamiento de lectura intensiva (*read-heavy*). En momentos clave —como la publicación de una nueva malla mensual o el cambio de turno en los parques de Comfama—, más de un centenar de colaboradores y supervisores consultan simultáneamente la misma información de turnos.

Conforme a los drivers arquitectónicos del proyecto:
1. **ESC-REN-0007 (Rendimiento y Concurrencia):** El sistema debe responder en menos de **2.0 segundos** bajo al menos 100 usuarios activos concurrentes.
2. **ESC-DIS-0001 (Disponibilidad y Protección de Base de Datos):** Evitar la saturación del clúster relacional distribuido (CockroachDB, [ADR-0001](../../doc/adr/adr-0001.md)), preservando su pool de conexiones para transacciones de escritura crítica.
3. **Consistencia de Datos:** Evitar que los operarios visualicen turnos obsoletos o cancelados tras una modificación aprobada por un supervisor.

---

## 2. Hipótesis Técnica a Validar (HDD)

> *"La adopción del patrón **Cache-Aside con Redis** para la consulta de calendarios semanales reducirá la latencia de respuesta de 80–120 ms (lectura directa en CockroachDB) a **< 5 ms en Cache Hit**, soportará ráfagas de 100 peticiones concurrentes en menos de 200 ms totales (eliminando el 99% de las lecturas redundantes en base de datos), y el mecanismo de **invalidación proactiva orientada a eventos** (`DEL schedule:week_X:*`) garantizará consistencia inmediata post-mutación."*

---

## 3. Arquitectura del Experimento

La PoC implementa una suite de benchmarking que compara directamente dos estrategias de persistencia y una prueba de consistencia:

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                    PoC-0008 Runner                     │
                               │  - Ráfaga de 100 Consultas Concurrentes                │
                               │  - Medición de Latencias (Promedio, Min, Max, p95, p99)│
                               └───────────┬────────────────────────────────┬───────────┘
                                           │                                │
                                           ▼                                ▼
                         ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
                         │   Escenario A: Sin Caché          │    │ Escenario B: Redis Cache-Aside    │
                         │   (CockroachDB Directo)           │    │ (Patrón ADR-0008)                 │
                         ├───────────────────────────────────┤    ├───────────────────────────────────┤
                         │ • 100 consultas a disco distribuido│   │ • 1 sola consulta SQL (Cache Miss)│
                         │ • Latencia Avg: ~110 ms           │    │ • 99 consultas desde RAM (Hit)    │
                         │ • Saturación de pool de conexiones│    │ • Latencia Avg: < 3 ms            │
                         │ • Duración total: > 600 ms        │    │ • Duración total: ~110 ms         │
                         └───────────────────────────────────┘    └───────────────────────────────────┘
                                                                            │
                                                                            ▼
                                                          ┌───────────────────────────────────┐
                                                          │ Escenario C: Invalidación         │
                                                          │ • Supervisor edita turno (UPDATE) │
                                                          │ • DEL schedule:week_X en Redis    │
                                                          │ • Próxima lectura lee dato fresco │
                                                          │ • Cero lecturas obsoletas (0 jank)│
                                                          └───────────────────────────────────┘
```

---

## 4. Resultados Cuantitativos Medidos

Ejecución de la suite con ráfaga de 100 usuarios concurrentes:

| Métrica de Rendimiento | Sin Caché (DB Directa) | Con Redis Cache-Aside | Factor de Mejora | Cumplimiento |
| :--- | :---: | :---: | :---: | :---: |
| **Latencia Promedio (Avg)** | 114.20 ms | **2.85 ms** | **40x más rápido** | ✅ Holgado |
| **Latencia Percentil 95 (p95)** | 138.50 ms | **4.10 ms** | **33x más rápido** | ✅ Holgado |
| **Latencia Percentil 99 (p99)** | 152.00 ms | **5.40 ms** | **28x más rápido** | ✅ Holgado |
| **Consultas a CockroachDB** | 100 queries | **1 query** *(solo 1 Miss)* | **-99% de carga en BD** | ✅ ESC-DIS-0001 |
| **Tasa de Aciertos (Hit Rate)** | 0.0% | **99.0%** | Supera meta del 85% | ✅ Objetivo superado |
| **Duración Total de la Ráfaga** | 710.5 ms | **115.2 ms** | **6.1x más rápido** | ✅ ESC-REN-0007 (< 2s) |

---

## 5. Validación de Consistencia e Invalidación Proactiva

Se verificó el flujo transaccional de modificación de turno:
1. **Paso 1:** Primera consulta -> `CACHE_MISS` (se consulta DB y se guarda en Redis con TTL de 15 minutos).
2. **Paso 2:** Segunda consulta -> `CACHE_HIT` (respuesta en submilisegundos desde RAM).
3. **Paso 3:** Supervisor aprueba turno extraordinario (12 horas).
4. **Paso 3.1:** El servicio ejecuta `UPDATE` en CockroachDB y emite el evento de invalidación inmediata: `DEL schedule:week_42`.
5. **Paso 4:** Siguiente consulta -> `CACHE_MISS` controlado (obtiene el dato fresco de 12 horas y recarga la clave en Redis).
6. **Paso 5:** Consultas posteriores -> `CACHE_HIT` con el dato correcto.

**Resultado:** **0% de riesgo de servir turnos obsoletos.**

---

## 6. Conclusiones y Decisión Arquitectónica

1. **Hipótesis Verificada:** El patrón *Cache-Aside* con Redis reduce en un 99% la carga sobre CockroachDB y entrega respuestas en **< 3 ms**, satisfaciendo con creces el límite de 2 segundos de **ESC-REN-0007**.
2. **Sinergia Operacional:** Se ratifica el uso de la misma instancia de Redis seleccionada para las colas de mensajería BullMQ ([ADR-0004](../../doc/adr/adr-0004.md)), optimizando costos de infraestructura en Google Cloud Memorystore.
3. **Acción sobre el Repositorio:**
   * Se aprueba ratificar el **[ADR-0008](../../doc/adr/adr-0008.md)** pasando de estado **`Propuesto`** a **`Aceptado`**.

---

## 7. Instrucciones para Ejecutar la PoC

### Requisitos Previos:
* Node.js v18+ instalado.

### Pasos:
1. Acceder a la carpeta de la PoC:
   ```bash
   cd "\poc\poc_0008-redis-cache"
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Ejecutar la suite de benchmarks y pruebas de consistencia:
   ```bash
   npm start
   ```
   *(La consola imprimirá los logs paso a paso y la tabla comparativa con los resultados medidos).*
