# Architecture Docs

Esta carpeta documenta la arquitectura tecnica del backend `botV3`.

El objetivo es darle a humanos y agentes un mapa rapido del sistema antes de tocar codigo. La documentacion de esta carpeta debe explicar como se conectan las piezas principales, donde vive el estado y que archivos conviene leer para entender cada flujo.

## Documentos

- `module-map.md`: responsabilidades, dependencias y archivos clave de cada modulo Nest.
- `request-flow.md`: flujo principal desde el webhook de WhatsApp hasta la respuesta al usuario.
- `data-and-state.md`: fuentes de datos, estado temporal, cache, jobs y reglas de consistencia.
- `security-and-resilience.md`: guards, rate limits, idempotencia, firmas, limites de request y manejo de fallos de proveedores.

## Alcance

Usar esta carpeta para:

- Entender boundaries entre modulos.
- Ubicar rapidamente el codigo relevante para un cambio.
- Documentar flujos tecnicos de alto nivel.
- Reducir contexto repetido en specs y planes de ejecucion.

No usar esta carpeta para:

- Reglas operativas generales del agente. Eso vive en `AGENTS.md`.
- Vision general del producto. Eso vive en `README.md`.
- Planes de implementacion activos o cerrados. Eso vive en `docs/exec-plans/`.
- Reglas de negocio detalladas que no dependen de la arquitectura. Eso deberia vivir en `docs/domain/` cuando exista.

## Relacion con otros documentos

`README.md` en la raiz sigue siendo la entrada principal del proyecto. Esta carpeta expande la seccion de arquitectura con mas detalle tecnico.

Cuando un agente necesite modificar comportamiento, el orden recomendado de lectura es:

1. `AGENTS.md`
2. `README.md`
3. `docs/architecture/README.md`
4. El documento especifico de esta carpeta que aplique al cambio.
5. Los archivos de codigo listados como referencia.
