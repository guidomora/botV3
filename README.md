# botV3 · Bot de reservas por WhatsApp

## 1) Que es este proyecto

`botV3` es un backend en `NestJS + TypeScript` para gestionar reservas de restaurante desde WhatsApp.

El sistema recibe mensajes entrantes desde `Twilio`, interpreta la intencion del usuario con `OpenAI`, ejecuta la logica de reservas y persiste los datos operativos en `Google Sheets`.

Objetivo principal:

- Permitir que una persona pueda conversar en lenguaje natural para:
  - crear una reserva,
  - consultar disponibilidad,
  - modificar una reserva,
  - cancelar una reserva,
  - o recibir una respuesta cuando el pedido esta fuera del alcance del bot.

---

## 2) Capacidades funcionales

### Flujos principales

1. **Crear reserva**
   - El bot identifica fecha, hora, nombre, telefono y cantidad de personas.
   - Si faltan datos, los pide de forma progresiva.
   - Cuando estan completos, intenta crear la reserva en la hoja principal.

2. **Consultar disponibilidad**
   - Puede responder disponibilidad por dia completo o por franja horaria puntual.
   - Si no hay lugar exacto, puede sugerir horarios cercanos.

3. **Modificar reserva**
   - Primero identifica la reserva original.
   - Luego solicita y aplica los cambios.
   - Revalida capacidad antes de confirmar.

4. **Cancelar reserva**
   - Recolecta los datos minimos para ubicar la reserva.
   - Elimina o limpia la fila segun corresponda y recalcula disponibilidad.

5. **Otro / fuera de alcance**
   - Cuando la intencion no corresponde a una operacion soportada, responde de manera orientativa.

6. **Mantener agenda abierta automaticamente**
   - Verifica cuantos dias futuros de agenda ya existen en Google Sheets.
   - Si la cobertura es menor al objetivo configurado, crea unicamente los dias faltantes.

7. **Limpiar historial viejo de agenda automaticamente**
   - Elimina filas anteriores a una ventana historica configurable.
   - Si no hay filas viejas para borrar, no elimina nada y deja trazabilidad por logs.

---

## 3) Arquitectura logica

### Componentes clave

- **Modulo WhatsApp**
  - Endpoint webhook `POST /bot/communication/queue`.
  - Guards de seguridad: firma Twilio, idempotencia y rate limit.
  - Buffer de mensajes para agrupar texto enviado en rafaga y procesarlo como una sola intencion.

- **Modulo Reservations**
  - Orquestador conversacional.
  - Router de intenciones con estrategia por flujo: `create`, `update`, `cancel`, `availability`, `other`.

- **Modulo AI**
  - Clasificacion de intencion y generacion de respuestas.
  - Prompts especializados por caso de uso.

- **Modulo Dates**
  - Casos de uso de negocio para crear, actualizar y eliminar reservas.
  - Sincronizacion de ventana de agenda futura.
  - Endpoints manuales protegidos para operacion.

- **Modulo Google Sheets**
  - Persistencia de reservas y disponibilidad en hojas.
  - Calculo de capacidad real por solapamiento temporal de reservas.

- **Modulo Billing Usage**
  - Persistencia en PostgreSQL de cuenta, plan, suscripcion y consumo mensual.
  - Limite mensual de reservas creadas desde WhatsApp.
  - Consumo atomico de cupo antes de confirmar nuevas reservas por WhatsApp.

- **Modulo Cache Context**
  - Historial conversacional por usuario.
  - Estado temporal por flujo.
  - Expiracion automatica y limpieza de conversaciones incompletas.

- **Modulo Health**
  - Endpoints protegidos `GET /bot/health/live` y `GET /bot/health/ready`.
  - Validacion de secret y rate limit para monitoreo operativo.
  - Readiness extendido para validar Google Sheets, PostgreSQL y la conectividad base de Redis cuando `reservation-jobs` este habilitado.

---

## 4) Flujo end-to-end

1. Twilio envia un webhook al endpoint del bot.
2. Se valida seguridad de ingreso:
   - firma Twilio,
   - deduplicacion por reintentos,
   - limite de frecuencia,
   - tamano maximo de request.
3. Si el mensaje es multimedia no soportado, se responde pidiendo texto.
4. Los mensajes de un mismo usuario se agregan en un buffer breve.
5. Se envia al orquestador:
   - guarda contexto en cache,
   - detecta intencion con IA,
   - ejecuta estrategia de negocio.
6. Para nuevas reservas completas desde WhatsApp, se consume cupo mensual en PostgreSQL antes de encolar la creacion.
7. La estrategia interactua con Google Sheets para leer o escribir reservas y disponibilidad.
8. Se genera respuesta final y se envia por Twilio al usuario.

Nota operativa:

- Todas las rutas HTTP publicas estan bajo el prefijo global `/bot`.
- Para Twilio, la URL del webhook debe apuntar a `https://<tu-dominio-o-ngrok>/bot/communication/queue`.
- Para los workflows operativos de agenda, `API_BASE_URL` debe incluir el prefijo global. Ejemplo: `https://<tu-dominio-o-ngrok>/bot`.

