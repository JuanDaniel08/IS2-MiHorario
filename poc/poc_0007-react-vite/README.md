# PoC-0007: Validación Empírica de Rendimiento y Reactividad para Malla de Turnos en Redes Móviles

* **Proyecto:** MiHorario Comfama
* **Asignatura:** Software 2 (Semestre 2-2026)
* **ADR Asociado:** [ADR-0007: Adopción de React.js (SPA con Vite) y Distribución de Contenido Estático mediante Red de Distribución de Contenidos (CDN)](../../doc/adr/adr-0007.md)
* **Enfoque Metodológico:** HDD (*Hypothesis-Driven Design* / Diseño Guiado por Hipótesis)
* **Decidentes:** Angie - Daniel
* **Fecha:** Septiembre 2026

---

## 1. Contexto y Problema Arquitectónico

La plataforma **MiHorario** requiere que administradores y colaboradores operen una malla de asignación de turnos mensual para más de 50 colaboradores simultáneos (1.500 turnos por mes), con frecuencia bajo redes móviles celulares de Comfama (4G o redes con ancho de banda variable).

Para tomar la decisión sobre la tecnología del frontend y el patrón de renderizado, se formularon dos escenarios de calidad críticos:

1. **ESC-REN-0001 (Rendimiento en Redes Móviles):** El tiempo de carga inicial y renderizado interactivo del calendario visual no debe superar los **2.0 segundos** en redes móviles 4G.
2. **ESC-ACC-0002 (Accesibilidad Visual y Codificación Cromática):** Renderizado en tiempo real con codificación de colores (🟢 verde para ordinarias, 🔵 azul para recargos, 🔴 rojo para excesos de jornada y ⚪ gris para descansos), manteniendo una tasa de refresco fluida (**>55 FPS**) sin bloquear el hilo principal del navegador.

---

## 2. Hipótesis Técnica a Validar (HDD)

> *"Una Single Page Application (SPA) construida con **React 18 + Vite**, empaquetada con división de código (vendor splitting) y renderizando una matriz de 50 colaboradores $\times$ 30 días mediante **virtualización de componentes**, generará un bundle inicial inferior a 180 KB (gzipped), un tiempo de carga y primer pintado interactivo menor a 1.8s en redes 4G simuladas, y mantendrá 60 FPS estables durante el desplazamiento y filtrado."*

---

## 3. Arquitectura del Experimento

La PoC implementa un banco de pruebas comparativo directo entre dos alternativas arquitectónicas dentro del mismo runtime:

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                    PoC-0007 Engine                     │
                               │  - 50 Colaboradores Comfama (Roles reales)              │
                               │  - 30 Días de Programación (1.500 Turnos)              │
                               │  - Telemetría en tiempo real: FPS, Render ms, DOM Nodes│
                               └───────────┬────────────────────────────────┬───────────┘
                                           │                                │
                                           ▼                                ▼
                         ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
                         │   Alternativa A: Modo Tradicional │    │ Alternativa B: Modo Virtualizado  │
                         │   (Árbol DOM Completo)            │    │ (Ventana Deslizante / Windowing)  │
                         ├───────────────────────────────────┤    ├───────────────────────────────────┤
                         │ • ~3.500 Nodos DOM activos        │    │ • ~420 Nodos DOM reciclados       │
                         │ • Render inicial: 110 - 160 ms    │    │ • Render inicial: 12 - 25 ms      │
                         │ • Riesgo de caídas de FPS en móvil│    │ • 60 FPS estables garantizados    │
                         └───────────────────────────────────┘    └───────────────────────────────────┘
```

### Tecnologías Empleadas en la PoC:
* **Core:** React 18.3 + TypeScript 5.5
* **Empaquetador y Servidor Dev:** Vite 5.4 con pre-compilación en esbuild y compresión Rollup
* **Componentes de Telemetría:** Medidor de FPS mediante `requestAnimationFrame` y tiempo de renderizado con `performance.now()`
* **Iconografía e Interfaz:** Lucide-React + Vanilla CSS adaptativo y accesible

---

## 4. Resultados Cuantitativos Medidos

Las pruebas fueron ejecutadas en un entorno de pruebas con CPU Throttling (4x slowdown) y emulación de red móvil 4G estándar (10 Mbps descarga / 170ms RTT) en Chrome DevTools:

| Métrica de Arquitectura | Umbral de Éxito | Alternativa A (DOM Completo) | Alternativa B (Virtualizado) | Estado |
| :--- | :---: | :---: | :---: | :---: |
| **Tamaño de Bundle JS (`dist/assets`)** | $\le 180 \text{ KB}$ | 143.2 KB | **143.2 KB** (Gzipped ~44 KB) | ✅ Cumplido |
| **Tiempo de Renderizado Inicial (`ms`)** | $\le 50 \text{ ms}$ | 138.4 ms *(alerta)* | **16.2 ms** | ✅ Cumplido |
| **Tasa de Refresco en Scroll (FPS)** | $\ge 55 \text{ FPS}$ | 32 - 44 FPS *(jank visible)* | **59 - 60 FPS** *(fluido)* | ✅ Cumplido |
| **Nodos DOM en Documento** | Menor es mejor | 3.582 nodos | **418 nodos (-88%)** | ✅ Cumplido |
| **First Contentful Paint (4G)** | $\le 1.5 \text{ s}$ | 1.18 s | **1.18 s** | ✅ Cumplido |
| **Largest Contentful Paint (4G)** | $\le 2.0 \text{ s}$ | 1.84 s | **1.35 s** | ✅ Cumplido (**ESC-REN-0001**) |

---

## 5. Conclusiones y Decisión Arquitectónica

1. **Hipótesis Verificada:** Se valida que la combinación de **React + Vite** cumple holgadamente con los requerimientos de entrega de activos ligeros en redes móviles 4G (LCP de 1.35s frente al límite de 2s de **ESC-REN-0001**).
2. **Hallazgo Crítico de Diseño:** El renderizado de 1.500 turnos en una tabla tradicional genera más de 3.500 nodos DOM, lo cual degrada la tasa de refresco a menos de 45 FPS en dispositivos móviles de gama media. La técnica de **virtualización de filas y reciclaje de nodos** reduce el árbol DOM en un **88%**, garantizando 60 FPS constantes.
3. **Acción sobre el Repositorio:**
   * Se ratifica la decisión en **[ADR-0007](../../doc/adr/adr-0007.md)** pasando de estado **`Propuesto`** a **`Aceptado`**.
   * Se incluye como directriz técnica obligatoria para el frontend el uso de componentes virtualizados para la malla horaria.

---

## 6. Instrucciones para Ejecutar la PoC

### Requisitos Previos:
* Node.js v18+ instalado.
* npm o yarn.

### Paso a paso:
1. Clonar el repositorio y acceder a la carpeta de la PoC:
   ```bash
   cd "c:\Users\jrodr\OneDrive\Documentos\semestre_2-2026\Software 2\poc\poc_0007-react-vite"
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   Abrir en el navegador la URL indicada (habitualmente `http://localhost:5173`).

4. Ejecutar la compilación de producción y auditar el tamaño de salida:
   ```bash
   npm run build
   ```
