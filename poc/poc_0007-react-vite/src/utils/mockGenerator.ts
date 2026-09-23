import { Employee, Shift, ShiftType } from '../types/schedule';

const FIRST_NAMES = [
  'Carlos', 'Daniela', 'Mateo', 'Valentina', 'Alejandro', 'Mariana', 'Santiago', 'Camila',
  'Andrés', 'Sofía', 'Sebastián', 'Isabella', 'Juan', 'Luciana', 'Nicolás', 'Gabriela',
  'David', 'Paula', 'Felipe', 'Salomé', 'Esteban', 'Manuela', 'Samuel', 'Sara',
  'Julián', 'Laura', 'Tomás', 'Valeria', 'Simón', 'Elena', 'Diego', 'Martina',
  'Manuel', 'Catalina', 'Emilio', 'Ana María', 'Pablo', 'Antonia', 'Lucas', 'Victoria',
  'Leonardo', 'Juana', 'Cristian', 'Miranda', 'Gabriel', 'Renata', 'Joaquín', 'Amalia',
  'Mauricio', 'Julieta'
];

const LAST_NAMES = [
  'Rodríguez', 'Gómez', 'Restrepo', 'Zapata', 'Londoño', 'Ochoa', 'Montoya', 'Henao',
  'Giraldo', 'Cardona', 'Vásquez', 'Jaramillo', 'Ceballos', 'Mejía', 'Uribe', 'Echeverri',
  'Bedoya', 'Quintero', 'Álvarez', 'Correa', 'Gutiérrez', 'Tabares', 'Rendón', 'Cano',
  'Arango', 'Flórez', 'Pineda', 'Saldarriaga', 'Osorio', 'Betancur'
];

const ROLES = [
  { role: 'Operador Atracciones', dept: 'Operaciones Parque' },
  { role: 'Auxiliar de Taquilla', dept: 'Servicio al Cliente' },
  { role: 'Coordinador de Logística', dept: 'Operaciones Parque' },
  { role: 'Técnico de Mantenimiento', dept: 'Infraestructura' },
  { role: 'Salvavidas / Piscinas', dept: 'Seguridad Acuática' },
  { role: 'Guía Ecoturístico', dept: 'Experiencias Comfama' },
  { role: 'Gestor de Alimentos y Bebidas', dept: 'Comercial' }
];

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
];

export function generateMockEmployees(count = 50, days = 30): Employee[] {
  const employees: Employee[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
    const roleInfo = ROLES[i % ROLES.length];
    const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const empId = `EMP-${(1001 + i).toString()}`;

    const shifts: Record<number, Shift> = {};

    for (let day = 1; day <= days; day++) {
      // Deterministic shift pattern with variety
      const patternSeed = (i * 7 + day * 13) % 100;
      let type: ShiftType;
      let startTime = '08:00';
      let endTime = '16:00';
      let hours = 8;
      let label = 'Turno 8h';
      let location = 'Sede Parque Rionegro';

      // Weekly rest (approx every 6th-7th day)
      if (patternSeed < 15) {
        type = 'REST';
        startTime = '--:--';
        endTime = '--:--';
        hours = 0;
        label = 'Descanso';
        location = 'N/A';
      } else if (patternSeed < 30) {
        // Surcharge (night or sunday)
        type = 'SURCHARGE';
        startTime = '18:00';
        endTime = '02:00';
        hours = 8;
        label = 'Nocturno + Recargo';
        location = 'Atracciones Nocturnas';
      } else if (patternSeed < 40) {
        // Overtime / Alert excess
        type = 'OVERTIME';
        startTime = '07:00';
        endTime = '19:00';
        hours = 12;
        label = 'Jornada Extraordinaria (12h)';
        location = 'Evento Especial';
      } else {
        // Ordinary
        type = 'ORDINARY';
        if (patternSeed % 2 === 0) {
          startTime = '06:00';
          endTime = '14:00';
          label = 'Mañana (6-14)';
        } else {
          startTime = '14:00';
          endTime = '22:00';
          label = 'Tarde (14-22)';
        }
        hours = 8;
        location = 'Zona Comfama Central';
      }

      shifts[day] = {
        id: `SHIFT-${empId}-D${day}`,
        employeeId: empId,
        day,
        dateStr: `2026-10-${day.toString().padStart(2, '0')}`,
        startTime,
        endTime,
        type,
        hours,
        label,
        location
      };
    }

    employees.push({
      id: empId,
      code: `COM-${2000 + i}`,
      name: `${firstName} ${lastName}`,
      role: roleInfo.role,
      department: roleInfo.dept,
      avatarColor,
      shifts
    });
  }

  return employees;
}
