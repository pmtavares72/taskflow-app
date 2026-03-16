# CLAUDE.md — TaskFlow App

## Proyecto

**TaskFlow** es una aplicación de productividad personal con IA integrada, construida con Next.js 16 App Router. El asistente de IA se llama **Nexus** y actua como copiloto de productividad.

## Stack tecnológico

- **Framework**: Next.js 16.1.6 (App Router) + React 19
- **Lenguaje**: TypeScript 5
- **Base de datos**: PostgreSQL via Prisma 7 con `@prisma/adapter-pg`
- **Auth**: NextAuth v5 (beta) con estrategia JWT + Credentials provider (bcryptjs)
- **LLM**: xAI Grok via `@ai-sdk/xai` + Vercel AI SDK (`ai`)
- **Agente externo**: OpenClaw (gateway local opcional) — si `OPENCLAW_URL` no está definido, usa mock mode con LLM directamente
- **Drag & drop**: `@hello-pangea/dnd`
- **Validación**: Zod 4
- **Estilos**: Tailwind CSS 4
- **Runtime DB**: `pg` (node-postgres)

## Estructura del proyecto

```
app/
  (app)/              # Rutas protegidas (requieren sesión)
    inbox/            # Vista principal — landing tras login
    eisenhower/       # Matriz de Eisenhower
    kanban/           # Vista Kanban con drag & drop
    agent/            # Feed del agente Nexus
    seguimientos/     # Lista de seguimientos (procesos/temas activos)
    seguimientos/[id] # Detalle: correos, contactos, items, recordatorios, Nexus
    correo/           # Vista de correos recibidos
    settings/         # Configuración: perfil, autonomía, estado del sistema
    items/[id]/       # Detalle de item
  (auth)/
    login/            # Página de login
  api/
    auth/             # NextAuth handlers
    items/            # CRUD de items (GET, POST, PATCH, DELETE)
    seguimientos/     # CRUD de seguimientos + entradas + items vinculados
    entradas/[id]     # DELETE entrada de contexto
    inbound-email/    # Email entrante desde SMTP server
    agent/
      feed/           # Feed del agente (GET, PATCH por id, accept/reject)
      suggest/        # Disparar análisis de un item
      webhook/        # Webhook entrante desde OpenClaw/agente externo
    search/           # Búsqueda full-text
    settings/         # GET config del sistema
    settings/autonomy/ # PATCH nivel de autonomía del agente (0-100)
    settings/profile/  # PATCH perfil usuario
    recordatorios/    # CRUD recordatorios (NLP para crear)
    memoria/          # GET/DELETE memoria profesional
    upload/           # Subida de archivos
    cron/reminders/   # Cron: check recordatorios (cada 15min)
    cron/seguimientos/ # Cron: check seguimientos estancados (diario)

components/
  layout/             # AppShell, Sidebar, BottomNav (móvil), AiPanel (desktop)
  items/              # ItemCard, ItemDetail, QuickCapture, NewItemPanel, FileCapture
  agent/              # AgentCard, AgentFeed, AgentConfig
  views/              # KanbanView, EisenhowerMatrix
  seguimientos/       # SeguimientoCard, NewSeguimientoModal
  context/            # ContextInput, ContextEntry
  reminders/          # ReminderInput, ReminderList
  search/             # SearchOverlay
  ui/                 # SparkleIcon, etc.

lib/
  auth.ts             # Configuración NextAuth + helpers
  api-auth.ts         # Autenticación dual: sesión JWT o API Key
  db.ts               # Instancia singleton de Prisma
  ai.ts               # Instancia xAI/Grok + re-exports de Vercel AI SDK
  agent.ts            # Procesamiento de contexto (LLM) + comunicación con OpenClaw
  agent-events.ts     # Hooks de eventos (onItemCreated, onEntradaCreated)
  memory.ts           # Extracción y consulta de memoria profesional

server/
  smtp-inbound.ts     # Servidor SMTP para recibir emails reenviados

types/index.ts        # Re-exports de tipos Prisma + interfaces extendidas
middleware.ts         # Edge middleware: protección de rutas (API excluido)
prisma/schema.prisma  # Schema de BD
prisma.config.ts      # Config Prisma con loadEnvConfig
```

## Modelo de datos (Prisma)

Modelos principales: `User`, `Project`, `Item`, `Adjunto`, `Relacion`, `Actividad`, `AgenteFeed`, `ApiKey`, `Seguimiento`, `SeguimientoItem`, `EntradaContexto`, `Recordatorio`, `MemoriaProfesional`, `Contacto`, `ContactoSeguimiento`

**Item** es el modelo central con:
- `tipo`: TASK | NOTE | LINK | FILE | EMAIL | IDEA
- `estado`: INBOX | TODO | IN_PROGRESS | WAITING | DONE | ARCHIVED
- `prioridad`: NONE | LOW | MEDIUM | HIGH | URGENT
- Clasificación Eisenhower: `eisenhowerUrgente` + `eisenhowerImportante`
- `contexto`: TRABAJO | PERSONAL | AMBOS
- `modificadoPor`: "usuario" | "agente"
- `notasAgente`: notas generadas por el agente

**Seguimiento** — temas/procesos activos que Nexus trackea:
- Acumula entradas de contexto (emails, notas, reuniones)
- Items (tareas) vinculados via `SeguimientoItem`
- Contactos involucrados via `ContactoSeguimiento` (con rol: cliente, fabricante, partner, etc.)
- Recordatorios vinculados
- Feed de acciones de Nexus

