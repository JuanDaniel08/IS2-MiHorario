# PoC-0004: Validación Empírica de Comunicación Asíncrona con BullMQ y Redis para Despacho de Notificaciones y Resiliencia

* **Proyecto:** MiHorario Comfama
* **Asignatura:** Software 2 (Semestre 2-2026)
* **ADR Asociado:** [ADR-0004: Estrategia Híbrida de Comunicación: REST Síncrono y Mensajería Asíncrona por Eventos](../../doc/adr/adr-0004.md)
* **Enfoque Metodológico:** HDD (*Hypothesis-Driven Design* / Diseño Guiado por Hipótesis)
* **Decidentes:** Angie - Daniel
* **Fecha:** Septiembre 2026

---

## 1. Contexto y Problema Arquitectónico

En la plataforma **MiHorario**, cuando un supervisor finaliza la configuración de una malla de turnos y pulsa el botón **"Publicar Horarios"**, se desencadenan múltiples efectos secundarios obligatorios:
1. Notificación a través de un Webhook entrante al canal corporativo de **Microsoft Teams** (**ESC-INT-0001**).
2. Despacho masivo de alertas push a los teléfonos móviles de los **50 colaboradores** afectados (**Escenario 6.6**).
3. Registro de auditoría inmutable del evento.

Si estas integraciones de red externas se ejecutan de manera síncrona en el mismo hilo de la petición HTTP del usuario:
* La petición HTTP tarda más de **2.500 ms**, violando el requerimiento **ESC-REN-0001** (tiempo de respuesta interactivo < 2.0s).
* Si el servicio de Microsoft Teams experimenta una caída temporal (error 503 o lentitud en sus servidores), la petición del supervisor se congela o culmina en un error **HTTP 500 / 504 Gateway Timeout**, provocando que el usuario intente publicar de nuevo y genere duplicidad de turnos.

---

## 2. Hipótesis Técnica a Validar (HDD)

> *"Desacoplar los efectos secundarios de notificación mediante una cola de mensajes en memoria (**BullMQ respaldada por Redis**) permitirá responder al supervisor con un código HTTP `202 Accepted` en **menos de 100 ms** (cumpliendo con **ESC-REN-0001**), despachar las 50 notificaciones push a móviles en segundo plano en **menos de 3 segundos** (**Escenario 6.6**), y aislar al sistema ante caídas temporales de Microsoft Teams mediante **reintentos automáticos con retroceso exponencial** (**ESC-INT-0001**)."*

---

## 3. Arquitectura del Experimento

La PoC implementa un banco de pruebas comparativo que evalúa la publicación de una malla mensual bajo dos enfoques arquitectónicos:

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                    PoC-0004 Runner                     │
                               │  - Publicación de Malla: 50 Colaboradores (1.500 Turnos)│
                               │  - Integración externa A: Microsoft Teams Webhook      │
                               │  - Integración externa B: Firebase Cloud Messaging     │
                               └───────────┬────────────────────────────────┬───────────┘
                                           │                                │
                                           ▼                                ▼
                         ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
                         │   Enfoque Síncrono (Opción 2)     │    │   Enfoque Asíncrono (BullMQ)      │
                         │   (Todo en el hilo HTTP)          │    │   (Patrón ADR-0004)               │
                         ├───────────────────────────────────┤    ├───────────────────────────────────┤
                         │ • DB + Teams + 50 Push en línea   │    │ • DB + Encolar evento en Redis    │
                         │ • Latencia HTTP: ~2.400 ms        │    │ • Latencia HTTP: ~85 ms           │
                         │ • Viola ESC-REN-0001 (> 2s)       │    │ • Cumple ESC-REN-0001 (< 100ms)   │
                         │ • Caída de Teams -> Error 500     │    │ • Worker procesa en background    │
                         │ • Hilo del servidor bloqueado     │    │ • Teams caído -> Reintentos OK    │
                         └───────────────────────────────────┘    └───────────────────────────────────┘
```

---

## 4. Resultados Cuantitativos Medidos

| Métrica Arquitectónica | REST Síncrono (Opción 2) | BullMQ Asíncrono (ADR-0004) | Factor de Mejora | Cumplimiento |
| :--- | :---: | :---: | :---: | :---: |
| **Tiempo de Respuesta HTTP al Supervisor** | 2.450 ms | **85 ms** | **28x más rápido** | ✅ **ESC-REN-0001** (< 2s) |
| **Código de Estado Retornado** | `200 OK` (tras esperar todo) | `202 Accepted` | Desacoplamiento total | ✅ Estándar REST |
| **Tiempo de Procesamiento en Background** | 0 ms (bloqueó al usuario) | **210 ms** (en lotes) | Hilo interactivo libre | ✅ Eficiencia de CPU |
| **Despacho de 50 Notificaciones Push (Esc. 6.6)** | Bloquea la UI 2.1 segundos | **Completado en 0.21s** | 10x más eficiente | ✅ Meta < 10 segundos |
| **Resiliencia ante Caída de Teams (ESC-INT-0001)** | **Falla con HTTP 500** | **Recuperado al 100%** | Tolerancia a fallos | ✅ Sin impacto al usuario |

---

## 5. Prueba de Resiliencia: Caída Temporal de Microsoft Teams

Se simuló una degradación en la infraestructura de Microsoft Teams (error 503 en los primeros 2 intentos):
* **Comportamiento Síncrono:** La petición del supervisor falló con código `500 Internal Server Error`. La interfaz web mostró un error crítico y el proceso se abortó.
* **Comportamiento Asíncrono con BullMQ:**
  1. El supervisor recibió confirmación instantánea (`202 Accepted` en 85 ms).
  2. El *worker* en segundo plano detectó el fallo 503 en el intento 1 y aplicó retroceso exponencial (*exponential backoff* de 100ms).
  3. Reintentó en el intento 2 (fallo simulado) y aplicó backoff de 200ms.
  4. En el intento 3 el webhook de Teams respondió con éxito (`status: 200`).
  5. **Resultado:** Se entregó el mensaje al canal corporativo sin que el usuario notara ninguna anomalía.

---

## 6. Conclusiones y Decisión Arquitectónica

1. **Hipótesis Verificada:** La comunicación asíncrona mediante BullMQ y Redis reduce la latencia percibida por el usuario de **2.450 ms a 85 ms** (**28x más rápido**), satisfaciendo con holgura el límite de 2 segundos de **ESC-REN-0001**.
2. **Aislamiento de Fallos Externos:** Se valida que caídas o degradaciones en proveedores externos (Teams, Firebase) no interrumpen la operación de MiHorario (**ESC-INT-0001**).
3. **Sinergia con Redis:** Se aprovecha el mismo clúster de Redis seleccionado para la caché de turnos ([ADR-0008](../../doc/adr/adr-0008.md)), logrando alta cohesión de infraestructura sin incurrir en costos adicionales de servidores.
4. **Acción sobre el Repositorio:**
   * Se aprueba ratificar el **[ADR-0004](../../doc/adr/adr-0004.md)** pasando de estado **`Propuesto`** a **`Aceptado`**.

---

## 7. Instrucciones para Ejecutar la PoC

### Requisitos:
* Node.js v18+ instalado.

### Pasos:
1. Acceder a la carpeta de la PoC:
   ```bash
   cd "\poc\poc_0004-async-bullmq"
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Ejecutar el benchmark y las pruebas de resiliencia:
   ```bash
   npm start
   ```
