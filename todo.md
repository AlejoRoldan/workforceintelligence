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
