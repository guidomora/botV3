# Availability Rules

Este documento define como se interpreta la disponibilidad del restaurante.

## Conceptos

Capacidad total:

- Cantidad maxima de personas que el restaurante puede aceptar en una franja.
- Se configura con `MAX_CAPACITY_TOTAL`.

Buffer online:

- Porcentaje de capacidad reservado fuera del canal automatizado.
- Se configura con `ONLINE_BUFFER_PERCENT`.

Capacidad online:

- Capacidad disponible para reservas gestionadas por el bot.
- Formula conceptual:

```text
capacidad_online = floor(MAX_CAPACITY_TOTAL * (1 - ONLINE_BUFFER_PERCENT))
```

Duracion de reserva:

- Tiempo durante el cual una reserva ocupa capacidad.
- Se configura con `RESERVATION_DURATION_MINUTES`.

Intervalo de agenda:

- Granularidad de franjas disponibles.
- Se configura con `SLOT_INTERVAL_MINUTES`.

## Confirmacion por capacidad

Una reserva solo puede confirmarse si:

```text
ocupacion_solapada + personas_solicitadas <= capacidad_online
```

Esto implica:

- No alcanza con mirar solo el horario exacto.
- Deben considerarse reservas que se solapan con la duracion configurada.
- Cambiar la duracion de reserva cambia la forma de calcular ocupacion.

## Solapamiento horario

Una reserva ocupa capacidad durante su ventana temporal.

Ejemplo conceptual:

- Reserva a las 20:00.
- Duracion de reserva: 120 minutos.
- La reserva ocupa capacidad entre 20:00 y 22:00.

Otra reserva debe evaluar si su propia ventana se cruza con esa ocupacion.

## Consulta de disponibilidad

El bot puede responder:

- Disponibilidad por dia completo.
- Disponibilidad para una hora puntual.
- Disponibilidad para una franja o preferencia aproximada.

Si el horario exacto no esta disponible:

- Puede sugerir horarios cercanos.
- Las sugerencias tambien deben respetar capacidad, cierres y fechas validas.

## Dias cerrados

Un dia cerrado bloquea nuevas reservas hacia esa fecha.

Reglas:

- No se deben crear reservas nuevas en un dia cerrado.
- No se deben mover reservas existentes hacia un dia cerrado.
- Reabrir el dia permite volver a evaluar disponibilidad normalmente.

## Franjas cerradas

Una franja cerrada bloquea reservas nuevas o modificaciones hacia ese rango horario.

Reglas:

- El cierre puede ser parcial dentro de un dia.
- Una reserva no debe confirmarse si su horario cae dentro de una franja cerrada.
- Una reapertura parcial debe volver a permitir reservas solo en el rango reabierto.
- Si el dia completo esta cerrado, la reapertura de una franja no deberia tratarse como dia disponible completo.

## Reservas grandes

Si `personas_solicitadas` supera `MAX_PEOPLE_PER_RESERVATION`:

- No se evalua como una reserva automatica normal.
- El bot debe derivar a atencion directa.
- Esta derivacion evita comprometer capacidad sin revision humana.

## Recalculo de disponibilidad

Debe recalcularse o sincronizarse disponibilidad despues de:

- Crear una reserva.
- Modificar una reserva.
- Cancelar una reserva.
- Cerrar un dia.
- Reabrir un dia.
- Cerrar una franja.
- Reabrir una franja.
- Limpiar filas historicas cuando afecten vistas operativas.

## Reglas de consistencia

La disponibilidad nunca debe quedar en un estado que permita:

- Confirmar mas personas que la capacidad online.
- Reservar en fechas u horarios pasados.
- Reservar en dias cerrados.
- Reservar en franjas cerradas.
- Crear duplicados por reintentos.
- Mostrar cupos que no reflejan reservas confirmadas.
