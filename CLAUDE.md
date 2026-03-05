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
    items/[id]/       # Detalle de item
  (auth)/
    login/            # Página de login
  api/
    auth/             # NextAuth handlers
    items/            # CRUD de items (GET, POST, PATCH, DELETE)
    agent/
      feed/           # Feed del agente (GET, PATCH por id, accept/reject)
      suggest/        # Disparar análisis de un item
      webhook/        # Webhook entrante desde OpenClaw/agente externo
    search/           # Búsqueda full-text
    settings/autonomy/ # Nivel de autonomía del agente (0-100)
    upload/           # Subida de archivos (multer)

components/
  layout/             # AppShell, Sidebar, BottomNav (móvil), AiPanel (desktop)
  items/              # ItemCard, ItemDetail, QuickCapture, FileCapture
  agent/              # AgentCard, AgentFeed, AgentConfig
  views/              # KanbanView, EisenhowerMatrix
  search/             # SearchOverlay
  ui/                 # Componentes genéricos (SparkleIcon, etc.)

lib/
  auth.ts             # Configuración NextAuth + helpers
  api-auth.ts         # Autenticación dual: sesión JWT o API Key
  db.ts               # Instancia singleton de Prisma
  ai.ts               # Instancia xAI/Grok + re-exports de Vercel AI SDK
  agent.ts            # Lógica de comunicación con OpenClaw / mock LLM
  agent-events.ts     # Hooks de eventos (onItemCreated, onItemStale, onEmailReceived)

types/index.ts        # Re-exports de tipos Prisma + interfaces extendidas
middleware.ts         # Edge middleware: protección de rutas, redireccionamiento
prisma/schema.prisma  # Schema de BD
prisma.config.ts      # Config Prisma con loadEnvConfig
```

## Modelo de datos (Prisma)

Modelos principales: `User`, `Project`, `Item`, `Adjunto`, `Relacion`, `Actividad`, `AgenteFeed`, `ApiKey`

**Item** es el modelo central con:
- `tipo`: TASK | NOTE | LINK | FILE | EMAIL | IDEA
- `estado`: INBOX | TODO | IN_PROGRESS | WAITING | DONE | ARCHIVED
- `prioridad`: NONE | LOW | MEDIUM | HIGH | URGENT
- Clasificación Eisenhower: `eisenhowerUrgente` + `eisenhowerImportante`
- `contexto`: TRABAJO | PERSONAL | AMBOS
- `modificadoPor`: "usuario" | "agente"
- `notasAgente`: notas generadas por el agente

**AgenteFeed**: cola de sugerencias/acciones del agente Nexus
- `tipo`: sugerencia | accion | digest | completado
- `estado`: pendiente | aceptado | rechazado

**User.agentAutonomy**: nivel de autonomía del agente (0-100). Si es 0, no se disparan acciones del agente.

## Autenticación dual

`lib/api-auth.ts` — `authenticateRequest()` soporta:
1. **Sesión JWT** (NextAuth) — para el frontend
2. **API Key** (Bearer token) — para integraciones externas, almacenadas hasheadas en BD con prefijo para lookup eficiente

## Arquitectura del agente (Nexus)

Dos modos de operación en `lib/agent.ts`:
- **Mock mode** (default en dev): `OPENCLAW_URL` no definido → llama directamente al LLM con `generateObject` para generar entradas en `AgenteFeed`
- **Modo real**: envía hooks HTTP a OpenClaw gateway (`POST /hooks/agent`), que procesa y llama de vuelta via webhook

Flujo de eventos en `lib/agent-events.ts`:
- `onItemCreated` → `requestInboxTriage` (triage automático de inbox)
- `onItemStale` → análisis de items estancados >7 días
- `onEmailReceived` → clasificación de emails

El webhook entrante (`/api/agent/webhook`) tiene:
- IP allowlist (solo localhost en producción)
- Auth por bearer token (`TASKFLOW_AGENT_KEY`)
- Rate limiting in-memory (100 req/min por IP)

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
APP_URL=http://localhost:3000
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
npx prisma migrate dev   # Migraciones en desarrollo
npx prisma generate      # Regenerar Prisma Client
npx tsx --env-file=.env.local prisma/seed.ts  # Seed de datos
```
