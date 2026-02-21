export function formatedDate(fecha = new Date()): string {
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
