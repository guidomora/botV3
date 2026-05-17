# Reservation Rules

Este documento define reglas de negocio para crear, modificar y cancelar reservas.

## Conceptos

Reserva completa:

- Tiene fecha.
- Tiene hora.
- Tiene nombre.
- Tiene telefono.
- Tiene cantidad de personas.
- Tiene una intencion o tipo de servicio compatible con el bot.

Reserva parcial:

- Tiene algunos datos requeridos, pero no todos.
- No debe confirmarse.
- Puede guardarse temporalmente mientras el bot pide los datos faltantes.

Reserva confirmada:

- Paso validaciones de negocio.
- Fue persistida en la hoja principal de reservas.
- Debe impactar en la disponibilidad.

## Crear reserva

Para crear una reserva automaticamente, el bot debe contar con:

- Fecha.
- Hora.
- Nombre.
- Telefono.
- Cantidad de personas.

Si falta uno o mas datos:

- El bot debe pedir unicamente los datos faltantes.
- No debe pedir de nuevo datos que ya conoce.
- No debe crear una reserva definitiva.
- Puede mantener estado parcial en cache conversacional y hoja temporal.

Cuando todos los datos estan completos:

- Debe validar fecha y hora.
- Debe validar duplicidad por telefono y dia.
- Debe validar cantidad de personas.
- Debe validar disponibilidad.
- Si todas las reglas pasan, puede confirmar la reserva.

## Duplicidad por telefono y dia

Un mismo telefono no puede tener mas de una reserva para el mismo dia.

Si el bot detecta que ya existe una reserva para ese telefono y fecha:

- No debe crear una segunda reserva.
- Debe sugerir modificar la reserva existente.
- No debe consumir cupo extra de disponibilidad.

Esta regla aplica aunque cambie el canal que origina la reserva.

## Fechas y horarios pasados

No se permite:

- Crear una reserva en fecha u hora pasada.
- Mover una reserva a fecha u hora pasada.
- Modificar una reserva cuya fecha u hora original ya paso.

Si el usuario pide una operacion sobre una fecha pasada:

- El bot debe rechazar la operacion.
- Debe pedir una fecha u horario valido cuando corresponda.

## Cantidad de personas

La cantidad de personas debe ser compatible con las reglas de capacidad.

Existe un limite configurable:

- `MAX_PEOPLE_PER_RESERVATION`

Comportamiento esperado:

- Si la cantidad esta dentro del limite, se evalua disponibilidad normal.
- Si supera el limite, la reserva no se gestiona automaticamente.
- Para reservas grandes, el bot debe derivar a atencion directa.
- Si existe `LARGE_RESERVATION_CONTACT_NUMBER`, puede usarse como contacto de derivacion.

## Modificar reserva

Para modificar una reserva, primero debe identificarse la reserva original.

Datos que pueden ayudar a localizarla:

- Telefono.
- Fecha original.
- Hora original.
- Nombre, si corresponde.

Una modificacion puede cambiar:

- Fecha.
- Hora.
- Nombre.
- Cantidad de personas.

Antes de confirmar la modificacion:

- La reserva original debe existir.
- La reserva original no debe estar en el pasado.
- La nueva fecha y hora no deben estar en el pasado.
- La nueva cantidad debe respetar el limite por grupo.
- La nueva combinacion de fecha, hora y cantidad debe respetar disponibilidad.

Si la modificacion no puede aplicarse:

- No debe alterarse la reserva original.
- El bot debe explicar el motivo o pedir un dato valido.

## Cancelar reserva

Para cancelar una reserva, el bot debe recolectar datos suficientes para ubicarla.

Datos minimos esperados:

- Telefono.
- Fecha.
- Hora o informacion suficiente para desambiguar.

Si falta informacion:

- El bot debe pedir solo lo necesario para localizar la reserva.
- No debe cancelar reservas ambiguas.

Si la reserva existe y puede cancelarse:

- Debe eliminarse o limpiarse la fila correspondiente.
- Debe recalcularse disponibilidad.
- Debe confirmarse la cancelacion al usuario.

Si no se encuentra la reserva:

- El bot debe informar que no pudo ubicarla con los datos enviados.
- Puede pedir datos adicionales si el flujo permite seguir intentando.

## Estado temporal de creacion

Durante una creacion incompleta:

- Los datos parciales pueden guardarse temporalmente.
- El estado parcial no representa una reserva confirmada.
- Al completar y confirmar la reserva, el estado temporal debe limpiarse.
- Si el flujo expira, el estado temporal incompleto debe limpiarse cuando aplique.

## Reglas de consistencia

Toda alta, baja o modificacion de reserva debe mantener estas garantias:

- No generar duplicados por reintentos.
- No confirmar reservas incompletas.
- No romper cupos de disponibilidad.
- No dejar datos temporales como si fueran reservas reales.
- No modificar reservas pasadas.
- No dejar disponibilidad desactualizada.
