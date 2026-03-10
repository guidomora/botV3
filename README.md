# botV3 · Bot de reservas por WhatsApp

## 1) ¿Qué es este proyecto?

**botV3** es un backend en **NestJS + TypeScript** para gestionar reservas de restaurante desde WhatsApp.

El sistema recibe mensajes entrantes desde **Twilio**, interpreta la intención del usuario con **OpenAI**, orquesta la lógica de negocio de reservas y persiste los datos operativos en **Google Sheets**.

Objetivo principal:
- Permitir que una persona pueda conversar en lenguaje natural para:
  - crear una reserva,
  - consultar disponibilidad,
  - modificar una reserva,
  - cancelar una reserva,
  - o recibir una respuesta cuando el pedido está fuera del alcance del bot.

---

## 2) Capacidades funcionales

### Flujos principales

1. **Crear reserva**
   - El bot identifica los datos necesarios: fecha, hora, nombre, teléfono y cantidad de personas.
   - Si faltan datos, los solicita de forma progresiva.
   - Cuando están completos, intenta crear la reserva en la hoja principal.

2. **Consultar disponibilidad**
   - Puede responder disponibilidad por día completo o por franja horaria puntual.
   - Si no hay lugar exacto, puede sugerir horarios cercanos.

3. **Modificar reserva**
   - Primero identifica la reserva original (nombre + teléfono + fecha + hora).
   - Luego solicita y aplica los cambios (nuevo horario, fecha, nombre y/o cantidad).
   - Revalida capacidad antes de confirmar.

4. **Cancelar reserva**
   - Recolecta los datos mínimos para ubicar la reserva.
   - Elimina o limpia la fila según corresponda y recalcula disponibilidad.

5. **Otro / fuera de alcance**
   - Cuando la intención no corresponde a una operación soportada, responde de manera orientativa y amable.

---

## 3) Arquitectura lógica

### Componentes clave

- **Módulo WhatsApp**
  - Endpoint webhook `POST /communication/queue`.
  - Guards de seguridad (firma Twilio, idempotencia, rate limit).
  - Buffer de mensajes para agrupar texto enviado en ráfaga y procesarlo como una intención unificada.

- **Módulo Reservations**
  - Orquestador conversacional.
  - Router de intenciones con estrategia por flujo (`create`, `update`, `cancel`, `availability`, `other`).

- **Módulo AI**
  - Clasificación de intención y generación de respuestas en lenguaje natural.
  - Prompts especializados por caso de uso.

- **Módulo Dates**
  - Casos de uso de negocio para crear, actualizar y eliminar reservas.
  - Validaciones de duplicidad, fecha pasada, cupo, capacidad y reglas de reserva grande.

- **Módulo Google Sheets**
  - Persistencia de reservas y disponibilidad en hojas.
  - Cálculo de capacidad real por solapamiento temporal de reservas.

- **Módulo Cache Context**
  - Historial conversacional por usuario.
  - Estado temporal por flujo (create/cancel/update).
  - Expiración automática y limpieza de conversaciones incompletas.

---

## 4) Flujo end-to-end (de punta a punta)

1. Twilio envía un webhook al endpoint del bot.
2. Se valida seguridad de ingreso:
   - firma Twilio,
   - deduplicación por reintentos,
   - límite de frecuencia de mensajes,
   - tamaño máximo de request.
3. Si el mensaje es multimedia no soportado (audio/imagen), se responde con instrucción de enviar texto.
4. Los mensajes de un mismo usuario se agregan en un buffer breve para reducir fragmentación.
5. Se envía al orquestador:
   - guarda contexto en cache,
   - detecta intención con IA,
   - ejecuta estrategia de negocio correspondiente.
6. La estrategia interactúa con Google Sheets para leer/escribir reservas y disponibilidad.
7. Se genera respuesta final y se envía por Twilio al usuario.

---

## 5) Lógica de negocio de reservas

### 5.1 Datos requeridos para crear

Para una reserva completa se necesitan:
- fecha,
- hora,
- nombre,
- teléfono,
- cantidad de personas,
- tipo de servicio/intención.

Si faltan campos, la reserva queda temporalmente en estado parcial y el bot continúa solicitando únicamente lo faltante.

### 5.2 Regla de duplicidad por día

Un mismo teléfono no puede tener más de una reserva para el mismo día (regla anti-duplicado de jornada).
- Si detecta duplicado, no crea una nueva y sugiere modificar la existente.

### 5.3 Fechas y horarios pasados

No se permite:
- crear reservas en fecha/hora ya pasada,
- mover una reserva a una fecha/hora pasada,
- modificar una reserva cuya fecha/hora original ya pasó.

### 5.4 Capacidad y disponibilidad

La disponibilidad no depende solo de una celda fija, sino de capacidad efectiva:
- Se calcula una **capacidad máxima online** usando:
  - `MAX_CAPACITY_TOTAL` (capacidad total del local),
  - `ONLINE_BUFFER_PERCENT` (porcentaje reservado fuera del canal online).
- Fórmula:
  - `capacidad_online = floor(MAX_CAPACITY_TOTAL * (1 - buffer))`.
- Al evaluar una reserva, se consideran reservas **solapadas** en una ventana temporal de duración configurable (`RESERVATION_DURATION_MINUTES`, default 120).
- Solo se confirma si:
  - `ocupación_solapada + personas_solicitadas <= capacidad_online`.

