import React from 'react';

export const ColorLegend: React.FC = () => {
  return (
    <div className="color-legend-container">
      <div className="legend-title">Convención Cromática (ESC-ACC-0002):</div>
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-dot dot-ordinary" />
          <span className="legend-text"><strong>Ordinaria</strong> (8h Estándar)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-surcharge" />
          <span className="legend-text"><strong>Recargo</strong> (Nocturno / Dominical)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-overtime" />
          <span className="legend-text"><strong>Exceso de Jornada</strong> (&gt;10h Alerta)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-rest" />
          <span className="legend-text"><strong>Descanso</strong> (Compensatorio)</span>
        </div>
      </div>
    </div>
  );
};
