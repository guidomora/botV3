# Workflow Docs

Esta carpeta documenta flujos concretos de negocio y operacion de punta a punta.

El objetivo es que una persona o agente pueda entender que pasos ejecuta el sistema para resolver un caso real, que estado lee o escribe, que validaciones aplica y que archivos conviene revisar antes de cambiar comportamiento.

## Documentos

- `whatsapp-create-reservation.md`: creacion de reserva desde WhatsApp.
- `whatsapp-update-reservation.md`: modificacion de reserva desde WhatsApp.
- `whatsapp-cancel-reservation.md`: cancelacion de reserva desde WhatsApp.
- `whatsapp-availability.md`: consulta de disponibilidad desde WhatsApp.
- `dashboard-reservations.md`: operaciones internas del dashboard de reservas.
- `agenda-maintenance.md`: mantenimiento manual y automatico de agenda.

## Alcance

Usar esta carpeta para:

- Entender el paso a paso de un flujo.
- Ver participantes tecnicos y reglas de negocio involucradas.
- Ubicar datos leidos y escritos.
- Revisar validaciones y contingencias esperadas.
- Preparar specs o exec-plans con contexto operacional.

No usar esta carpeta para:

- Reglas de negocio abstractas. Eso vive en `docs/domain/`.
- Mapa de modulos o detalles de guards en general. Eso vive en `docs/architecture/`.
- Planes activos o historicos. Eso vive en `docs/exec-plans/`.

## Formato recomendado

Cada workflow deberia incluir:

- Objetivo.
- Entrada.
- Participantes.
- Flujo feliz.
- Datos leidos.
- Datos escritos.
- Validaciones.
- Errores y contingencias.
- Archivos clave.
- Tests relacionados.

## Orden de lectura sugerido

Antes de cambiar un workflow:

1. Leer el documento de este directorio que aplique.
2. Leer las reglas de `docs/domain/` relacionadas.
3. Leer los documentos de `docs/architecture/` relacionados.
4. Revisar codigo y tests listados en el workflow.
