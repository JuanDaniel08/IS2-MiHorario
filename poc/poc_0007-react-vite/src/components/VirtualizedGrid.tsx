import React, { useState, useRef } from 'react';
import { Employee, Shift } from '../types/schedule';

interface VirtualizedGridProps {
  employees: Employee[];
  days: number[];
  onShiftClick: (shift: Shift, employee: Employee) => void;
}

const ROW_HEIGHT = 70;
const OVERSCAN = 3;
const CONTAINER_HEIGHT = 520;

export const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({
  employees,
  days,
  onShiftClick
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = employees.length * ROW_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    employees.length,
    Math.ceil((scrollTop + CONTAINER_HEIGHT) / ROW_HEIGHT) + OVERSCAN
  );

  const visibleEmployees = employees.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div className="virtualized-wrapper">
      <div className="virtual-status-badge">
        ⚡ Renderizando solo {visibleEmployees.length} filas visibles en el DOM de {employees.length} totales
      </div>

      <div
        ref={containerRef}
        className="grid-scroll-container virtualized-scroll-container"
        style={{ height: `${CONTAINER_HEIGHT}px` }}
        onScroll={handleScroll}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative', width: 'max-content', minWidth: '100%' }}>
          <table className="schedule-table">
            <thead className="virtual-sticky-header">
              <tr>
                <th className="sticky-col header-employee">Colaborador ({employees.length})</th>
                {days.map((day) => (
                  <th key={day} className="header-day">
                    <div className="day-number">Día {day}</div>
                    <div className="day-weekday">{['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][(day - 1) % 7]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              style={{
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                top: '48px',
                left: 0,
                right: 0
              }}
            >
              {visibleEmployees.map((emp) => (
                <tr key={emp.id} className="employee-row" style={{ height: `${ROW_HEIGHT}px` }}>
                  <td className="sticky-col cell-employee-info">
                    <div className="employee-cell-content">
                      <div
                        className="employee-avatar"
                        style={{ backgroundColor: emp.avatarColor }}
                      >
                        {emp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="employee-details">
                        <span className="employee-name">{emp.name}</span>
                        <span className="employee-role">{emp.role}</span>
                        <span className="employee-dept">{emp.department}</span>
                      </div>
                    </div>
                  </td>
                  {days.map((day) => {
                    const shift = emp.shifts[day];
                    if (!shift) {
                      return <td key={day} className="shift-cell cell-empty">-</td>;
                    }

                    let badgeClass = 'shift-ordinary';
                    if (shift.type === 'SURCHARGE') badgeClass = 'shift-surcharge';
                    else if (shift.type === 'OVERTIME') badgeClass = 'shift-overtime';
                    else if (shift.type === 'REST') badgeClass = 'shift-rest';

                    return (
                      <td
                        key={day}
                        className="shift-cell"
                        onClick={() => onShiftClick(shift, emp)}
                      >
                        <div className={`shift-pill ${badgeClass}`}>
                          <div className="shift-time">
                            {shift.type === 'REST' ? 'LIBRE' : `${shift.startTime}`}
                          </div>
                          <div className="shift-hours">
                            {shift.type === 'REST' ? 'Descanso' : `${shift.hours}h`}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
