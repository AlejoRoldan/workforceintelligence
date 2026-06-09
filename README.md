# IttiTalent — Workforce Intelligence Platform

**Plataforma de gestión de talento organizacional basada en competencias, asistida por Inteligencia Artificial.**

Desarrollada para el equipo de **People & Culture (P&C)** de Itti Paraguay, IttiTalent permite mapear, evaluar y desarrollar el talento humano a través de un framework estructurado de competencias y 6 Macro Dominios estratégicos.

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Funcionalidades](#funcionalidades)
- [Framework de Competencias](#framework-de-competencias)
- [Roles de Usuario](#roles-de-usuario)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Variables de Entorno](#variables-de-entorno)
- [Ejecución Local](#ejecución-local)
- [Tests](#tests)

---

## Descripción General

IttiTalent es una aplicación web full-stack que combina:

- **Onboarding conversacional** asistido por un agente AI que perfile al colaborador dentro del framework de 4 capas de competencias.
- **Proof of Skills**: evaluación dinámica de competencias con preguntas generadas por AI según el rol y perfil del colaborador.
- **Gráfico Radar Hexagonal**: visualización del perfil de competencias por los 6 Macro Dominios, con comparación vs nivel esperado por rol.
- **Dashboard P&C**: vista organizacional para administradores con métricas, brechas y estado de cada colaborador.

---

## Funcionalidades

| Módulo | Descripción |
|---|---|
| Landing Page | Presentación de la plataforma con branding IttiTalent y CTA |
| Autenticación | OAuth via Manus con roles diferenciados por usuario |
| Onboarding AI | Chat conversacional con agente AI que cubre las 4 capas de competencias |
| Proof of Skills | 6 preguntas generadas dinámicamente por AI, una por Macro Dominio |
| Resultados | Gráfico radar hexagonal con fortalezas, brechas y resumen ejecutivo AI |
| Dashboard Colaborador | Estado personal, radar propio y análisis de brechas |
| Dashboard P&C | Métricas organizacionales, tabla de colaboradores y radar agregado |

---

## Framework de Competencias

### 4 Capas de Competencias

1. **Organizacionales** — Valores, cultura, trabajo en equipo, comunicación
2. **Liderazgo** — Gestión de equipos, toma de decisiones, influencia
3. **Funcionales** — Habilidades técnicas específicas del rol
4. **Estratégicas Futuras** — Adaptabilidad, innovación, pensamiento digital

### 6 Macro Dominios Estratégicos

| Dominio | Descripción |
|---|---|
| Digital & GenAI | Adopción de tecnología, inteligencia artificial generativa |
| Liderazgo Moderno | Liderazgo adaptativo, gestión de equipos distribuidos |
| Operación Ágil | Metodologías ágiles, eficiencia operacional |
| Customer Experience | Orientación al cliente, diseño de experiencias |
| Data-driven | Toma de decisiones basada en datos, analítica |
| Innovación | Pensamiento creativo, gestión del cambio |

---

## Roles de Usuario

| Rol | Acceso |
|---|---|
| **Colaborador** | Dashboard personal, Onboarding AI, Proof of Skills, resultados propios |
| **Administrador P&C** | Dashboard P&C con métricas organizacionales, vista de todos los colaboradores |

> La promoción a Administrador P&C se realiza actualizando el campo `role` a `"admin"` en la tabla `users` de la base de datos.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Componentes UI | shadcn/ui + Radix UI |
| Gráficos | Recharts (RadarChart hexagonal) |
| Routing | Wouter |
| Backend | Express 4 + tRPC 11 |
| Base de datos | MySQL / TiDB + Drizzle ORM |
| AI | Manus Built-in LLM API (invokeLLM) |
| Autenticación | Manus OAuth 2.0 |
| Testing | Vitest |

---

## Estructura del Proyecto

```
itti-talent/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx              # Landing page
│       │   ├── Onboarding.tsx        # Chat conversacional AI
│       │   ├── ProofOfSkills.tsx     # Evaluación de competencias
│       │   ├── DashboardCollaborator.tsx
│       │   └── DashboardAdmin.tsx    # Dashboard P&C
│       ├── components/
│       │   ├── IttiLayout.tsx        # Sidebar + navegación por rol
│       │   └── HexRadarChart.tsx     # Gráfico radar hexagonal
│       └── App.tsx                   # Rutas y layout principal
├── server/
│   ├── routers.ts                    # Procedimientos tRPC
│   ├── db.ts                         # Helpers de base de datos
│   └── itti.test.ts                  # Tests Vitest
├── drizzle/
│   └── schema.ts                     # Schema de tablas
└── README.md
```

---

## Variables de Entorno

Las siguientes variables son inyectadas automáticamente por la plataforma Manus:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a MySQL/TiDB |
| `JWT_SECRET` | Firma de cookies de sesión |
| `BUILT_IN_FORGE_API_KEY` | Clave para llamadas LLM server-side |
| `BUILT_IN_FORGE_API_URL` | URL de la API LLM |
| `VITE_APP_ID` | ID de la aplicación OAuth |
| `OAUTH_SERVER_URL` | URL del servidor OAuth |

---

## Ejecución Local

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Generar migraciones de base de datos
pnpm drizzle-kit generate

# Ejecutar tests
pnpm test
```

---

## Tests

```bash
pnpm test
```

Los tests cubren:
- `auth.logout` — limpieza de cookie de sesión
- `auth.me` — retorno del usuario autenticado
- `admin.getStats` — guard de rol FORBIDDEN para no-admins

---

*IttiTalent © 2026 — People & Culture · Itti Paraguay*
