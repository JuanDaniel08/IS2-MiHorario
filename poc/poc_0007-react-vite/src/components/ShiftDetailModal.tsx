import React from 'react';
import { X, Clock, MapPin, User, Calendar, ShieldCheck } from 'lucide-react';
import { Shift, Employee } from '../types/schedule';

interface ShiftDetailModalProps {
  shift: Shift | null;
  employee: Employee | null;
  onClose: () => void;
}

export const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  shift,
  employee,
  onClose
}) => {
  if (!shift || !employee) return null;

  const getTypeLabel = (type: Shift['type']) => {
    switch (type) {
      case 'ORDINARY':
        return { text: 'Jornada Ordinaria', color: 'badge-ordinary' };
      case 'SURCHARGE':
        return { text: 'Recargo Nocturno / Dominical', color: 'badge-surcharge' };
      case 'OVERTIME':
        return { text: 'Exceso de Jornada (Horas Extra)', color: 'badge-overtime' };
      case 'REST':
        return { text: 'Día de Descanso / Compensatorio', color: 'badge-rest' };
    }
  };

  const typeInfo = getTypeLabel(shift.type);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className={`badge-pill ${typeInfo.color}`}>{typeInfo.text}</span>
            <h3 className="modal-title">{shift.label}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-item">
            <User size={18} className="detail-icon" />
            <div>
              <div className="detail-label">Colaborador</div>
              <div className="detail-val">{employee.name} ({employee.code})</div>
              <div className="detail-sub">{employee.role} • {employee.department}</div>
            </div>
          </div>

          <div className="detail-item">
            <Calendar size={18} className="detail-icon" />
            <div>
              <div className="detail-label">Fecha y Programación</div>
              <div className="detail-val">{shift.dateStr} (Día {shift.day})</div>
            </div>
          </div>

          <div className="detail-item">
            <Clock size={18} className="detail-icon" />
            <div>
              <div className="detail-label">Horario Asignado</div>
              <div className="detail-val font-mono">
                {shift.startTime} - {shift.endTime} ({shift.hours} horas)
              </div>
            </div>
          </div>

          <div className="detail-item">
            <MapPin size={18} className="detail-icon" />
            <div>
              <div className="detail-label">Ubicación / Área Comfama</div>
              <div className="detail-val">{shift.location}</div>
            </div>
          </div>

          <div className="detail-item">
            <ShieldCheck size={18} className="detail-icon" />
            <div>
              <div className="detail-label">Validación Normativa</div>
              <div className="detail-sub text-emerald-400">
                Turno validado bajo parámetros laborales Comfama 2026
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-primary" onClick={onClose}>
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
