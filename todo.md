# IttiTalent — TODO

## Diseño Global
- [x] Tokens de color verde turquesa (#17B890) en index.css
- [x] Tipografía Inter via Google Fonts en index.html
- [x] Tema claro profesional como default
- [x] Micro-interacciones en botones (scale, transition)

## Base de Datos & Backend
- [x] Schema: tablas users, onboarding_sessions, competency_assessments
- [x] Migración SQL aplicada
- [x] Helpers en db.ts para cada tabla
- [x] Procedimientos tRPC: onboarding, assessment, dashboard, admin

## Landing Page
- [x] Hero section con branding IttiTalent y CTA
- [x] Sección de 6 Macro Dominios
- [x] Sección de características (4 capas de competencias)
- [x] Footer con branding

## Autenticación & Roles
- [x] Rol "Administrador P&C" y "Colaborador" diferenciados
- [x] Navegación adaptada por rol
- [x] Redirección post-login según rol

## Onboarding Conversacional AI
- [x] Chat adaptativo con interfaz conversacional propia
- [x] Sistema de mensajes con contexto de framework 4 capas
- [x] Guardado de sesión de onboarding en DB
- [x] Indicador de progreso por capa

## Proof of Skills
- [x] Generación dinámica de preguntas por AI según rol/perfil
- [x] Interfaz de evaluación con progreso y navegación
- [x] Evaluación de respuestas en tiempo real por AI
- [x] Guardado de resultados en DB

## Gráfico Radar Hexagonal
- [x] Componente HexRadarChart con recharts
- [x] 6 ejes = 6 Macro Dominios
- [x] Visualización de fortalezas (verde) y áreas de mejora (rojo)
- [x] Análisis narrativo de resultados (AI summary)

## Dashboard Colaborador
- [x] Estado de onboarding y prueba
- [x] Gráfico radar personal
- [x] Análisis de brechas (nivel actual vs esperado)
- [x] Resumen AI con fortalezas y áreas de mejora

## Dashboard P&C (Administrador)
- [x] Cards de métricas: total colaboradores, onboardings completados, promedio competencias
- [x] Lista de colaboradores con estado
- [x] Resultados agregados por competencia/macro dominio
- [x] Gráfico radar organizacional con brechas por dominio

## Mejoras Post-Entrega
- [x] Eliminar o implementar ruta /dashboard/admin/collaborators
- [x] Redirección post-login basada en rol (admin -> /dashboard/admin, user -> /dashboard)
- [x] Evaluación AI incremental por respuesta durante la prueba (Sprint 3 — streaming)

## GitHub
- [x] Subir código al repositorio AlejoRoldan/workforceintelligence

## Sprint 1 — Estabilización (RFC-001)
- [x] Crear shared/competency.ts como fuente única de tipos y constantes
- [x] Crear server/services/llm.service.ts con todos los prompts centralizados
- [x] Crear server/services/scoring.service.ts — motor de scoring sin Math.random()
- [x] Crear server/services/audit.service.ts con registro estructurado JSON
- [x] Crear server/repositories/onboarding.repository.ts
- [x] Crear server/repositories/assessment.repository.ts
- [x] Crear server/repositories/user.repository.ts
- [x] Crear server/middleware/rate-limit.ts (API: 120 req/min, LLM: 20 req/min)
- [x] Crear server/middleware/permissions.ts con adminProcedure y assertOwnerOrAdmin
- [x] Refactorizar server/routers.ts para delegar a servicios y repositorios
- [x] 17 tests pasando (scoring, audit, permissions, auth, RBAC, rate limit)
- [x] 0 errores TypeScript

## Sprint 2 — Competency Engine (RFC-001)
- [x] Agregar tabla competency_domains al schema
- [x] Agregar tabla role_skill_expectations al schema
- [x] Agregar tabla competency_evidence al schema
- [x] Migrar y aplicar SQL de las nuevas tablas
- [x] Poblar competency_domains con los 6 Macro Dominios por defecto
- [x] Crear server/repositories/competency.repository.ts
- [x] Implementar extracción real del perfil desde conversación de onboarding (LLM structured output)
- [x] Conectar scoring de assessment con expectativas por rol (role_skill_expectations)
- [x] Guardar competency_evidence por cada respuesta evaluada
- [x] Actualizar Dashboard Colaborador para mostrar expectativas por rol
- [x] Tests del Competency Engine (extracción, scoring con expectativas, evidence)

## Sprint 3 — Streaming SSE (Evaluación Incremental)
- [x] Crear server/services/streaming.service.ts con helper invokeLLMStream
- [x] Crear endpoint Express POST /api/assess/stream con autenticación JWT
- [x] Protocolo de eventos SSE: token, eval_complete, error, done
- [x] Crear client/src/hooks/useAssessmentStream.ts para consumir el SSE
- [x] Actualizar ProofOfSkills.tsx: feedback incremental por pregunta en tiempo real
- [x] Indicador visual de "AI evaluando..." con animación mientras llega el stream
- [x] Guardar resultado final en DB al completar el stream de cada respuesta
- [x] Tests del endpoint SSE y del hook de streaming (20 tests)
- [x] 0 errores TypeScript

## Sprint 4 — Dashboard P&C Enriquecido
- [x] Endpoint tRPC admin.getCollaborators con filtros por área/departamento/estado
- [x] Endpoint tRPC admin.getCollaboratorDetail con historial completo de evaluaciones
- [x] Endpoint tRPC admin.getDepartments para filtro dinámico de áreas
- [x] Endpoint Express GET /api/admin/export.csv para descarga directa del archivo
- [x] Filtros en UI: búsqueda por nombre, filtro por departamento, filtro por estado
- [x] Vista de detalle por colaborador: radar personal, brechas, perfil de onboarding, resumen AI
- [x] Botón "Exportar CSV" en Dashboard Admin con descarga inmediata (BOM para Excel)
- [x] Tabla de colaboradores con columnas: nombre, cargo/área, estados, puntaje, botón detalle
- [x] Tests del Sprint 4 (23 tests: CSV escaping, headers, filtros, scoring, audit)
- [x] 0 errores TypeScript — 71 tests pasando en 5 archivos

## Deuda Técnica Sprint 4 (Cerrada en Sprint Deuda)
- [x] Paginación real en tabla de colaboradores del Dashboard Admin
- [x] Columna "Fecha evaluación" en tabla de colaboradores
- [x] Historial completo de sesiones/evaluaciones por colaborador en vista detalle
- [x] Tests de integración para GET /api/admin/export.csv

## Sprint 5 — Rutas de Aprendizaje (Learning Paths)
- [x] Tabla learning_plans en schema Drizzle con campos: userId, assessmentId, planJson, status, generatedAt
- [x] Migración SQL aplicada para learning_plans
- [x] Repositorio learning.repository.ts con operaciones CRUD
- [x] Servicio learning.service.ts con generación AI de plan personalizado por brechas
- [x] Procedimiento tRPC learning.generate (idempotente, con enriquecimiento de expectativas por rol)
- [x] Procedimiento tRPC learning.getMyPlan para consultar plan del colaborador
- [x] Procedimiento tRPC learning.updateActionStatus con verificación de ownership
- [x] Página LearningPath.tsx con plan por dominio, recursos, acciones, progreso y stats
- [x] Integración en ProofOfSkills: botón "Mi Ruta de Aprendizaje" al finalizar
- [x] Card de progreso de ruta en Dashboard Colaborador (grid 3 columnas)
- [x] Nav item "Ruta de Aprendizaje" en sidebar + ruta /learning-path registrada
- [x] Tests del Sprint 5 — 21 tests: classifyGapPriority, hasSignificantGaps, structure, sorting, progress, preconditions, hours
- [x] 0 errores TypeScript — 92 tests pasando en 6 archivos

## Deuda Técnica Sprint 5 (Cerrada en Sprint Deuda)
- [x] Corregir getLearningPlanByUserId para devolver el plan más reciente (desc createdAt)
- [x] Implementar vista del learning plan en CollaboratorDetail.tsx para administradores P&C
- [x] Tests de integración para learning.getMyPlan y vista admin del plan

## Cierre de Deuda Técnica (Sprints 4 y 5)
- [x] Paginación real en tabla de colaboradores del Dashboard Admin (PAGE_SIZE=10, controles prev/next/números)
- [x] Columna "Fecha evaluación" en tabla de colaboradores (responsive, oculta en mobile)
- [x] Historial completo de sesiones/evaluaciones por colaborador en vista detalle
- [x] Tests de integración para exportación CSV (escapeCsvField, buildCsvRow, 8 tests)
- [x] Implementar vista del learning plan en CollaboratorDetail.tsx para administradores P&C
- [x] Tests de integración para learning.getMyPlan y admin.getCollaboratorPlan (29 tests en debt-closure.test.ts)
- [x] 121 tests pasando en 7 archivos, 0 errores TypeScript

## Sprint UX/UI — Componentes Modernos y Microinteracciones
- [x] Crear componente NumberTicker (contador animado con framer-motion)
- [x] Crear componente AnimatedProgressBar (barra con animación de entrada)
- [x] Crear componente GlassCard (card con glassmorphism)
- [x] Crear componente PageTransition (wrapper AnimatePresence para rutas)
- [x] Crear componente StaggerContainer/StaggerItem para listas en cascada
- [x] Refactorizar Dashboard Admin: Bento Grid, KPI counters animados, glassmorphism
- [x] Refactorizar Dashboard Colaborador: progress bars animadas, motion depth
- [x] Mejorar CollaboratorDetail: progress bars animadas, stagger en brechas
- [x] Mejorar IttiLayout: sidebar con microinteracciones, indicador activo animado
- [x] Agregar transiciones de página con AnimatePresence en App.tsx
- [x] Agregar clases CSS: .glass, .shimmer, .bento-card, .tabular-nums, prefers-reduced-motion
- [x] Verificar TypeScript (0 errores)
- [x] Ejecutar 121 tests (todos pasando)
- [x] Checkpoint y push a GitHub

## Sprint A — Funcionalidad de Negocio

### A1: Notificaciones en tiempo real
- [x] Tabla `notifications` en schema.ts (id, userId, type, title, message, read, createdAt)
- [x] Migración SQL y aplicar con webdev_execute_sql
- [x] Repositorio notifications.repository.ts (create, getUnread, markRead, markAllRead)
- [x] Procedimientos tRPC: notifications.getUnread, notifications.markRead, notifications.markAllRead
- [x] Trigger automático: al completar onboarding → notificar al admin
- [x] Trigger automático: al completar assessment → notificar al admin
- [x] Badge de notificaciones en IttiLayout (sidebar header) con contador animado
- [x] Panel de notificaciones (dropdown) con lista de eventos recientes

### A2: Exportación PDF por colaborador
- [x] Ruta Express GET /api/export/collaborator-pdf/:userId
- [x] Servicio pdf.service.ts con generación de reporte HTML → PDF usando html-pdf-node + Chromium
- [x] Reporte incluye: datos del colaborador, radar de competencias, brechas, plan de aprendizaje
- [x] Botón "Exportar PDF" en CollaboratorDetail (admin)
- [x] Estado de carga mientras genera el PDF

### A3: Vista comparativa de equipo por departamento
- [x] Procedimiento tRPC admin.getTeamComparison(department)
- [x] Página TeamComparison.tsx con tabla comparativa y gráfico de barras agrupadas
- [x] Filtro por departamento (Select) en TeamComparison
- [x] Ruta /dashboard/admin/team en App.tsx
- [x] Nav item "Comparativa Equipo" en IttiLayout para admins
- [x] 121 tests pasando (0 errores TypeScript)
