# IttiTalent — Workforce Intelligence Platform

> Plataforma de gestión de talento organizacional basada en competencias, con onboarding conversacional asistido por IA, evaluación dinámica de habilidades y rutas de aprendizaje personalizadas para equipos de People & Culture.

---

## Índice

1. [Visión del Producto](#1-visión-del-producto)
2. [Framework de Competencias](#2-framework-de-competencias)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Stack Tecnológico](#4-stack-tecnológico)
5. [Estructura de Archivos](#5-estructura-de-archivos)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [API: Procedimientos tRPC y Endpoints Express](#7-api-procedimientos-trpc-y-endpoints-express)
8. [Flujos de Usuario](#8-flujos-de-usuario)
9. [Decisiones de Desarrollo](#9-decisiones-de-desarrollo)
10. [Seguridad y Calidad](#10-seguridad-y-calidad)
11. [Historial de Sprints](#11-historial-de-sprints)
12. [Configuración Local](#12-configuración-local)

---

## 1. Visión del Producto

IttiTalent es una plataforma web interna diseñada para el equipo de **People & Culture (P&C)** de Itti Paraguay. Su propósito es transformar el proceso de incorporación y desarrollo de talento mediante tres capacidades centrales: un **onboarding conversacional** guiado por un agente de IA que construye el perfil de competencias del colaborador a través del diálogo, una **prueba de habilidades dinámica** (Proof of Skills) donde la IA genera preguntas adaptadas al rol y evalúa las respuestas en tiempo real con streaming, y un **plan de desarrollo personalizado** que identifica brechas por dominio y propone acciones concretas, recursos y estimaciones de tiempo.

La plataforma opera con dos roles diferenciados. El **Colaborador** accede a su propio proceso de onboarding, realiza su evaluación y consulta su ruta de aprendizaje. El **Administrador P&C** tiene visibilidad organizacional completa: métricas agregadas, filtros por área y departamento, vista de detalle por colaborador y exportación de resultados a CSV compatible con Excel.

---

## 2. Framework de Competencias

El eje estructural de toda la plataforma es un framework de dos dimensiones que se mantiene como fuente única de verdad en `shared/competency.ts`.

### 6 Macro Dominios Estratégicos

Cada evaluación y plan de desarrollo se organiza en torno a estos seis dominios, que representan las capacidades estratégicas de la organización:

| Dominio | Descripción | Puntaje Esperado (Default) |
|---|---|---|
| **Digital & GenAI** | Dominio de herramientas digitales e IA generativa | 70 |
| **Liderazgo Moderno** | Habilidades de conducción, influencia y desarrollo de equipos | 65 |
| **Operación Ágil** | Metodologías ágiles, gestión de proyectos y eficiencia operativa | 75 |
| **Customer Experience** | Orientación al cliente, diseño de experiencias y servicio | 70 |
| **Data-driven** | Análisis de datos, toma de decisiones basada en evidencia | 65 |
| **Innovación** | Pensamiento creativo, experimentación y gestión del cambio | 60 |

Los puntajes esperados por defecto pueden sobreescribirse por rol a través de la tabla `role_skill_expectations` en la base de datos.

### 4 Capas de Competencias

Las preguntas del Proof of Skills se clasifican además en cuatro capas que reflejan la profundidad y el alcance de cada competencia evaluada:

| Capa | Alcance |
|---|---|
| **Organizacionales** | Valores, cultura y comportamientos transversales a toda la organización |
| **Liderazgo** | Capacidades de conducción aplicables a roles con responsabilidad sobre personas |
| **Funcionales** | Conocimientos y habilidades técnicas específicas del área o rol |
| **Estratégicas Futuras** | Capacidades emergentes críticas para la evolución del negocio |

---

## 3. Arquitectura del Sistema

IttiTalent sigue una arquitectura **monorepo full-stack** con un único proceso Node.js que sirve tanto la API como los assets del frontend compilado. La comunicación entre cliente y servidor utiliza **tRPC**, lo que garantiza tipado de extremo a extremo sin necesidad de definir contratos REST separados.

```
┌─────────────────────────────────────────────────────────┐
│                     Cliente (React 19)                   │
│  Landing → Auth → Dashboard → Onboarding → PoS → Plan   │
│                  tRPC Client + SSE Hook                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS / tRPC / SSE
┌────────────────────▼────────────────────────────────────┐
│               Servidor Express (Node.js)                 │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  tRPC Router│  │ /api/assess/ │  │/api/admin/     │  │
│  │  (routers.ts│  │ stream (SSE) │  │export.csv      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│  ┌──────▼──────────────────────────────────▼──────────┐ │
│  │              Capa de Servicios                      │ │
│  │  llm.service  scoring.service  learning.service     │ │
│  │  streaming.service  audit.service                   │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │              Capa de Repositorios                   │ │
│  │  onboarding  assessment  competency  learning  user │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
└─────────────────────────┼───────────────────────────────┘
                          │ Drizzle ORM
┌─────────────────────────▼───────────────────────────────┐
│                  Base de Datos (TiDB / MySQL)             │
│  users  onboarding_sessions  competency_assessments      │
│  competency_domains  role_skill_expectations             │
│  competency_evidence  learning_plans                     │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  Manus AI Platform                       │
│  LLM (invokeLLM)  Storage (S3)  OAuth  Notifications    │
└─────────────────────────────────────────────────────────┘
```

### Principios arquitecturales aplicados

La arquitectura sigue los principios **SOLID** de manera explícita. Cada capa tiene una única responsabilidad: los routers tRPC solo orquestan, los servicios contienen la lógica de negocio y las llamadas a la IA, y los repositorios encapsulan exclusivamente el acceso a datos. Esta separación, establecida en el Sprint 1 como parte del RFC-001, permite testear cada capa de forma independiente y reemplazar implementaciones sin afectar las capas adyacentes.

---

## 4. Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| **Runtime** | Node.js | 22 LTS | Único proceso para servidor y build |
| **Frontend** | React | 19 | Concurrent features y Server Components ready |
| **Routing (FE)** | Wouter | 3.x | Alternativa ligera a React Router, sin dependencias |
| **Estado servidor** | TanStack Query + tRPC | 5.x / 11.x | Tipado E2E, sin boilerplate de contratos REST |
| **UI Components** | shadcn/ui + Radix UI | latest | Accesibilidad nativa, composable, sin CSS-in-JS |
| **Estilos** | Tailwind CSS | 4.x | Utilidades atómicas, tokens de diseño en CSS variables |
| **Animaciones** | Framer Motion | 12.x | Micro-interacciones físicamente intuitivas |
| **Gráficos** | Recharts | 2.x | Radar hexagonal de competencias, barras de brecha |
| **Backend** | Express | 4.x | Servidor HTTP, middleware SSE y endpoints REST |
| **API Layer** | tRPC | 11.x | Procedimientos tipados, sin generación de código |
| **ORM** | Drizzle ORM | 0.44 | Type-safe, migraciones explícitas, sin magia |
| **Base de datos** | TiDB (MySQL compatible) | — | Escalabilidad horizontal, compatibilidad MySQL |
| **Serialización** | SuperJSON | 1.x | `Date` y tipos complejos sin transformación manual |
| **Validación** | Zod | 4.x | Schemas compartidos entre cliente y servidor |
| **Testing** | Vitest | 2.x | Rápido, compatible con ESM, sin configuración extra |
| **Tipado** | TypeScript | 5.9 | Strict mode, inferencia de tipos desde el schema |
| **Bundler** | Vite | 7.x | HMR instantáneo, build optimizado para producción |
| **IA** | Manus LLM API | — | `invokeLLM` + streaming SSE para evaluación en tiempo real |
| **Auth** | Manus OAuth 2.0 | — | SSO corporativo, cookies HttpOnly firmadas con JWT |

### Paleta de diseño

El sistema visual de IttiTalent está definido como tokens CSS en `client/src/index.css`:

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#17B890` (verde turquesa) | Acciones primarias, branding, énfasis |
| `--font-sans` | Inter (Google Fonts) | Tipografía base de toda la interfaz |
| Tema | Claro (light) | Default corporativo |

---

## 5. Estructura de Archivos

```
itti-talent/
├── client/                          # Frontend React
│   ├── index.html                   # Entry point HTML (Inter font, analytics)
│   └── src/
│       ├── _core/hooks/useAuth.ts   # Hook de autenticación Manus OAuth
│       ├── components/
│       │   ├── HexRadarChart.tsx    # Gráfico radar hexagonal (Recharts)
│       │   ├── IttiLayout.tsx       # Layout con sidebar adaptado por rol
│       │   └── ui/                  # Componentes shadcn/ui (40+ componentes)
│       ├── hooks/
│       │   └── useAssessmentStream.ts  # Hook SSE para evaluación incremental
│       ├── pages/
│       │   ├── Home.tsx             # Landing page pública
│       │   ├── Onboarding.tsx       # Chat conversacional con agente AI
│       │   ├── ProofOfSkills.tsx    # Evaluación dinámica con streaming
│       │   ├── LearningPath.tsx     # Plan de desarrollo personalizado
│       │   ├── DashboardCollaborator.tsx  # Dashboard del colaborador
│       │   ├── DashboardAdmin.tsx   # Dashboard P&C con filtros y CSV
│       │   └── CollaboratorDetail.tsx     # Detalle por colaborador (admin)
│       ├── App.tsx                  # Rutas, guards y layout wrapper
│       └── index.css                # Tokens de diseño y tema global
│
├── server/
│   ├── _core/                       # Infraestructura del framework (no modificar)
│   │   ├── llm.ts                   # Helper invokeLLM (Manus AI)
│   │   ├── oauth.ts                 # Flujo OAuth 2.0
│   │   ├── trpc.ts                  # Contexto y procedimientos base
│   │   └── index.ts                 # Servidor Express principal
│   ├── middleware/
│   │   ├── permissions.ts           # RBAC: adminProcedure, assertOwnerOrAdmin
│   │   └── rate-limit.ts            # Rate limiting (120/min API, 20/min LLM)
│   ├── repositories/                # Acceso a datos (patrón Repository)
│   │   ├── onboarding.repository.ts
│   │   ├── assessment.repository.ts
│   │   ├── competency.repository.ts
│   │   ├── learning.repository.ts
│   │   └── user.repository.ts
│   ├── routes/                      # Endpoints Express (fuera de tRPC)
│   │   ├── assess-stream.ts         # POST /api/assess/stream (SSE)
│   │   └── export-csv.ts            # GET /api/admin/export.csv
│   ├── services/                    # Lógica de negocio y llamadas a IA
│   │   ├── llm.service.ts           # Prompts centralizados para todos los flujos
│   │   ├── scoring.service.ts       # Motor de scoring sin aleatoriedad
│   │   ├── streaming.service.ts     # Evaluación incremental con SSE
│   │   ├── learning.service.ts      # Generación de rutas de aprendizaje
│   │   └── audit.service.ts         # Registro estructurado de acciones
│   ├── routers.ts                   # Procedimientos tRPC (orquestación)
│   ├── db.ts                        # Helpers de base de datos (Drizzle)
│   └── *.test.ts                    # Tests Vitest por sprint
│
├── shared/
│   ├── competency.ts                # Fuente única: dominios, capas, tipos
│   ├── const.ts                     # Constantes compartidas (cookie name, etc.)
│   └── types.ts                     # Tipos compartidos cliente-servidor
│
├── drizzle/
│   ├── schema.ts                    # Definición de todas las tablas
│   └── migrations/                  # SQL generado por drizzle-kit
│
└── todo.md                          # Backlog y estado de sprints
```

---

## 6. Modelo de Datos

El schema completo se define en `drizzle/schema.ts` y se gestiona con migraciones explícitas generadas por `drizzle-kit`.

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `users` | Perfil de usuario con rol (`admin`/`user`), cargo y departamento | Base de todas las relaciones |
| `onboarding_sessions` | Historial de mensajes del chat de onboarding y perfil extraído | `userId → users` |
| `competency_assessments` | Evaluación completa: preguntas, respuestas, scores por dominio, resumen AI | `userId → users` |
| `competency_domains` | Catálogo de los 6 Macro Dominios (sembrado en DB, configurable) | — |
| `role_skill_expectations` | Puntaje esperado por dominio para cada rol de trabajo | `domainId → competency_domains` |
| `competency_evidence` | Evidencia AI por respuesta: frases clave, confianza, rationale, score | `assessmentId → competency_assessments` |
| `learning_plans` | Plan de desarrollo personalizado en JSON estructurado con estado de progreso | `userId → users`, `assessmentId → competency_assessments` |

### Estructura del JSON del plan de aprendizaje (`learning_plans.planJson`)

```typescript
{
  generatedAt: string,          // ISO timestamp
  collaboratorName: string,
  jobTitle: string,
  department: string,
  executiveSummary: string,     // Resumen narrativo generado por AI
  topPriorityDomain: string,    // Dominio con mayor brecha
  totalActions: number,
  estimatedTotalHours: number,
  domains: [{
    domain: MacroDomain,
    priority: "critical" | "moderate" | "on-track",
    currentScore: number,       // 0–100
    expectedScore: number,      // según rol
    gap: number,                // expectedScore - currentScore
    rationale: string,
    actions: [{
      id: string,
      title: string,
      description: string,
      resourceType: "course" | "book" | "practice" | "mentoring" | "project",
      resourceUrl?: string,
      estimatedHours: number,
      priority: "high" | "medium" | "low",
      completed: boolean,
      completedAt?: string
    }]
  }]
}
```

---

## 7. API: Procedimientos tRPC y Endpoints Express

### Procedimientos tRPC (`/api/trpc/*`)

| Namespace | Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|---|
| `auth` | `me` | Query | Público | Usuario autenticado actual |
| `auth` | `logout` | Mutation | Público | Limpia la cookie de sesión |
| `user` | `updateProfile` | Mutation | Protegido | Actualiza cargo y departamento |
| `onboarding` | `getSession` | Query | Protegido | Sesión de onboarding del usuario |
| `onboarding` | `sendMessage` | Mutation | Protegido | Envía mensaje al agente AI |
| `onboarding` | `reset` | Mutation | Protegido | Reinicia el onboarding |
| `assessment` | `getOrCreate` | Query | Protegido | Evaluación activa o nueva |
| `assessment` | `generateQuestions` | Mutation | Protegido | Genera preguntas dinámicas por AI |
| `assessment` | `submitAnswers` | Mutation | Protegido | Evalúa respuestas y guarda evidencia |
| `assessment` | `getResults` | Query | Protegido | Resultados y radar del colaborador |
| `assessment` | `reset` | Mutation | Protegido | Reinicia la evaluación |
| `learning` | `generate` | Mutation | Protegido | Genera plan de desarrollo (idempotente) |
| `learning` | `getMyPlan` | Query | Protegido | Plan activo del colaborador |
| `learning` | `updateActionStatus` | Mutation | Protegido | Marca acción como completada |
| `learning` | `getCollaboratorPlan` | Query | Admin | Plan de un colaborador específico |
| `admin` | `getStats` | Query | Admin | Métricas organizacionales agregadas |
| `admin` | `getCollaborators` | Query | Admin | Lista con filtros por área/estado |
| `admin` | `getDepartments` | Query | Admin | Departamentos únicos para filtros |
| `admin` | `getCollaboratorDetail` | Query | Admin | Detalle completo de un colaborador |

### Endpoints Express (fuera de tRPC)

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| `POST` | `/api/assess/stream` | JWT cookie | Evaluación incremental con SSE. Emite eventos `token`, `eval_complete`, `done`, `error` |
| `GET` | `/api/admin/export.csv` | JWT cookie + rol admin | Exporta todos los resultados a CSV con BOM Unicode para Excel |

---

## 8. Flujos de Usuario

### Colaborador — Flujo completo

```
Login (Manus OAuth)
  └─→ Redirección automática a /dashboard
        └─→ Onboarding conversacional (/onboarding)
              └─→ Agente AI extrae perfil de competencias de la conversación
                    └─→ Proof of Skills (/proof-of-skills)
                          └─→ AI genera preguntas por dominio y rol
                                └─→ Evaluación incremental (SSE por respuesta)
                                      └─→ Gráfico radar hexagonal + resumen AI
                                            └─→ Ruta de Aprendizaje (/learning-path)
                                                  └─→ Plan personalizado por dominio
                                                        └─→ Acciones con checkbox de progreso
```

### Administrador P&C — Flujo completo

```
Login (Manus OAuth)
  └─→ Redirección automática a /dashboard/admin
        ├─→ Métricas organizacionales (radar promedio, brechas por dominio)
        ├─→ Tabla de colaboradores con filtros (área, estado, búsqueda)
        ├─→ Exportar CSV → descarga inmediata compatible con Excel
        └─→ Detalle por colaborador (/dashboard/admin/collaborator/:id)
              ├─→ Radar personal + brechas
              ├─→ Perfil de onboarding
              └─→ Resumen AI de la evaluación
```

---

## 9. Decisiones de Desarrollo

### Por qué tRPC en lugar de REST

La decisión de usar tRPC como capa de comunicación elimina la necesidad de mantener contratos de API separados. Los tipos fluyen directamente desde los procedimientos del servidor hasta los hooks del cliente sin generación de código. Esto reduce la superficie de errores de integración y acelera el desarrollo de nuevas funcionalidades, ya que agregar un procedimiento en `server/routers.ts` lo hace disponible inmediatamente en el cliente con tipado completo.

### Por qué SSE en lugar de WebSockets para el streaming

El streaming de evaluación AI se implementó con **Server-Sent Events (SSE)** en lugar de WebSockets por tres razones: la comunicación es unidireccional (servidor → cliente), SSE funciona sobre HTTP estándar sin negociación de protocolo adicional, y es más simple de implementar con manejo correcto de reconexión y cierre de conexión. El endpoint `POST /api/assess/stream` recibe la pregunta y respuesta, abre el stream y emite tokens del LLM en tiempo real hasta el evento `done`.

### Por qué el scoring no usa `Math.random()`

El Sprint 1 eliminó completamente el scoring aleatorio que existía en el prototipo inicial. El `scoring.service.ts` implementa un motor determinístico que extrae `score`, `confidence`, `evidence` y `rationale` directamente de la respuesta estructurada del LLM (usando `response_format: json_schema`). Esto garantiza que los resultados sean reproducibles, auditables y justificados con evidencia textual del propio colaborador.

### Por qué el plan de aprendizaje se almacena como JSON

La tabla `learning_plans` almacena el plan completo como un campo `JSON` en lugar de normalizar cada acción en tablas separadas. Esta decisión se tomó porque el plan es una unidad cohesiva generada por AI que rara vez se consulta por partes individuales, y porque permite actualizar el estado de las acciones (completado/pendiente) con una única operación de lectura-modificación-escritura sin joins complejos. El campo `status` de la tabla refleja el estado agregado del plan para consultas rápidas.

### Arquitectura de capas (RFC-001)

El Sprint 1 estableció una separación explícita en tres capas: **Servicios** (lógica de negocio y llamadas a IA), **Repositorios** (acceso a datos con Drizzle) y **Routers** (orquestación tRPC). Esta decisión surgió de la observación de que el prototipo inicial tenía toda la lógica mezclada en `routers.ts`, lo que dificultaba el testing y la evolución del código. Cada capa puede ser testeada de forma independiente: los servicios con mocks del LLM, los repositorios con una base de datos de test, y los routers con callers de tRPC.

### RBAC con `adminProcedure`

El control de acceso se implementa como un middleware tRPC en `server/middleware/permissions.ts`. El procedimiento `adminProcedure` extiende `protectedProcedure` y lanza `TRPCError({ code: 'FORBIDDEN' })` si el rol del usuario no es `admin`. Esto garantiza que ningún procedimiento administrativo pueda ser invocado por un colaborador, independientemente de cómo se construya el cliente.

### Rate limiting en memoria

El `rate-limit.ts` implementa un rate limiter en memoria (sin Redis) con ventanas deslizantes: 120 req/min para la API general y 20 req/min para endpoints LLM. Esta decisión es apropiada para el volumen actual de uso interno. Si la plataforma escala a múltiples instancias, se deberá migrar a un store compartido (Redis).

---

## 10. Seguridad y Calidad

### Autenticación y autorización

La autenticación utiliza **Manus OAuth 2.0** con cookies `HttpOnly`, `Secure` y `SameSite=None` firmadas con `JWT_SECRET`. El flujo completo está implementado en `server/_core/oauth.ts` y nunca expone tokens al JavaScript del cliente. El rol del usuario se almacena en la base de datos y se verifica en cada procedimiento protegido a través del contexto tRPC (`ctx.user.role`).

### Audit trail

El `audit.service.ts` registra en formato JSON estructurado todas las acciones críticas: login, logout, inicio y completado de onboarding, generación y envío de evaluaciones, generación de planes de aprendizaje, acceso a detalles de colaboradores y exportaciones CSV. Cada registro incluye timestamp ISO, ID del actor, nombre, acción y entidad afectada.

### Testing

El proyecto mantiene **92 tests** distribuidos en 6 archivos, organizados por sprint. Los tests cubren el motor de scoring, el servicio de audit, las reglas de RBAC, el rate limiting, el Competency Engine, el streaming SSE, los filtros del dashboard admin, la exportación CSV y las rutas de aprendizaje.

```bash
pnpm test          # Ejecutar todos los tests
pnpm test --watch  # Modo watch durante desarrollo
```

---

## 11. Historial de Sprints

| Sprint | Foco | Entregables clave |
|---|---|---|
| **v1.0** | MVP funcional | Landing, auth, onboarding AI, Proof of Skills, radar hexagonal, dashboards |
| **Sprint 1** | Estabilización (RFC-001) | Servicios, repositorios, RBAC, rate limiting, audit trail, 17 tests |
| **Sprint 2** | Competency Engine | Tablas de dominios y expectativas, extracción real de perfil, scoring por rol, 28 tests |
| **Sprint 3** | Streaming SSE | Evaluación incremental en tiempo real, endpoint SSE, hook `useAssessmentStream`, 48 tests |
| **Sprint 4** | Dashboard P&C | Filtros por área/estado, detalle por colaborador, exportación CSV, 71 tests |
| **Sprint 5** | Rutas de Aprendizaje | Tabla `learning_plans`, servicio AI, página `LearningPath.tsx`, integración post-evaluación, 92 tests |

---

## 12. Configuración Local

### Prerequisitos

- Node.js 22+
- pnpm 10+
- Acceso a una instancia de Manus (para OAuth, LLM y base de datos)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/AlejoRoldan/workforceintelligence.git
cd workforceintelligence

# Instalar dependencias
pnpm install

# Configurar variables de entorno
# Las siguientes variables son inyectadas automáticamente por la plataforma Manus:
# DATABASE_URL, JWT_SECRET, VITE_APP_ID, OAUTH_SERVER_URL, VITE_OAUTH_PORTAL_URL
# BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, VITE_FRONTEND_FORGE_API_KEY
# OWNER_OPEN_ID, OWNER_NAME

# Ejecutar en modo desarrollo
pnpm dev

# Ejecutar tests
pnpm test

# Build de producción
pnpm build
```

### Migraciones de base de datos

```bash
# Generar SQL desde el schema
pnpm drizzle-kit generate

# Aplicar migraciones (usar webdev_execute_sql en producción Manus)
pnpm drizzle-kit migrate
```

### Promover un usuario a Administrador P&C

```sql
UPDATE users SET role = 'admin' WHERE email = 'usuario@itti.com.py';
```

---

*Desarrollado para Itti Paraguay — People & Culture Team*
*Stack: React 19 · tRPC 11 · Express 4 · Drizzle ORM · TiDB · Manus AI*
