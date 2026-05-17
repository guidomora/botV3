# Agenda Rules

Este documento define reglas de negocio y operacion para la agenda del restaurante.

## Objetivo

La agenda debe mantenerse disponible para reservas futuras y conservar solo el historial operativo necesario.

El sistema soporta:

- Creacion manual de dias.
- Creacion automatica de dias futuros faltantes.
- Limpieza automatica de filas historicas.
- Cierre y reapertura de dias.
- Cierre y reapertura de franjas horarias.

## Ventana futura de agenda

La agenda debe mantener una cantidad configurable de dias futuros.

Variable principal:

- `AGENDA_DAYS_AHEAD`

Reglas:

- El sistema debe verificar cuantos dias futuros existen.
- Si la cobertura es menor al objetivo, debe crear solo los dias faltantes.
- No debe duplicar dias existentes.
- No debe recrear toda la agenda si solo faltan algunos dias.

## Creacion manual de dias

Los endpoints manuales permiten tareas operativas puntuales.

Casos soportados:

- Crear un nuevo dia.
- Crear el proximo dia faltante.
- Crear multiples dias futuros.

Reglas:

- Deben estar protegidos.
- Deben respetar rate limit operativo.
- No deben exponer operaciones publicas sin firma o secret.

## Limpieza de historial viejo

La agenda puede eliminar filas anteriores a una ventana historica configurable.

Variable principal:

- `AGENDA_DAYS_BACK_TO_KEEP`

Reglas:

- Deben eliminarse filas anteriores a la ventana de retencion.
- Si no hay filas viejas, no debe eliminarse nada.
- Debe dejarse trazabilidad por logs.
- La limpieza no debe afectar reservas o disponibilidad dentro de la ventana vigente.

## Dias cerrados

Un dia cerrado representa una decision operativa de no aceptar reservas en esa fecha.

Reglas:

- Debe bloquear nuevas reservas.
- Debe bloquear modificaciones hacia ese dia.
- Puede requerir notificar reservas afectadas si el cierre impacta reservas existentes.
- Reabrir el dia elimina ese bloqueo general.

## Franjas cerradas

Una franja cerrada bloquea un rango horario dentro de un dia.

Reglas:

- Debe bloquear nuevas reservas dentro del rango.
- Debe bloquear modificaciones hacia el rango.
- Puede coexistir con otras franjas cerradas del mismo dia.
- Reabrir una franja debe respetar otros cierres que sigan vigentes.

## Consistencia con disponibilidad

Cada operacion de agenda debe mantener coherencia con disponibilidad.

Operaciones que impactan disponibilidad:

- Crear dias nuevos.
- Limpiar dias historicos.
- Cerrar dia.
- Reabrir dia.
- Cerrar franja.
- Reabrir franja.
- Crear, modificar o cancelar reservas.

Regla general:

- La disponibilidad visible debe representar el estado actual de agenda, cierres y reservas.

## Operaciones automaticas

Las operaciones automaticas de agenda deben estar protegidas por firma.

Reglas:

- Deben validar timestamp.
- Deben validar firma HMAC.
- Deben rechazar replays fuera de ventana permitida.
- Deben aplicar rate limit.
- Deben usar una base publica que incluya el prefijo `/bot` cuando se invoquen desde workflows externos.

Variables relevantes:

- `AGENDA_SYNC_SECRET`
- `AGENDA_SYNC_MAX_TIME_SKEW_MS`
- `AGENDA_SYNC_RATE_LIMIT_WINDOW_MS`
- `AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS`
- `API_BASE_URL`

## Reglas de seguridad operativa

La agenda no debe poder modificarse desde endpoints publicos sin proteccion.

Las operaciones manuales y automaticas deben:

- Estar autenticadas.
- Tener limite de frecuencia.
- Ser idempotentes cuando el caso lo requiera.
- Evitar efectos destructivos fuera de la ventana esperada.

## Criterios para modificar esta logica

Antes de cambiar reglas de agenda, revisar:

1. Si el cambio afecta disponibilidad.
2. Si el cambio afecta reservas existentes.
3. Si el cambio requiere notificaciones.
4. Si el cambio altera limpieza historica.
5. Si el cambio necesita nuevas variables de entorno.
6. Si el cambio modifica seguridad de endpoints operativos.
