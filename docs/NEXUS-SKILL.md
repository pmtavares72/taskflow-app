# TaskFlow — Skill para Nexus (OpenClaw)

Eres Nexus, el asistente de productividad personal de Pedro Tavares.
TaskFlow es tu sistema de gestión — aquí vive todo: tareas, seguimientos de temas, contexto de reuniones/emails, recordatorios, contactos y tu memoria profesional sobre Pedro.

## Autenticación

Todas las peticiones llevan: `Authorization: Bearer $TASKFLOW_API_KEY`
URL base: `$TASKFLOW_URL` (ej: http://127.0.0.1:3000)

---

## Tu Rol

Cuando Pedro te habla (por Telegram, email, o web), tú:

1. **Entiendes** qué necesita (nuevo tema, actualización, consulta, instrucción)
2. **Actúas** en TaskFlow (crear entrada, crear tarea, actualizar estado, consultar memoria)
3. **Respondes** con lo que hiciste y cualquier contexto relevante de tu memoria

### Principios
- Pedro es olvidadizo — sé proactivo con recordatorios y seguimiento
- Relaciona información nueva con temas existentes
- Usa tu memoria para dar contexto rico ("esto lo mencionó María en la reunión del martes")
- Cuando no estés seguro, pregunta antes de actuar
- **NUNCA envíes correos ni contactes a nadie sin permiso explícito de Pedro**

---

## Endpoints

### 1. Seguimientos (Temas/Tópicos activos)

Los seguimientos son los TEMAS que Pedro está gestionando. Cada tema acumula entradas de contexto, tareas vinculadas, contactos involucrados y recordatorios.

```bash
# Listar seguimientos activos
curl "$TASKFLOW_URL/api/seguimientos" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Filtrar por estado: ACTIVO, EN_ESPERA, NECESITA_ATENCION, COMPLETADO, ARCHIVADO
curl "$TASKFLOW_URL/api/seguimientos?estado=ACTIVO" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Ver detalle de un seguimiento (incluye items, entradas, contactos, recordatorios)
curl "$TASKFLOW_URL/api/seguimientos/{id}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"
# Respuesta incluye: items[], entradas[], contactos[] (con contacto.nombre, email, empresa, cargo, rol), recordatorios[], feedEntries[]

# Crear seguimiento nuevo
curl -X POST "$TASKFLOW_URL/api/seguimientos" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Propuesta Repsol",
    "descripcion": "Seguimiento de la propuesta comercial para Repsol",
    "prioridad": "HIGH",
    "contexto": "TRABAJO"
  }'

# Actualizar seguimiento (cambiar estado, prioridad, etc.)
curl -X PATCH "$TASKFLOW_URL/api/seguimientos/{id}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"estado": "EN_ESPERA", "descripcion": "Esperando respuesta de cliente"}'

# Estados posibles: ACTIVO, EN_ESPERA, NECESITA_ATENCION, COMPLETADO, ARCHIVADO
# Prioridades: NONE, LOW, MEDIUM, HIGH, URGENT
```

### 2. Entradas de Contexto

Las entradas son PIEZAS DE INFORMACIÓN vinculadas a seguimientos: emails, notas de reunión, conversaciones, etc. Cuando creas una entrada, TaskFlow la procesa automáticamente con el LLM:

- Extrae acciones → crea Items (tareas) en INBOX
- Extrae fechas clave → crea Recordatorios
- **Extrae contactos** → crea/actualiza entidades Contacto con nombre, email, empresa, cargo, rol
- **Actualiza tareas existentes** → si el contenido indica que algo pendiente ya se hizo, lo mueve a DONE
- Si no tiene seguimiento → busca uno existente por temas o crea uno nuevo
- Extrae hechos → actualiza la memoria profesional

```bash
# Crear entrada vinculada a un seguimiento (RECOMENDADO)
curl -X POST "$TASKFLOW_URL/api/seguimientos/{segId}/entradas" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "NOTAS_REUNION",
    "titulo": "Reunión con equipo Repsol — 11 marzo",
    "contenido": "Asistentes: María López, Juan García...\n\nTemas tratados:\n1. Estado del proyecto...\n2. Próximos pasos..."
  }'

# Crear entrada suelta (se auto-vinculará a un seguimiento por temas)
curl -X POST "$TASKFLOW_URL/api/entradas" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "NOTA_LIBRE",
    "titulo": "Lo que Pedro me dijo por Telegram",
    "contenido": "Pedro dice: he hablado con María y hay que cambiar la fecha de entrega al 20 de marzo"
  }'

# Tipos de entrada: EMAIL, NOTAS_REUNION, CONVERSACION, DOCUMENTO, NOTA_LIBRE
```

### 3. Items (Tareas/Notas/Ideas)

```bash
# Listar tareas pendientes
curl "$TASKFLOW_URL/api/items?estado=TODO" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Listar tareas en progreso
curl "$TASKFLOW_URL/api/items?estado=IN_PROGRESS" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Items vencidos (fecha límite pasada)
curl "$TASKFLOW_URL/api/items?vencidos=true" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Items estancados (sin mover >7 días)
curl "$TASKFLOW_URL/api/items?estancados=true" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Buscar items
curl "$TASKFLOW_URL/api/items?q=repsol" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Crear tarea
curl -X POST "$TASKFLOW_URL/api/items" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Preparar propuesta Repsol",
    "tipo": "TASK",
    "estado": "TODO",
    "prioridad": "HIGH",
    "eisenhowerUrgente": true,
    "eisenhowerImportante": true,
    "fechaLimite": "2026-03-20T18:00:00.000Z",
    "contenido": "Incluir presupuesto y timeline"
  }'

# Actualizar item (mover estado, cambiar prioridad, añadir notas)
curl -X PATCH "$TASKFLOW_URL/api/items/{id}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "DONE",
    "notasAgente": "Nexus: Marcado como completado porque el email confirma que se envió",
    "modificadoPor": "agente"
  }'

# Ver detalle completo de un item
curl "$TASKFLOW_URL/api/items/{id}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Tipos: TASK, NOTE, LINK, FILE, EMAIL, IDEA
# Estados: INBOX, TODO, IN_PROGRESS, WAITING, DONE, ARCHIVED
# Prioridades: NONE, LOW, MEDIUM, HIGH, URGENT
```

### 4. Vincular Items a Seguimientos

```bash
# Vincular item existente a un seguimiento
curl -X POST "$TASKFLOW_URL/api/seguimientos/{segId}/items" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "clxxx..."}'

# Desvincular
curl -X DELETE "$TASKFLOW_URL/api/seguimientos/{segId}/items?itemId={itemId}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"
```

### 5. Recordatorios

```bash
# Ver recordatorios activos
curl "$TASKFLOW_URL/api/recordatorios" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Crear recordatorio
curl -X POST "$TASKFLOW_URL/api/recordatorios" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "recuérdame el jueves revisar la propuesta de Repsol",
    "seguimientoId": "clxxx..."
  }'
# El campo "input" se parsea automáticamente con LLM (lenguaje natural → fecha + recurrencia)

# Posponer recordatorio
curl -X PATCH "$TASKFLOW_URL/api/recordatorios/{id}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"snoozeHoras": 24}'

# Desactivar recordatorio
curl -X PATCH "$TASKFLOW_URL/api/recordatorios/{id}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"activo": false}'
```

### 6. Memoria Profesional

Tu memoria sobre Pedro. Se construye automáticamente, pero puedes consultarla.

```bash
# Ver toda la memoria
curl "$TASKFLOW_URL/api/memoria" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Buscar en la memoria
curl "$TASKFLOW_URL/api/memoria?q=repsol" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Filtrar por categoría: PERSONA, PROYECTO, PROCESO, PREFERENCIA, ORGANIZACION, HECHO, TEMA
curl "$TASKFLOW_URL/api/memoria?categoria=PERSONA" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Desactivar un hecho incorrecto
curl -X DELETE "$TASKFLOW_URL/api/memoria?id={memoriaId}" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"
```

### 7. Feed del Agente (tus acciones/sugerencias)

```bash
# Ver feed de acciones pendientes
curl "$TASKFLOW_URL/api/agent/feed" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"

# Enviar resultado/sugerencia al feed
curl -X POST "$TASKFLOW_URL/api/agent/webhook" \
  -H "Authorization: Bearer $TASKFLOW_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "sugerencia",
    "titulo": "Revisión semanal: 3 temas necesitan atención",
    "descripcion": "Repsol tiene deadline el viernes...",
    "payload": {"temas": ["repsol", "kubernetes"]},
    "prioridad": "high"
  }'
# tipos: sugerencia, accion, digest, completado
```

### 8. Búsqueda Global

```bash
curl "$TASKFLOW_URL/api/search?q=repsol" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"
# Retorna: { items: [...], projects: [...] }
```

### 9. Proyectos

```bash
curl "$TASKFLOW_URL/api/projects" \
  -H "Authorization: Bearer $TASKFLOW_API_KEY"
```

---

## Flujos comunes

### Pedro te dice algo por Telegram sobre un tema

1. Consulta `GET /api/seguimientos` para ver si ya existe un seguimiento relacionado
2. Consulta `GET /api/memoria?q={tema}` para recordar contexto
3. Crea entrada con `POST /api/entradas` (tipo NOTA_LIBRE, contenido = lo que Pedro dijo)
4. El sistema procesará automáticamente: crea tareas, actualiza existentes, extrae contactos, crea recordatorios
5. Responde a Pedro con el contexto de tu memoria + lo que hiciste

### Pedro reenvía un email

El email llega por SMTP a `admin@hyper-nexus.com` → se procesa automáticamente:
- Si Pedro escribió algo antes del forward → se trata como instrucción prioritaria
- Se extrae resumen, acciones, contactos, fechas
- Se actualiza el estado de tareas existentes si aplica (ej: pendiente → DONE)
- Se crean nuevas tareas si hay acciones pendientes

Si Pedro te pregunta por Telegram sobre el email, consulta los seguimientos recientes.

### Pedro pregunta "¿qué tengo pendiente?"

1. `GET /api/items?estado=TODO` — tareas pendientes
2. `GET /api/items?vencidos=true` — tareas vencidas
3. `GET /api/seguimientos?estado=NECESITA_ATENCION` — temas que necesitan atención
4. `GET /api/recordatorios` — próximos recordatorios
5. Compón un resumen claro y conciso

### Pedro dice "ponme un recordatorio para X"

1. `POST /api/recordatorios` con `{"input": "lo que Pedro dijo"}`
2. El sistema parsea automáticamente la fecha y recurrencia
3. Confirma a Pedro: qué se creó y cuándo le avisará

### Pedro dice "¿qué sabes de [persona/proyecto]?"

1. `GET /api/memoria?q={nombre}` — buscar en memoria
2. `GET /api/search?q={nombre}` — buscar en items y proyectos
3. `GET /api/seguimientos` y filtrar los relevantes — revisar contactos vinculados
4. Compón respuesta con todo lo que sabes

### Pedro pregunta "¿quién está involucrado en [tema]?"

1. `GET /api/seguimientos` — buscar el seguimiento del tema
2. `GET /api/seguimientos/{id}` — ver contactos vinculados con sus roles
3. `GET /api/memoria?categoria=PERSONA` — complementar con memoria
4. Responde con la lista de contactos, sus roles y la info que tienes de cada uno

### Pedro dice "la tarea X ya está hecha"

1. Busca el item con `GET /api/items?q={descripción}` o `GET /api/seguimientos/{id}` para ver items vinculados
2. Actualiza con `PATCH /api/items/{id}` → `{"estado": "DONE", "modificadoPor": "agente", "notasAgente": "Marcado como completado por indicación de Pedro"}`
3. Confirma a Pedro

### Revisión diaria (cron matutino)

1. `GET /api/items?vencidos=true` — ¿hay algo vencido?
2. `GET /api/items?estancados=true` — ¿algo estancado?
3. `GET /api/seguimientos?estado=NECESITA_ATENCION` — temas abandonados
4. `GET /api/recordatorios` — recordatorios que disparan hoy
5. Envía digest a Pedro vía `POST /api/agent/webhook`

---

## Procesamiento automático de entradas

Cuando se crea una entrada (email, nota, reunión), TaskFlow ejecuta automáticamente:

1. **Resumen** — genera una línea concisa del contenido
2. **Acciones** — extrae tareas concretas → crea Items en INBOX
3. **Actualización de tareas** — revisa tareas existentes del seguimiento y actualiza estados si el contenido lo justifica (ej: si un email confirma que algo se envió → la tarea pasa a DONE)
4. **Contactos** — extrae personas mencionadas → crea/actualiza entidades Contacto con nombre, email, teléfono, empresa, cargo, y rol (cliente/fabricante/partner/interno/proveedor)
5. **Fechas** — extrae deadlines → crea Recordatorios
6. **Seguimiento** — auto-vincula a seguimiento existente por temas, o crea uno nuevo
7. **Memoria** — extrae hechos profesionales (personas, proyectos, procesos, etc.)

Todo esto es transparente — el resultado se muestra en el feed de Nexus y en el detalle del seguimiento.
