# TaskFlow

Sistema de productividad personal con agente IA (Nexus) integrado. Gestiona tareas, seguimientos de temas, emails reenviados, recordatorios, contactos, y construye una memoria profesional acumulativa.

## Features

### Gestión de tareas
- **Inbox** con captura rápida desde cualquier vista
- **Kanban** con drag & drop entre columnas de estado
- **Matriz de Eisenhower** (urgente/importante)
- Items con tipo (TASK, NOTE, LINK, FILE, EMAIL, IDEA), prioridad, fecha límite, etiquetas

### Seguimientos (procesos/temas activos)
- Agrupación automática de emails, notas y tareas por tema
- Tabs dedicados: **Correos**, **Contactos**, **Items**, **Recordatorios**, **Nexus**
- El agente detecta el tema de cada email y lo vincula al seguimiento correcto
- Cada email muestra un **resumen de una línea** generado por el LLM

### Contactos inteligentes
- Extracción automática de personas desde emails y entradas
- Campos: nombre, email, teléfono, empresa, cargo
- Rol en cada seguimiento: cliente, fabricante, partner, interno, proveedor
- **Confianza acumulativa** (0-100%): sube +10 con cada mención
- Vinculación automática a seguimientos

### Procesamiento de emails
- Servidor SMTP integrado para recibir emails reenviados
- **Forward puro** o **con instrucciones**: si escribes algo antes de reenviar ("urgente", "seguir esto"), Nexus lo trata como instrucción prioritaria
- Auto-detección de seguimiento por tema, asunto `[TF-xxx]`, o dirección `<seg-id>@dominio`
- Cada email crea un Item (tipo EMAIL, estado INBOX) y una EntradaContexto

### Actualización automática de tareas
- Nexus revisa las tareas existentes del seguimiento al procesar cada email
- Si detecta que algo pendiente ya se hizo → lo mueve a DONE automáticamente
- Si alguien está trabajando en algo → lo mueve a IN_PROGRESS
- Solo actúa cuando el contenido lo justifica claramente

### Memoria Profesional
- Nexus aprende de cada email/entrada procesada
- 7 categorías: PERSONA, PROYECTO, PROCESO, PREFERENCIA, ORGANIZACION, HECHO, TEMA
- La memoria se inyecta en todos los análisis para dar contexto más rico
- Confianza incremental (50% base, +10 por confirmación)

### Recordatorios
- Creación en lenguaje natural ("recuérdame el jueves revisar la propuesta")
- Recurrencia: una vez, diario, semanal, cada N días
- Vinculados a seguimientos o items
- Cron automático cada 15 minutos

### Seguridad
- **La app NUNCA envía correos** ni contacta a nadie sin permiso explícito
- Banner visible en cada seguimiento: "Solo lectura"
- Restricción en el prompt del LLM

## Stack

- **Next.js 16** (App Router) + TypeScript + React 19
- **Prisma 7** + PostgreSQL
- **Vercel AI SDK** + xAI (Grok)
- **NextAuth v5** (JWT, credentials)
- **SMTP server** para recibir emails reenviados
- **OpenClaw** como plataforma del agente Nexus

---

## Setup rápido

### 1. Requisitos

- Node.js 20+
- PostgreSQL 16+
- npm

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear `.env.local`:

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/taskflow

# Puerto
PORT=3000

# Auth
NEXTAUTH_SECRET=genera-un-secret-seguro
NEXTAUTH_URL=http://localhost:3000

# LLM (xAI Grok)
XAI_API_KEY=xai-xxxxx
LLM_MODEL=grok-4-1-fast

# Agente — dejar vacío para mock mode (usa LLM directamente)
# OPENCLAW_URL=http://127.0.0.1:18789
# OPENCLAW_HOOK_TOKEN=xxx

# Webhook entrante del agente
TASKFLOW_AGENT_KEY=genera-un-token-seguro

# URL de la app (para el SMTP server)
APP_URL=http://localhost:3000

# Inbound email
TASKFLOW_INBOUND_KEY=genera-un-token-seguro
SMTP_PORT=2525
SMTP_DOMAIN=hyper-nexus.com
TASKFLOW_URL=http://127.0.0.1:3000
```

### 4. Crear base de datos y schema

```bash
# Crear la DB (si no existe)
createdb taskflow

# Push schema a la DB
npx prisma db push

# Generar Prisma Client
npx prisma generate

# Fix symlink (requerido por Prisma 7)
ln -sfn node_modules/.prisma node_modules/@prisma/client/.prisma

# Seed con datos de ejemplo
npx tsx --env-file=.env.local prisma/seed.ts

# Migrar contactos desde datos existentes (si hay)
npx tsx --env-file=.env.local prisma/migrate-contacts.ts
```

**Usuario por defecto:** `ptavares@openclaw.io` / `taskflow123`
**Email inbound:** `admin@hyper-nexus.com`

### 5. Arrancar

```bash
# App web
npm run dev          # desarrollo (Turbopack)
npm run build && npm start  # producción