---

## 5) Logica de negocio de reservas

### 5.1 Datos requeridos para crear

Para una reserva completa se necesitan:

- fecha,
- hora,
- nombre,
- telefono,
- cantidad de personas,
- tipo de servicio o intencion.

Si faltan campos, la reserva queda temporalmente en estado parcial y el bot continua solicitando unicamente lo faltante.

### 5.2 Regla de duplicidad por dia

Un mismo telefono no puede tener mas de una reserva para el mismo dia.

- Si detecta duplicado, no crea una nueva y sugiere modificar la existente.

### 5.3 Fechas y horarios pasados

No se permite:

- crear reservas en fecha u hora pasada,
- mover una reserva a fecha u hora pasada,
- modificar una reserva cuya fecha u hora original ya paso.

### 5.4 Capacidad y disponibilidad

La disponibilidad depende de capacidad efectiva:

- `MAX_CAPACITY_TOTAL`
- `ONLINE_BUFFER_PERCENT`
- `RESERVATION_DURATION_MINUTES`

Formula:

- `capacidad_online = floor(MAX_CAPACITY_TOTAL * (1 - buffer))`

Solo se confirma si:

- `ocupacion_solapada + personas_solicitadas <= capacidad_online`

### 5.5 Limite por tamano de grupo

Existe un umbral para reservas grandes:

- `MAX_PEOPLE_PER_RESERVATION` default `12`

Si la cantidad supera ese valor:

- la reserva no se gestiona automaticamente,
- se deriva a atencion directa,
- opcionalmente se muestra `LARGE_RESERVATION_CONTACT_NUMBER`.

### 5.6 Hoja temporal de conversacion

Durante la creacion, los datos parciales se guardan en una hoja temporal.
Cuando la reserva se completa:

- se migra a la hoja principal,
- se elimina la fila temporal.

---

## 6) Seguridad y resiliencia

### 6.1 Verificacion de firma Twilio

Todo webhook entrante valida `x-twilio-signature` contra la URL publica y los parametros recibidos.

### 6.2 Idempotencia de webhooks

Twilio puede reintentar envios. Para evitar doble procesamiento:

- se deduplica por `AccountSid + MessageSid`,
- si ya se proceso, se responde `200 { ok: true }`,
- TTL configurable: `IDEMPOTENCY_MESSAGE_SID_TTL_MS`.

### 6.3 Rate limit anti-spam

Control por `waId` con historial en cache.

Variables principales:

- `RATE_LIMIT_SHORT_WINDOW_MS`
- `RATE_LIMIT_SHORT_WINDOW_LIMIT`
- `RATE_LIMIT_LONG_WINDOW_MS`
- `RATE_LIMIT_LONG_WINDOW_LIMIT`
- `RATE_LIMIT_BLOCK_WINDOW_MS`
- `RATE_LIMIT_NOTIFY_COOLDOWN_MS`

### 6.4 Tamano maximo de request

El webhook rechaza requests por encima del limite configurado.

### 6.5 Manejo de errores de proveedores

Errores temporales de OpenAI o Google Sheets se encapsulan como errores de proveedor y el usuario recibe un mensaje de contingencia.

### 6.6 Endpoints operativos protegidos

- Los endpoints manuales del modulo `dates` estan protegidos.
- Los endpoints de agenda automatica requieren firma HMAC con `AGENDA_SYNC_SECRET`.
- Los health checks requieren header secreto y tienen rate limit.

---

## 7) Gestion de contexto conversacional

El bot mantiene historial por usuario para mejorar la comprension de contexto e intencion activa.

TTL de ciclo conversacional:

- flujo en progreso: `3h`
- flujo completado: `2h`
- limite duro total: `6h`

Al expirar:

- limpia estado de cache,
- si habia flujo incompleto, elimina la reserva temporal incompleta,
- opcionalmente notifica al usuario por WhatsApp.

---

## 8) Estructura de datos en Google Sheets

El sistema trabaja con tres vistas principales:

1. **Hoja de reservas**: reservas confirmadas.
2. **Hoja de disponibilidad**: disponibilidad por franja.
3. **Hoja temporal**: estado parcial de reservas en construccion.

Despues de cada alta, baja o modificacion:

- se recalcula ocupacion,
- se actualizan cupos disponibles,
- se mantiene consistencia entre reservas y disponibilidad.

---

## 9) Variables de entorno relevantes

### Twilio

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` o `TWILIO_MESSAGING_SERVICE_SID`

### OpenAI

- `OPEN_AI`
- `PROJECT_ID` opcional
- `GPT_MODEL`

### Google Sheets

- `SPREADSHEET_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

### PostgreSQL / billing usage

- `DATABASE_HOST` default `localhost`
- `DATABASE_PORT` default `5432`
- `DATABASE_USER` default `botv3`
- `DATABASE_PASSWORD` default `botv3`
- `DATABASE_NAME` default `botv3`
- `DATABASE_SSL` default `false`

