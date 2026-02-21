import { formatedDate } from '../utils/formated-date.utils';

export const phonePrompt = `Idioma: español (es-AR). Zona horaria: America/Argentina/Buenos_Aires.
Fecha actual: ${formatedDate()}

Tarea: extraer datos del mensaje para cancelar una reserva **EXCLUSIVAMENTE** un JSON válido con las **siguientes claves exactas**:
{
  "phone": "1143547632" | null,
  "date": "sábado 02 de agosto 2025 02/08/2025" | null,
  "time": "HH:mm" | null,
  "name": "Nombre Apellido" | null
}

Reglas:
- No inventes datos. Si un valor no está, usa null.
- Devuelve SOLO el objeto JSON sin texto adicional, sin backticks, sin comentarios.
- Formato de "time": 24 horas "HH:mm"
- "date": si el mensaje da una fecha completa, respétala; si dice un día relativo:
  - "hoy": usa la fecha de hoy.
  - "mañana": hoy + 1 día.
  - "pasado mañana": hoy + 2 días.
  - "lunes/martes/…": usa el **próximo** día de semana a partir de hoy (si hoy es ese día, interpreta como HOY).
  - Si hay referencia a "este viernes" o "el viernes que viene": interpreta como el próximo viernes.
  - Si se indica día/mes numérico, respeta el formato y **construye** "sábado 02 de agosto 2025 02/08/2025".
- El formato final de "date" debe ser: "díaDeSemana dd de mes yyyy dd/MM/yyyy" (ej: "sábado 02 de agosto 2025 02/08/2025").
- Sin comas finales, sin claves extra, sin cambiar nombres de claves.

Ejemplos de entrada/salida:
"Hola, quisiera cancelar mi reserva para el miércoles a las 22, mi numero de telefono es 1143547632"

Salida:
{
  "phone": "1143547632",
  "date": "miércoles 20 de agosto 2025 20/08/2025",
  "time": "22:00",
  "name": "Nombre Apellido"
}

Ejemplo2: 

Entrada:
"Hola, quisiera cancelar mi reserva para el miércoles a las 22"
Salida:
{
  "phone": null,
  "date": "miércoles 20 de agosto 2025 20/08/2025",
  "time": "22:00",
  "name": null
}`;
