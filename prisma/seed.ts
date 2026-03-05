import { PrismaClient, TipoItem, EstadoItem, Prioridad, Contexto } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  // Usuario principal
  const password = await bcrypt.hash('taskflow123', 12)
  const user = await db.user.upsert({
    where: { email: 'ptavares@openclaw.io' },
    update: {},
    create: {
      email: 'ptavares@openclaw.io',
      name: 'P. Tavares',
      password,
      agentAutonomy: 65,
    },
  })

  // Proyectos
  const pliegos = await db.project.create({
    data: { nombre: 'Pliegos Q1', color: '#60a5fa', contexto: 'TRABAJO', userId: user.id },
  })
  const garcia = await db.project.create({
    data: { nombre: 'Cliente García', color: '#4ade80', contexto: 'TRABAJO', userId: user.id },
  })
  const openclaw = await db.project.create({
    data: { nombre: 'OpenClaw Dev', color: '#a78bfa', contexto: 'TRABAJO', userId: user.id },
  })

  // Items — Inbox
  await db.item.create({
    data: {
      tipo: TipoItem.EMAIL,
      titulo: 'Email de Juan García sobre presupuesto Q1',
      contenido: 'Necesito revisión urgente del presupuesto para la licitación del Ayuntamiento.',
      estado: EstadoItem.INBOX,
      prioridad: Prioridad.HIGH,
      contexto: Contexto.TRABAJO,
      etiquetas: ['email', 'presupuesto'],
      userId: user.id,
      proyectoId: garcia.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.IDEA,
      titulo: 'Automatizar clasificación de pliegos con OpenClaw',
      contenido: 'Usar la API de clasificación para pre-procesar pliegos antes de revisión manual.',
      estado: EstadoItem.INBOX,
      prioridad: Prioridad.MEDIUM,
      contexto: Contexto.TRABAJO,
      etiquetas: ['automatización', 'ia'],
      userId: user.id,
      proyectoId: openclaw.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.LINK,
      titulo: 'Guía de propuestas técnicas — Ministerio de Hacienda',
      contenido: 'https://hacienda.gob.es/PropuestasTecnicas/guia2026.pdf',
      estado: EstadoItem.INBOX,
      prioridad: Prioridad.LOW,
      contexto: Contexto.TRABAJO,
      etiquetas: ['referencia', 'licitación'],
      userId: user.id,
      proyectoId: pliegos.id,
    },
  })

  // Items — Kanban (TODO / IN_PROGRESS / WAITING / DONE)
  const propuestaTecnica = await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Revisar y validar propuesta técnica para licitación municipal',
      contenido: 'Revisar y validar la propuesta técnica para la licitación municipal de Pliegos Q1. Incluye verificación de requisitos legales, presupuesto actualizado y memoria descriptiva.',
      estado: EstadoItem.IN_PROGRESS,
      prioridad: Prioridad.URGENT,
      eisenhowerUrgente: true,
      eisenhowerImportante: true,
      contexto: Contexto.TRABAJO,
      etiquetas: ['licitación', 'propuesta'],
      fechaLimite: new Date('2026-03-05'),
      userId: user.id,
      proyectoId: pliegos.id,
    },
  })
  await db.actividad.createMany({
    data: [
      { descripcion: 'Item creado desde inbox', autor: 'P. Tavares', itemId: propuestaTecnica.id },
      { descripcion: 'Nexus detectó requisito de certificación ISO 9001 en apartado 3.2', autor: 'agente', itemId: propuestaTecnica.id },
      { descripcion: 'Estado cambiado a En progreso', autor: 'P. Tavares', itemId: propuestaTecnica.id },
      { descripcion: 'Alerta: el pliego exige al menos 3 referencias de proyectos similares', autor: 'agente', itemId: propuestaTecnica.id },
    ],
  })

  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Preparar documentación pliego Ayuntamiento Madrid',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.URGENT,
      eisenhowerUrgente: true,
      eisenhowerImportante: true,
      contexto: Contexto.TRABAJO,
      etiquetas: ['pliego', 'madrid'],
      fechaLimite: new Date('2026-03-13'),
      notasAgente: 'Plazo crítico: 9 días. Requiere memoria descriptiva + presupuesto.',
      modificadoPor: 'agente',
      userId: user.id,
      proyectoId: pliegos.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Revisar contrato Lisboa — firma urgente',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.URGENT,
      eisenhowerUrgente: true,
      eisenhowerImportante: true,
      contexto: Contexto.TRABAJO,
      etiquetas: ['contrato', 'lisboa'],
      fechaLimite: new Date('2026-03-10'),
      userId: user.id,
      proyectoId: garcia.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Carta de referencia a Cliente García',
      estado: EstadoItem.WAITING,
      prioridad: Prioridad.HIGH,
      eisenhowerUrgente: false,
      eisenhowerImportante: true,
      contexto: Contexto.TRABAJO,
      etiquetas: ['referencia'],
      userId: user.id,
      proyectoId: garcia.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Preparar agenda reunión Cliente García',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.HIGH,
      eisenhowerUrgente: true,
      eisenhowerImportante: false,
      contexto: Contexto.TRABAJO,
      etiquetas: ['reunión', 'agenda'],
      fechaLimite: new Date('2026-03-04'),
      userId: user.id,
      proyectoId: garcia.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Ideas para propuesta técnica pliego Barcelona',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.MEDIUM,
      eisenhowerUrgente: false,
      eisenhowerImportante: true,
      contexto: Contexto.TRABAJO,
      etiquetas: ['barcelona', 'propuesta'],
      fechaLimite: new Date('2026-03-14'),
      userId: user.id,
      proyectoId: pliegos.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Configurar integración OpenClaw con Gmail',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.MEDIUM,
      eisenhowerUrgente: false,
      eisenhowerImportante: true,
      contexto: Contexto.TRABAJO,
      etiquetas: ['integración', 'gmail'],
      userId: user.id,
      proyectoId: openclaw.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Documentar API de clasificación automática',
      estado: EstadoItem.IN_PROGRESS,
      prioridad: Prioridad.MEDIUM,
      eisenhowerUrgente: false,
      eisenhowerImportante: true,
      contexto: Contexto.TRABAJO,
      etiquetas: ['documentación', 'api'],
      userId: user.id,
      proyectoId: openclaw.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Reunión de seguimiento semanal equipo',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.LOW,
      eisenhowerUrgente: true,
      eisenhowerImportante: false,
      contexto: Contexto.TRABAJO,
      etiquetas: ['reunión', 'recurrente'],
      userId: user.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Actualizar estado en plataforma contratación',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.LOW,
      eisenhowerUrgente: true,
      eisenhowerImportante: false,
      contexto: Contexto.TRABAJO,
      etiquetas: ['administración'],
      userId: user.id,
      proyectoId: pliegos.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Leer newsletter de herramientas de productividad',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.NONE,
      eisenhowerUrgente: false,
      eisenhowerImportante: false,
      contexto: Contexto.PERSONAL,
      etiquetas: ['lectura'],
      userId: user.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Organizar carpetas de archivos locales',
      estado: EstadoItem.TODO,
      prioridad: Prioridad.NONE,
      eisenhowerUrgente: false,
      eisenhowerImportante: false,
      contexto: Contexto.PERSONAL,
      etiquetas: ['organización'],
      userId: user.id,
    },
  })
  await db.item.create({
    data: {
      tipo: TipoItem.TASK,
      titulo: 'Reunión kickoff Pliegos Q1',
      estado: EstadoItem.DONE,
      prioridad: Prioridad.HIGH,
      contexto: Contexto.TRABAJO,
      etiquetas: ['reunión', 'kickoff'],
      userId: user.id,
      proyectoId: pliegos.id,
    },
  })

  // AgenteFeed inicial
  await db.agenteFeed.createMany({
    data: [
      {
        tipo: 'digest',
        titulo: 'Resumen diario · 3 mar 2026',
        descripcion: 'He procesado 27 inputs hoy. Hay 3 tareas críticas en Pliegos Q1 con vencimiento esta semana. Detecté 4 emails sin procesar en OpenClaw Dev. Sugiero revisar la propuesta técnica para licitación municipal.',
        payload: { procesados: 27, accionesPendientes: 3, confianza: 94 },
        estado: 'aceptado',
        prioridad: 'medium',
      },
      {
        tipo: 'sugerencia',
        titulo: 'Detectado riesgo en propuesta técnica Pliegos Q1',
        descripcion: 'El pliego exige al menos 3 referencias de proyectos similares. Solo se han incluido 2 en el borrador actual. Hay que añadir una referencia adicional antes del 5 de marzo.',
        payload: { accion: 'revisar_referencias', itemTitulo: 'Revisar propuesta técnica', urgencia: 'alta' },
        estado: 'pendiente',
        prioridad: 'high',
      },
      {
        tipo: 'accion',
        titulo: '4 emails de OpenClaw Dev sin procesar',
        descripcion: 'He detectado 4 emails relacionados con OpenClaw Dev: 2 de beta testers con feedback, 1 reporte de bug en OAuth y 1 solicitud de demo. Puedo crear tareas para cada uno.',
        payload: { emails: 4, accion: 'crear_tareas', proyectoId: openclaw.id },
        estado: 'pendiente',
        prioridad: 'medium',
      },
      {
        tipo: 'sugerencia',
        titulo: 'Reunión Cliente García — preparar agenda',
        descripcion: 'Mañana a las 10:00 tienes reunión con Cliente García. Hay 5 puntos pendientes de la semana pasada. Puedo generar la agenda automáticamente.',
        payload: { accion: 'generar_agenda', fecha: '2026-03-05T10:00:00', puntosPendientes: 5 },
        estado: 'pendiente',
        prioridad: 'high',
      },
    ],
  })

  console.log('✅ Seed completado — usuario: ptavares@openclaw.io / contraseña: taskflow123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