# SMTP server (en otro terminal o con PM2)
npm run smtp
```

---

## Producción (VPS / OpenClaw container)

### Build y arranque

```bash
npm install
npx prisma db push
npx prisma generate
ln -sfn node_modules/.prisma node_modules/@prisma/client/.prisma
npx tsx --env-file=.env.local prisma/seed.ts  # solo la primera vez
npx tsx --env-file=.env.local prisma/migrate-contacts.ts  # migrar contactos existentes
npm run build
```

### PM2

```bash
# App web
pm2 start npm --name taskflow -- start

# SMTP server
pm2 start server/smtp-inbound.ts --interpreter="npx tsx" --name smtp

pm2 save
```

### Cron jobs

Los endpoints de cron necesitan ser llamados periódicamente:

```bash
# Comprobar recordatorios (cada 15 minutos)
*/15 * * * * curl -s http://127.0.0.1:3000/api/cron/reminders

# Comprobar seguimientos estancados (cada día a las 8:00)
0 8 * * * curl -s http://127.0.0.1:3000/api/cron/seguimientos
```

### Nginx (puerto 25 → 2525 para SMTP)

```nginx
# En /etc/nginx/nginx.conf, sección stream:
stream {
    server {
        listen 25;
        proxy_pass 127.0.0.1:2525;
    }
}
```

### DNS para hyper-nexus.com

```
MX   10   hyper-nexus.com.      → IP del VPS
A         hyper-nexus.com.      → IP del VPS
```

---

## Arquitectura

### Flujo de datos

```
┌───────────────────────────────────────────────────────────────┐
│                        ENTRADAS                                │
│                                                                │
│  Email → SMTP :2525 → /api/inbound-email ─┐                  │
│  Web UI → /api/entradas ──────────────────┤                   │
│  OpenClaw/Telegram → /api/entradas ───────┘                   │
│                                             │                  │
│                                     ┌───────▼────────┐        │
│                                     │  Nexus procesa  │        │
│                                     │  (Grok LLM)     │        │
│                                     └───────┬────────┘        │
│                                             │                  │
│  ┌──────────────────────────────────────────┼──────────┐      │
│  │              ACCIONES AUTOMÁTICAS         │          │      │
│  │                                           │          │      │
│  │  ┌─ Seguimiento (crea/vincula al tópico)  │          │      │
│  │  ├─ Contactos (extrae y vincula personas) │          │      │
│  │  ├─ Items nuevos (tareas extraídas)       │          │      │
│  │  ├─ Items existentes (actualiza estados)  │          │      │
│  │  ├─ Recordatorios (fechas clave)          │          │      │
│  │  ├─ Memoria Profesional (hechos)          │          │      │
│  │  └─ Feed del Agente (resumen)             │          │      │
│  └───────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

### Cómo Nexus gestiona tópicos

Cuando llega una entrada (email, nota, mensaje de Telegram via OpenClaw):

1. Detecta instrucciones del usuario (texto antes del forward)
2. Consulta memoria profesional para contexto
3. Consulta tareas existentes del seguimiento
4. El LLM analiza y extrae: resumen, acciones, fechas, temas, contactos, actualizaciones
5. Busca seguimientos activos que compartan temas → vincula al existente
6. Si no hay match → crea seguimiento nuevo automáticamente
7. Upsert de contactos como entidades estructuradas
8. Actualiza tareas existentes si el contenido lo justifica (ej: pendiente → DONE)
9. Crea Items (tareas) nuevas para cada acción extraída
10. Crea Recordatorios para fechas clave
11. Extrae hechos a la Memoria Profesional
12. La próxima vez que llegue algo del mismo tema, Nexus ya tiene contexto

### Memoria Profesional

Nexus aprende de cada entrada procesada y acumula conocimiento en 7 categorías:

| Categoría | Qué guarda |
|-----------|-----------|
| PERSONA | Contactos, roles, relaciones, emails |
| PROYECTO | Iniciativas, estados, stakeholders, deadlines |
| PROCESO | Cómo se hacen las cosas en la empresa |
| PREFERENCIA | Preferencias del usuario (horarios, estilos) |
| ORGANIZACION | Estructura org, equipos, jerarquía |
| HECHO | Decisiones tomadas, acuerdos, contexto general |
| TEMA | Conocimiento técnico y de negocio recurrente |

La memoria se inyecta en todos los prompts del LLM, así que cuanto más se usa, más inteligente se vuelve.

---

## Integración con OpenClaw

Nexus (corriendo en OpenClaw) se comunica con TaskFlow via REST API.

### Archivo SKILL.md

