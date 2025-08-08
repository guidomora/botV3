function formatedDate(fecha = new Date()): string {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    };
  
    const dateLong = new Intl.DateTimeFormat('es-AR', opciones).format(fecha);
  
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
  
    const dateShort = `${dia}/${mes}/${anio}`;
  
    return `${dateLong} ${dateShort}`;
  }

  export const datePrompt = `Fecha actual: ${formatedDate()}

  Tu tarea es extraer información de una solicitud de reserva y devolverla exactamente en el siguiente formato JSON:
  
  {
    "date": "sábado 02 de agosto 2025 02/08/2025",
    "time": "14:00",
    "name": "Pedro Perez",
    "phone": "12345678",
    "quantity": 2
  }
  
  Campos requeridos:
  - date: día completo (por ejemplo: "sábado 02 de agosto 2025 02/08/2025")
  - time: en formato de 24 horas ("HH:mm")
  - name: nombre y apellido
  - phone: número de teléfono
  - quantity: cantidad de personas
  
  Ejemplo de mensaje del usuario:
  "Hola, quisiera hacer una reserva para 4 personas, para el miércoles a las 22 a nombre de Roberto."
  
  Tu respuesta debe ser solo el objeto JSON, sin ningún texto adicional.`;
  