**Contacto** — personas extraídas automáticamente de emails/entradas:
- nombre, email, telefono, empresa, cargo
- `confianza` 0-100 (sube +10 con cada mención)
- `fuentes` array de IDs de entradas que lo mencionan
- Vinculado a seguimientos con rol via `ContactoSeguimiento`
- Unique constraint: `[userId, nombre, empresa]`

**EntradaContexto** — piezas de información (EMAIL, NOTAS_REUNION, CONVERSACION, etc.):
- `resumen`: generado por LLM (una línea)
- `metadatos`: JSON con acciones extraídas, contactos, temas, actualizaciones de items

**MemoriaProfesional** — hechos acumulativos que Nexus aprende:
- Categorías: PERSONA, PROYECTO, PROCESO, PREFERENCIA, ORGANIZACION, HECHO, TEMA
- `confianza` 0-100, sube con cada confirmación
- Unique constraint: `[userId, categoria, clave]`

**AgenteFeed**: cola de sugerencias/acciones del agente Nexus
- `tipo`: sugerencia | accion | digest | completado
- `estado`: pendiente | aceptado | rechazado

**User.agentAutonomy**: nivel de autonomía del agente (0-100). Si es 0, no se disparan acciones del agente.

## Autenticación dual

`lib/api-auth.ts` — `authenticateRequest()` soporta:
1. **Sesión JWT** (NextAuth) — para el frontend
2. **API Key** (Bearer token) — para integraciones externas, almacenadas hasheadas en BD con prefijo para lookup eficiente

## Arquitectura del agente (Nexus)

### Procesamiento de entradas (`lib/agent.ts` → `requestContextProcessing`)

Cuando llega una entrada (email, nota, reunión), Nexus ejecuta 8 pasos:

1. **Detecta instrucciones del usuario** — si hay texto antes de un forward marker, se trata como instrucción con prioridad máxima (funciona desde 4+ caracteres, filtra firmas)
2. **Consulta memoria profesional** — inyecta contexto previo sobre personas, proyectos, temas
3. **Consulta tareas existentes** — del seguimiento vinculado o las últimas 30 tareas abiertas
4. **Llama al LLM** con todo el contexto y extrae: resumen, acciones nuevas, fechas clave, temas, contactos, actualizaciones de items existentes
5. **Auto-crea/vincula seguimiento** — por matching de temas con seguimientos activos
6. **Upsert contactos** — crea o actualiza entidades Contacto y las vincula al seguimiento con su rol
7. **Actualiza items existentes** — si el LLM detecta que una tarea pendiente ya se completó, la mueve a DONE (o IN_PROGRESS, ARCHIVED, etc.)
8. **Crea items nuevos** — tareas extraídas van a INBOX para triage del usuario
9. **Crea recordatorios** — de fechas clave mencionadas
10. **Genera feed entry** — resumen de todo lo que hizo
11. **Extrae memoria** — hechos profesionales (async, non-blocking)

### Dos modos de operación

- **Mock mode** (default en dev): `OPENCLAW_URL` no definido → llama directamente al LLM con `generateObject`
- **Modo real**: envía hooks HTTP a OpenClaw gateway (`POST /hooks/agent`), que procesa y llama de vuelta via webhook

### Eventos (`lib/agent-events.ts`)

- `onItemCreated` → `requestInboxTriage` (triage automático de inbox)
- `onEntradaCreated` → `requestContextProcessing` (procesamiento completo de la entrada)

### Regla de seguridad CRÍTICA

**La app NUNCA envía correos ni contacta a nadie sin permiso explícito del usuario.** Esto está reforzado en:
- El prompt del LLM ("IMPORTANTE: La app NUNCA envía correos")
- Banner visible en la UI del seguimiento ("Solo lectura")
- No existe ningún endpoint de envío de email

## Variables de entorno

```
DATABASE_URL=postgresql://user@localhost:5432/taskflow
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
XAI_API_KEY=...            # API key de xAI
LLM_MODEL=grok-4-fast      # Modelo configurable
OPENCLAW_URL=              # Vacío = mock mode
OPENCLAW_HOOK_TOKEN=       # Token para llamar a OpenClaw
TASKFLOW_AGENT_KEY=...     # Token que OpenClaw usa para llamar al webhook
TASKFLOW_INBOUND_KEY=...   # Token del SMTP server para /api/inbound-email
APP_URL=http://localhost:3000
SMTP_PORT=2525
SMTP_DOMAIN=hyper-nexus.com
```

## Layout responsivo

- **Desktop (>=1024px)**: AI Panel (izquierda) + Sidebar + main content
- **Desktop (>=768px)**: Sidebar visible
- **Móvil (<768px)**: Solo main + BottomNav

El `AppShell` envuelve todas las rutas de `(app)/`.

## Convenciones de código

- Todos los textos de UI y comentarios en **español**
- Nombres de modelos y campos Prisma en español (excepto enums de estado)
- Validación con Zod en todas las API routes
- Las acciones del agente se disparan en background con `.catch(console.error)` para no bloquear respuestas HTTP
- `db.ts` exporta instancia singleton de Prisma Client

## Comandos clave

```bash
npm run dev              # Servidor de desarrollo (puerto 3000)
npm run build            # Build de producción
npx prisma db push       # Sincronizar schema con BD
npx prisma generate      # Regenerar Prisma Client
npx tsx --env-file=.env.local prisma/seed.ts              # Seed de datos
npx tsx --env-file=.env.local prisma/migrate-contacts.ts  # Migrar contactos existentes
npm run smtp             # SMTP server (puerto 2525)
```