El archivo `docs/NEXUS-SKILL.md` contiene la documentación completa de todos los endpoints que Nexus puede usar. Copiarlo a la configuración de skills de OpenClaw:

```bash
cp docs/NEXUS-SKILL.md ~/.openclaw/skills/taskflow/SKILL.md
```

### Variables en openclaw.json

```json
{
  "skills": {
    "entries": {
      "taskflow": {
        "env": {
          "TASKFLOW_URL": "http://127.0.0.1:3000",
          "TASKFLOW_API_KEY": "el-api-key-generado",
          "TASKFLOW_AGENT_KEY": "el-mismo-que-en-env-local"
        }
      }
    }
  }
}
```

### Canales de comunicación

| Canal | Dirección | Cómo |
|-------|-----------|------|
| TaskFlow → Nexus | TaskFlow despierta a Nexus | `POST OPENCLAW_URL/hooks/agent` |
| Nexus → TaskFlow | Nexus envía resultados | `POST /api/agent/webhook` con Bearer |
| Nexus opera | Nexus lee/escribe datos | `GET/POST/PATCH /api/*` con API key |

### Flujo Telegram → OpenClaw → TaskFlow

```
Pedro escribe en Telegram
    → OpenClaw recibe el mensaje
    → Nexus consulta /api/seguimientos (¿tema existente?)
    → Nexus consulta /api/memoria?q=... (¿qué sé de esto?)
    → Nexus crea entrada via POST /api/entradas
    → TaskFlow procesa automáticamente (tareas, contactos, recordatorios, memoria)
    → Nexus responde a Pedro por Telegram con contexto
```

### Mock mode

Si `OPENCLAW_URL` no está configurado, TaskFlow usa el LLM directamente para generar las respuestas de Nexus. La UI y el comportamiento son idénticos. Para activar producción, solo añadir `OPENCLAW_URL` y `OPENCLAW_HOOK_TOKEN`.

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/items` | Listar/Crear items |
| `GET/PATCH/DELETE` | `/api/items/[id]` | Detalle/Actualizar/Eliminar item |
| `GET/POST` | `/api/seguimientos` | Listar/Crear seguimientos (tópicos) |
| `GET/PATCH/DELETE` | `/api/seguimientos/[id]` | Detalle seguimiento (incluye contactos) |
| `GET/POST` | `/api/seguimientos/[id]/entradas` | Entradas de contexto |
| `POST/DELETE` | `/api/seguimientos/[id]/items` | Vincular/desvincular items |
| `POST` | `/api/entradas` | Crear entrada suelta (auto-vincula) |
| `DELETE` | `/api/entradas/[id]` | Eliminar entrada |
| `GET/POST` | `/api/recordatorios` | Recordatorios (NLP) |
| `PATCH/DELETE` | `/api/recordatorios/[id]` | Gestionar recordatorio |
| `GET/DELETE` | `/api/memoria` | Memoria profesional |
| `GET/POST` | `/api/projects` | Proyectos |
| `GET` | `/api/search?q=` | Búsqueda global |
| `POST` | `/api/inbound-email` | Email entrante (desde SMTP) |
| `GET` | `/api/agent/feed` | Feed del agente |
| `POST` | `/api/agent/webhook` | Webhook entrante de Nexus |
| `GET` | `/api/settings` | Configuración del sistema |
| `PATCH` | `/api/settings/autonomy` | Nivel de autonomía |
| `PATCH` | `/api/settings/profile` | Perfil del usuario |
| `GET` | `/api/cron/reminders` | Check recordatorios (cada 15min) |
| `GET` | `/api/cron/seguimientos` | Check seguimientos estancados (diario) |

### Autenticación

| Tipo | Cómo | Para qué |
|------|------|----------|
| NextAuth session | Cookie JWT | Browser (UI web) |
| API key | `Authorization: Bearer <key>` | Nexus (OpenClaw) |
| Agent key | `Authorization: Bearer $TASKFLOW_AGENT_KEY` | Webhook del agente |
| Inbound key | `Authorization: Bearer $TASKFLOW_INBOUND_KEY` | SMTP server |
| Sin auth | Directo | Cron (solo localhost) |

---

## Direcciones de email

| Dirección | Comportamiento |
|-----------|---------------|
| `admin@hyper-nexus.com` | Inbox del usuario (configurable en DB) |
| `<seguimiento-id>@hyper-nexus.com` | Vincula al seguimiento directamente |
| `[TF-<id>]` en el asunto | Vincula al seguimiento por subject |

Reenviar cualquier email a `admin@hyper-nexus.com` y Nexus lo procesa automáticamente: extrae acciones, crea tareas, identifica contactos, vincula al tópico correcto, actualiza tareas existentes, programa recordatorios, y aprende de la información.

Si escribes algo antes del forward (ej: "urgente", "seguir esto"), Nexus lo trata como instrucción con prioridad máxima.
