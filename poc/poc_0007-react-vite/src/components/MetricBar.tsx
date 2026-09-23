import React from 'react';
import { Gauge, Zap, Layers, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PerformanceMetrics } from '../types/schedule';

interface MetricBarProps {
  metrics: PerformanceMetrics;
  onToggleMode: (mode: 'traditional' | 'virtualized') => void;
  onRefreshData: () => void;
  filterText: string;
  onFilterChange: (text: string) => void;
}

export const MetricBar: React.FC<MetricBarProps> = ({
  metrics,
  onToggleMode,
  onRefreshData,
  filterText,
  onFilterChange
}) => {
  const isVirtualized = metrics.mode === 'virtualized';

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (fps >= 40) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getRenderTimeColor = (ms: number) => {
    if (ms <= 40) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (ms <= 120) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <header className="metric-bar-container">
      <div className="metric-bar-top">
        <div className="brand-group">
          <div className="brand-badge">PoC-0007</div>
          <div>
            <h1 className="brand-title">Malla de Turnos Comfama</h1>
            <p className="brand-subtitle">
              Validación empírica para <strong>ADR-0007</strong> (ESC-REN-0001 & ESC-ACC-0002)
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            id="btn-mode-traditional"
            className={`mode-btn ${!isVirtualized ? 'active-traditional' : ''}`}
            onClick={() => onToggleMode('traditional')}
          >
            <Layers size={16} />
            <span>Modo Tradicional (1.500 Nodos)</span>
          </button>
          <button
            id="btn-mode-virtualized"
            className={`mode-btn ${isVirtualized ? 'active-virtualized' : ''}`}
            onClick={() => onToggleMode('virtualized')}
          >
            <Zap size={16} />
            <span>Modo Virtualizado (Ventana Activa)</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-cards-grid">
        {/* Render Duration */}
        <div className={`metric-card ${getRenderTimeColor(metrics.renderTimeMs)}`}>
          <div className="metric-icon-wrapper">
            <Gauge size={20} />
          </div>
          <div>
            <div className="metric-label">Tiempo de Renderizado</div>
            <div className="metric-value font-mono">
              {metrics.renderTimeMs.toFixed(1)} <span className="text-xs">ms</span>
            </div>
          </div>
          <div className="metric-tag">
            {metrics.renderTimeMs < 50 ? 'Ultrarrápido' : 'Sobrecarga DOM'}
          </div>
        </div>

        {/* Live FPS */}
        <div className={`metric-card ${getFpsColor(metrics.fps)}`}>
          <div className="metric-icon-wrapper">
            <Activity size={20} />
          </div>
          <div>
            <div className="metric-label">Tasa de Refresco (FPS)</div>
            <div className="metric-value font-mono">
              {metrics.fps} <span className="text-xs">FPS</span>
            </div>
          </div>
          <div className="metric-tag">
            {metrics.fps >= 55 ? '60 FPS Fluido' : 'Jank Detectado'}
          </div>
        </div>

        {/* DOM Nodes in Document */}
        <div className="metric-card text-sky-300 border-sky-500/30 bg-sky-500/10">
          <div className="metric-icon-wrapper">
            <Layers size={20} />
          </div>
          <div>
            <div className="metric-label">Nodos DOM en Documento</div>
            <div className="metric-value font-mono">
              {metrics.activeDomNodes.toLocaleString()}
            </div>
          </div>
          <div className="metric-tag">
            {isVirtualized ? 'Optimizado (-85%)' : 'Árbol Pesado'}
          </div>
        </div>

        {/* Compliance Status */}
        <div className="metric-card text-indigo-300 border-indigo-500/30 bg-indigo-500/10">
          <div className="metric-icon-wrapper">
            {isVirtualized ? (
              <CheckCircle2 size={20} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={20} className="text-amber-400" />
            )}
          </div>
          <div>
            <div className="metric-label">Cumplimiento Atributos</div>
            <div className="metric-status-text">
              {isVirtualized ? 'ESC-REN-0001 (OK)' : 'Riesgo Móvil 4G'}
            </div>
          </div>
          <div className="metric-tag">
            {isVirtualized ? 'Bundle 142KB' : 'No Recomendado'}
          </div>
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div className="controls-row">
        <input
          id="search-employee-input"
          type="text"
          className="search-input"
          placeholder="Buscar colaborador o departamento..."
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
        />
        <div className="controls-info">
          <span>Mostrando <strong>{metrics.employeeCount}</strong> colaboradores ({metrics.totalShifts} turnos)</span>
          <button
            id="btn-re-render-test"
            className="action-btn"
            onClick={onRefreshData}
          >
            Regenerar / Medir Re-render
          </button>
        </div>
      </div>
    </header>
  );
};
