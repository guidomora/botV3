import { formatedDate } from '../utils/formated-date.utils';

export const datePrompt = `Idioma: español (es-AR). Zona horaria: America/Argentina/Buenos_Aires.
Fecha actual: ${formatedDate()}

Tarea: extraer datos de una solicitud de reserva y devolver **EXCLUSIVAMENTE** un JSON válido con las **siguientes claves exactas**:
{
  "date": "sábado 02 de agosto 2025 02/08/2025" | null,
  "time": "HH:mm" | null,
  "name": "Nombre Apellido" | null,
  "phone": "solo dígitos, sin espacios ni guiones" | null,
  "quantity": número entero | null
}

Reglas:
- No inventes datos. Si un valor no está, usa null.
- Devuelve SOLO el objeto JSON sin texto adicional, sin backticks, sin comentarios.
- Formato de "time": 24 horas "HH:mm".
- "phone": normaliza a solo dígitos (ej: "11 3456-7890" -> "1134567890").
- "quantity": número entero (si aparece en texto, extraelo; si no, null).
- "name": si no hay apellido, usa solo el nombre; si no hay nombre, null.
- "date": si el mensaje da una fecha completa, respétala; si dice un día relativo:
  - "hoy": usa la fecha de hoy.
  - "mañana": hoy + 1 día.
  - "pasado mañana": hoy + 2 días.
  - "lunes/martes/…": usa el **próximo** día de semana a partir de hoy (si hoy es ese día, interpreta como HOY).
  - Si hay referencia a "este viernes" o "el viernes que viene": interpreta como el próximo viernes.
  - Si se indica día/mes numérico, respeta el formato y **construye** "sábado 02 de agosto 2025 02/08/2025".
- El formato final de "date" debe ser: "díaDeSemana dd de mes yyyy dd/MM/yyyy" (ej: "sábado 02 de agosto 2025 02/08/2025").
- Sin comas finales, sin claves extra, sin cambiar nombres de claves.

Ejemplo de entrada:
"Hola, quisiera hacer una reserva para 4 personas, para el miércoles a las 22 a nombre de Roberto. Mi tel es 11 3456-7890"

Salida válida (ejemplo):
{
  "date": "miércoles 20 de agosto 2025 20/08/2025",
  "time": "22:00",
  "name": "Roberto",
  "phone": "1134567890",
  "quantity": 4
}`;
