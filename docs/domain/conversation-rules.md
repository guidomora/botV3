# Conversation Rules

Este documento define reglas conversacionales del bot de reservas por WhatsApp.

## Objetivo conversacional

El bot debe ayudar a una persona a completar una operacion soportada:

- Crear reserva.
- Consultar disponibilidad.
- Modificar reserva.
- Cancelar reserva.
- Responder de forma orientativa cuando el pedido esta fuera de alcance.

El bot debe mantener continuidad entre mensajes del mismo usuario cuando hay un flujo activo.

## Datos faltantes

Cuando faltan datos para completar una operacion:

- El bot debe pedir solo los datos faltantes.
- No debe repetir preguntas por datos que ya fueron extraidos o confirmados.
- Debe conservar el contexto del flujo activo.
- Debe evitar cambiar de intencion si el mensaje nuevo completa el flujo actual.

Ejemplo:

- Si ya conoce fecha y cantidad, pero falta nombre y hora, debe pedir nombre y hora.
- Si el usuario responde solo la hora, debe conservar fecha y cantidad.

## Mensajes en rafaga

Los mensajes enviados en rafaga por el mismo usuario deben agruparse antes de procesar la intencion.

Objetivo:

- Evitar responder antes de que el usuario termine de escribir.
- Interpretar como una sola solicitud mensajes consecutivos del mismo contexto.

## Intencion activa

Cuando hay una intencion activa:

- El bot debe intentar continuar el flujo actual.
- Si el usuario aporta datos compatibles con el flujo, debe integrarlos.
- Si el usuario cambia claramente de intencion, puede reencaminar el flujo.
- Si hay ambiguedad, debe pedir aclaracion.

## Fuera de alcance

Cuando el pedido no corresponde a una operacion soportada:

- El bot debe responder de forma orientativa.
- No debe inventar capacidades.
- No debe ejecutar operaciones de reserva.
- Puede guiar al usuario hacia las acciones disponibles.

## Multimedia no soportada

Si el usuario envia multimedia no soportada:

- El bot debe pedir texto.
- No debe iniciar ni modificar operaciones usando contenido que no puede interpretar.
- Debe responder sin romper el flujo conversacional existente.

## Errores temporales de proveedor

Si falla temporalmente un proveedor como OpenAI, Twilio o Google Sheets:

- El usuario debe recibir una respuesta de contingencia cuando aplique.
- No debe confirmarse una reserva si la persistencia no fue exitosa.
- No debe informarse disponibilidad si no pudo validarse correctamente.

## Expiracion de conversacion

El bot mantiene contexto por usuario con TTL.

Valores documentados:

- Flujo en progreso: 3h.
- Flujo completado: 2h.
- Limite duro total: 6h.

Cuando una conversacion expira:

- Debe limpiarse el estado de cache.
- Si habia una reserva temporal incompleta, debe eliminarse cuando aplique.
- Puede notificarse al usuario por WhatsApp.

## Tono y claridad

Las respuestas deben:

- Ser claras.
- Pedir accion concreta cuando falten datos.
- Evitar tecnicismos internos.
- No exponer detalles de proveedores, hojas o errores internos.
- No confirmar acciones que no se completaron.

## Reglas de seguridad conversacional

El bot no debe:

- Confirmar reservas sin datos suficientes.
- Cancelar reservas ambiguas.
- Modificar reservas sin localizar la reserva original.
- Crear reservas duplicadas por reintentos.
- Tratar multimedia no soportada como texto valido.
- Ocultar errores operativos como si la operacion hubiera salido bien.
