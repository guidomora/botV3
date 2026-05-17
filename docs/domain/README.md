# Domain Docs

Esta carpeta documenta las reglas de negocio del bot de reservas.

El objetivo es separar lo que el negocio permite o prohibe de como esta implementado tecnicamente. Si una regla debe respetarse aunque cambien los modulos, servicios o proveedores, pertenece a esta carpeta.

## Documentos

- `reservation-rules.md`: reglas para crear, modificar y cancelar reservas.
- `availability-rules.md`: reglas de capacidad, disponibilidad, solapamientos y cierres.
- `conversation-rules.md`: reglas conversacionales para flujos multi-turno.
- `agenda-rules.md`: reglas operativas para mantener y limpiar la agenda.

## Alcance

Usar esta carpeta para:

- Entender reglas de negocio antes de modificar codigo.
- Evitar cambios que rompan comportamiento esperado del restaurante.
- Dar contexto estable a specs y planes de ejecucion.
- Documentar decisiones funcionales que no dependen de NestJS, Twilio, OpenAI o Google Sheets.

No usar esta carpeta para:

- Mapa de modulos, dependencias o rutas tecnicas. Eso vive en `docs/architecture/`.
- Instrucciones generales para agentes. Eso vive en `AGENTS.md`.
- Planes activos o completados. Eso vive en `docs/exec-plans/`.
- Detalles de configuracion local o deploy. Eso vive en `README.md` o futuros runbooks.

## Orden recomendado de lectura

Para cambios sobre comportamiento de reservas:

1. `docs/domain/reservation-rules.md`
2. `docs/domain/availability-rules.md`
3. `docs/domain/conversation-rules.md`
4. `docs/architecture/request-flow.md`
5. Archivos de codigo relacionados al flujo.

Para cambios operativos de agenda:

1. `docs/domain/agenda-rules.md`
2. `docs/domain/availability-rules.md`
3. `docs/architecture/data-and-state.md`
4. Archivos de codigo relacionados al flujo.
