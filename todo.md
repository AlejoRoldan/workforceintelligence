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
- [ ] Evaluación AI incremental por respuesta durante la prueba

## GitHub
- [ ] Subir código al repositorio AlejoRoldan/workforceintelligence
