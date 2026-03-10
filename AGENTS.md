# AGENTS.md

Guía operativa para agentes de IA trabajando en **botV3**.

### Idea del proyecto:

- Toda la logica del proyecto y de negocio se encuentra en el README.md 

## 1) Objetivo del repositorio

- Proyecto backend con **NestJS + TypeScript** para un bot (integraciones con Twilio/OpenAI/Google Sheets).
- Código principal en `src/` y pruebas e2e en `test/`.

## 2) Flujo de trabajo recomendado

1. Entender el requerimiento y limitar cambios al alcance pedido.
2. Revisar archivos relacionados antes de editar.
3. Hacer cambios pequeños y coherentes con el estilo existente.
4. Ejecutar validaciones mínimas antes de cerrar (lint/tests según impacto).
5. Dejar resumen claro de qué cambió y por qué.

## 3) Convenciones de código

- Mantener TypeScript estricto y tipado explícito cuando agregues APIs/contratos.
- No usar Any, salvo que sea un caso extremo.
- Respetar estructura por módulos de Nest (`module`, `controller`, `service`, `application`, `entities`, `utils`).
- Reutilizar utilidades/constantes existentes en `src/constants` y `src/lib/helpers` antes de crear nuevas.
- Las interfaces, types o enums se crean en lib > types.
- Evitar refactors no solicitados.
- No introducir nuevas dependencias salvo necesidad clara.
- Los nombres de archivos, variables, metodos, funciones, etc deben ser descriptivos.
- Mantener la estructura del proyecto respetando los módulos de Nest, controllers, services, etc.
- Utilizar patrones de diseño cuando sea necesario.
- Seguir las mejores prácticas de desarrollo DRY, SOLID, ETC (easy to change), etc.
- No hagas cambios donde por ejemplo que acomodes espacios, lineas vacias sin motivo o agregar "enters" innecesarios.
- Cada interface, type, enum debe ser creado en la carpeta lib > types. Nunca deben ser creados en los archivos de los controllers, services, etc.

## 4) Testing y validación

- Todavia no se implementan tests, los files existentes son erroneos o estan incompletos

## 5) Seguridad y configuración

- No commitear secretos ni credenciales.
- Si se agregan variables de entorno nuevas, documentarlas en el PR y en el archivo de ejemplo correspondiente (si existe).

## 6) Regla de comunicación

- Responder en español, claro y accionable.
- Incluir: resumen de cambios, archivos tocados, validaciones ejecutadas y próximos pasos sugeridos (si aplican).