### Redis / reservation-jobs

- `RESERVATION_JOBS_ENABLED` habilita la infraestructura base de Redis para futuros jobs de reservas.
- `REDIS_URL` recomendado cuando exista una URL unica de conexion.
- `REDIS_HOST` y `REDIS_PORT` como alternativa explicita.
- `REDIS_USERNAME` y `REDIS_PASSWORD` opcionales segun proveedor.
- `REDIS_DB`
- `REDIS_TLS_ENABLED`
- Compatibilidad Railway: tambien se aceptan `REDISHOST`, `REDISPORT`, `REDISUSER` y `REDISPASSWORD`.

### Reglas de negocio y agenda

- `MAX_CAPACITY_TOTAL`
- `ONLINE_BUFFER_PERCENT`
- `RESERVATION_DURATION_MINUTES`
- `SLOT_INTERVAL_MINUTES`
- `MAX_PEOPLE_PER_RESERVATION`
- `LARGE_RESERVATION_CONTACT_NUMBER`
- `AGENDA_DAYS_AHEAD`
- `AGENDA_DAYS_BACK_TO_KEEP`
- `AGENDA_SYNC_SECRET`
- `AGENDA_SYNC_MAX_TIME_SKEW_MS`
- `AGENDA_SYNC_RATE_LIMIT_WINDOW_MS`
- `AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS`
- `DATES_MANUAL_RATE_LIMIT_WINDOW_MS`
- `DATES_MANUAL_RATE_LIMIT_MAX_REQUESTS`

### Seguridad operativa

- `HEALTH_CHECK_SECRET`
- `HEALTH_CHECK_RATE_LIMIT_MAX_REQUESTS`
- `IDEMPOTENCY_MESSAGE_SID_TTL_MS`
- `RATE_LIMIT_SHORT_WINDOW_MS`
- `RATE_LIMIT_SHORT_WINDOW_LIMIT`
- `RATE_LIMIT_LONG_WINDOW_MS`
- `RATE_LIMIT_LONG_WINDOW_LIMIT`
- `RATE_LIMIT_BLOCK_WINDOW_MS`
- `RATE_LIMIT_NOTIFY_COOLDOWN_MS`

### Deploy

- `PORT`
- `NODE_ENV`
- `API_BASE_URL` base publica del despliegue incluyendo `/bot` para workflows operativos

### Dependencias locales

- Para desarrollo local se incluye `docker-compose.yml` con Redis y PostgreSQL.
- Levantar dependencias locales con `docker compose up -d`.
- `docker-compose.redis.yml` queda disponible temporalmente si solo se necesita Redis.
- Ejemplo minimo local:
  - `RESERVATION_JOBS_ENABLED=true`
  - `REDIS_URL=redis://localhost:6379`
  - `DATABASE_HOST=localhost`
  - `DATABASE_PORT=5432`

### Migraciones PostgreSQL

- Generar migracion: `npm run migration:generate`
- Ejecutar migraciones: `npm run migration:run`
- Revertir ultima migracion: `npm run migration:revert`
- La migracion inicial crea un `account` default, un plan `mvp_default` y una suscripcion activa de MVP para evitar que el flujo WhatsApp quede bloqueado en una DB nueva.

---

## 10) Endpoints operativos

- `POST /bot/communication/queue`
  - Webhook de Twilio para mensajes entrantes.
- `GET /bot/health/live`
  - Liveness check protegido por secret.
- `GET /bot/health/ready`
  - Readiness check protegido por secret.
- `POST /bot/dates/ensure-agenda-window`
  - Endpoint firmado para mantener abierta la ventana de agenda.
- `DELETE /bot/dates/delete-old-rows`
  - Endpoint firmado para borrar filas historicas fuera de retencion.
- `POST /bot/dates`
- `POST /bot/dates/next-date`
- `POST /bot/dates/x-dates`
  - Endpoints manuales protegidos para operacion y mantenimiento.

---

## 10.1) Swagger / OpenAPI

- La API expone documentacion interactiva en `GET /bot/docs`.
- El documento OpenAPI en JSON queda disponible en `GET /bot/docs-json`.
- La documentacion incluye:
  - payload del webhook de Twilio,
  - headers de seguridad requeridos para health checks y endpoints operativos,
  - respuestas principales y errores mas relevantes.

---

## 11) Resumen ejecutivo

Este proyecto implementa un asistente transaccional de reservas por WhatsApp con:

- procesamiento de lenguaje natural,
- logica de negocio de restaurante,
- automatizacion para mantener la agenda abierta,
- automatizacion para borrar filas historicas,
- controles de seguridad para webhooks y endpoints operativos,
- y consistencia operativa sobre Google Sheets.

Es una solucion orientada a operacion real en entorno controlado: robusta ante reintentos, resistente al spam y preparada para pruebas integradas con Twilio y un despliegue publico.
