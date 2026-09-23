import React from 'react';
import { Employee, Shift } from '../types/schedule';

interface TraditionalGridProps {
  employees: Employee[];
  days: number[];
  onShiftClick: (shift: Shift, employee: Employee) => void;
}

export const TraditionalGrid: React.FC<TraditionalGridProps> = ({
  employees,
  days,
  onShiftClick
}) => {
  return (
    <div className="grid-scroll-container">
      <table className="schedule-table">
        <thead>
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
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className="employee-row">
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
  );
};