Esto evita sobreventa cuando dos turnos se superponen en el tiempo.

### 5.5 Límite por tamaño de grupo

Existe un umbral para reservas grandes:
- `MAX_PEOPLE_PER_RESERVATION` (default 12).
- Si la cantidad solicitada supera ese valor:
  - la reserva no se gestiona automáticamente,
  - se deriva a atención directa,
  - opcionalmente se muestra `LARGE_RESERVATION_CONTACT_NUMBER`.

### 5.6 Hoja temporal de conversación

Durante la creación, los datos parciales se guardan en una hoja temporal.
Cuando la reserva se completa y se confirma:
- se migra a la hoja principal,
- se elimina la fila temporal.

Esto permite continuidad en conversaciones multi-turno sin perder contexto.

---

## 6) Seguridad y resiliencia

### 6.1 Verificación de firma Twilio

Todo webhook entrante valida `x-twilio-signature` contra la URL pública y parámetros recibidos.
Si la firma no es válida, se rechaza la solicitud.

### 6.2 Idempotencia de webhooks

Twilio puede reintentar envíos. Para evitar doble procesamiento:
- se deduplica por `AccountSid + MessageSid`,
- si ya se procesó, se responde `200 { ok: true }` sin reprocesar.
- TTL configurable: `IDEMPOTENCY_MESSAGE_SID_TTL_MS` (default 24h).

### 6.3 Rate limit (anti-spam)

El control se aplica por `waId` con historial en cache.
Reglas por defecto:
- **10 mensajes en 30 segundos** → bloqueo temporal.
- **30 mensajes en 10 minutos** → bloqueo temporal.
- Duración de bloqueo: **3 minutos**.
- Cooldown de notificación al usuario: **60 segundos** (evita repetir aviso constantemente).

Todos los valores son configurables:
- `RATE_LIMIT_SHORT_WINDOW_MS`
- `RATE_LIMIT_SHORT_WINDOW_LIMIT`
- `RATE_LIMIT_LONG_WINDOW_MS`
- `RATE_LIMIT_LONG_WINDOW_LIMIT`
- `RATE_LIMIT_BLOCK_WINDOW_MS`
- `RATE_LIMIT_NOTIFY_COOLDOWN_MS`

### 6.4 Límite de tamaño de request

Para proteger el webhook:
- alerta al acercarse al límite,
- rechaza requests por encima de `MAX_REQUEST_BODY_SIZE_BYTES` (100 KB default).

### 6.5 Manejo de errores de proveedores

Errores temporales de OpenAI o Google Sheets se encapsulan como errores de proveedor y el usuario recibe un mensaje de contingencia, evitando exponer trazas internas.

---

## 7) Gestión de contexto conversacional

El bot mantiene historial por usuario para mejorar comprensión de contexto e intención activa.

TTL de ciclo conversacional:
- **flujo en progreso**: 3h,
- **flujo completado**: 2h,
- **límite duro total**: 6h.

Al expirar:
- limpia estado de cache,
- si había flujo incompleto, elimina la reserva temporal incompleta,
- opcionalmente notifica al usuario por WhatsApp que la conversación expiró.

También se limita el tamaño del historial conversacional para mantener contexto útil y controlado.

---

## 8) Estructura de datos en Google Sheets (visión funcional)

El sistema trabaja con tres vistas principales:
1. **Hoja de reservas**: reservas confirmadas (fecha, hora, nombre, teléfono, cantidad).
2. **Hoja de disponibilidad**: disponibilidad por franja (ocupados/disponibles).
3. **Hoja temporal**: estado parcial de reservas en construcción.

Después de cada alta, baja o modificación:
- se recalcula ocupación,
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
- `PROJECT_ID` (opcional)
- `GPT_MODEL` (default `gpt-5-mini`)

### Google Sheets
- credenciales de service account + spreadsheet id (según provider del módulo)

### Reglas de negocio y capacidad
- `MAX_CAPACITY_TOTAL`
- `ONLINE_BUFFER_PERCENT`
- `RESERVATION_DURATION_MINUTES`
- `MAX_PEOPLE_PER_RESERVATION`
- `LARGE_RESERVATION_CONTACT_NUMBER`

### Seguridad operativa
- `IDEMPOTENCY_MESSAGE_SID_TTL_MS`
- `RATE_LIMIT_SHORT_WINDOW_MS`
- `RATE_LIMIT_SHORT_WINDOW_LIMIT`
- `RATE_LIMIT_LONG_WINDOW_MS`
- `RATE_LIMIT_LONG_WINDOW_LIMIT`
- `RATE_LIMIT_BLOCK_WINDOW_MS`
- `RATE_LIMIT_NOTIFY_COOLDOWN_MS`

---

## 10) Resumen ejecutivo

Este proyecto implementa un **asistente transaccional de reservas** por WhatsApp con:
- procesamiento de lenguaje natural,
- lógica de negocio de restaurante (cupos, duplicados, tiempos, reservas grandes),
- controles de seguridad para canales webhook (firma, idempotencia, rate limit, tamaño),
- y consistencia operativa sobre Google Sheets.

Es una solución orientada a operación real: robusta ante reintentos, resistente al spam y diseñada para mantener una conversación útil hasta completar (o cerrar) cada flujo.
