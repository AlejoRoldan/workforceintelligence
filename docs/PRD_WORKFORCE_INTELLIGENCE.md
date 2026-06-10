# PRD — Workforce Intelligence / IttiTalent

## 1. Executive Summary

Workforce Intelligence, también referida como IttiTalent, es una plataforma web para People & Culture orientada a mapear, evaluar y desarrollar talento organizacional mediante un framework de competencias, onboarding conversacional asistido por IA, evaluaciones Proof of Skills y dashboards ejecutivos para colaboradores, líderes y administradores P&C.

El objetivo de este PRD es transformar el MVP actual en una plataforma enterprise confiable, segura, auditable y escalable, evitando resultados simulados o aleatorios y fortaleciendo la calidad técnica, la trazabilidad de la evaluación y el uso responsable de IA en decisiones relacionadas con talento humano.

## 2. Product Vision

Construir una plataforma de inteligencia de talento que permita a ITTI y a organizaciones aliadas comprender mejor las capacidades actuales de sus colaboradores, identificar brechas frente a roles objetivo, recomendar rutas de desarrollo y visualizar el potencial organizacional de forma ética, transparente y accionable.

## 3. Problem Statement

Las organizaciones suelen tener información fragmentada sobre las capacidades reales de sus equipos. Los LMS tradicionales registran avance en cursos, pero no siempre permiten comprender habilidades aplicadas, evidencias de desempeño, brechas por rol o potencial de movilidad interna.

Actualmente el MVP ya permite onboarding, evaluación y visualización de radar, pero presenta limitaciones críticas:

- El onboarding puede generar scores aleatorios o placeholder.
- La matriz de competencias esperadas por rol no está modelada.
- El RBAC es básico.
- La evaluación IA no tiene evidencia, confidence score ni revisión humana.
- La base de datos carece de relaciones fuertes e índices suficientes.
- No existe una política clara de uso responsable de datos laborales sensibles.

## 4. Goals

### 4.1 Product Goals

- Permitir a colaboradores construir un perfil de competencias inicial.
- Evaluar competencias mediante preguntas abiertas y evidencias.
- Comparar resultados contra expectativas por rol.
- Mostrar fortalezas, brechas y recomendaciones de desarrollo.
- Ofrecer dashboards para P&C con visión individual, grupal y organizacional.
- Preparar la plataforma para integración con IttiAcademy, HRIS y SSO corporativo.

### 4.2 Technical Goals

- Eliminar lógica placeholder o aleatoria en scoring.
- Modularizar backend y frontend.
- Fortalecer seguridad, validaciones y manejo de errores.
- Agregar auditoría, rate limiting y validación estricta de entorno.
- Aumentar cobertura de tests.
- Preparar arquitectura multi-tenant.

## 5. Non-Goals

- No reemplazar evaluaciones formales de desempeño laboral en esta fase.
- No automatizar decisiones de contratación, promoción o desvinculación.
- No construir todavía un LMS completo.
- No crear una herramienta de vigilancia laboral.
- No usar IA como fuente única de verdad sin evidencia y trazabilidad.

## 6. Personas

### 6.1 Colaborador

Usuario que realiza onboarding, responde evaluaciones, revisa su radar de competencias y recibe recomendaciones de desarrollo.

### 6.2 Administrador P&C

Usuario encargado de revisar métricas organizacionales, brechas por equipo, avance de colaboradores y calidad de los procesos de evaluación.

### 6.3 Líder de Equipo

Usuario futuro que podrá visualizar información agregada o autorizada sobre su equipo, sin acceder a datos sensibles innecesarios.

### 6.4 Super Admin

Usuario técnico/funcional con permisos para configurar tenants, roles, dominios de competencias, expectativas por rol y políticas de evaluación.

## 7. Functional Scope

### 7.1 MVP Fortalecido

- Autenticación y sesión segura.
- Perfil básico de usuario.
- Onboarding conversacional IA.
- Extracción estructurada de perfil de competencias.
- Evaluación Proof of Skills.
- Radar de 6 macrodominios.
- Dashboard colaborador.
- Dashboard P&C básico.
- Auditoría mínima.
- Tests esenciales.

### 7.2 Versión Enterprise

- RBAC avanzado.
- Multi-tenant.
- Matriz rol-competencia.
- Revisión humana opcional.
- Integración HRIS.
- Integración Okta / Microsoft Entra.
- Talent Pool.
- Recomendaciones de rutas de aprendizaje.
- Analíticas por área, rol, cohorte y tenant.

## 8. Competency Framework

### 8.1 Capas de Competencias

1. Organizacionales.
2. Liderazgo.
3. Funcionales.
4. Estratégicas Futuras.

### 8.2 Macrodominios

1. Digital & GenAI.
2. Liderazgo Moderno.
3. Operación Ágil.
4. Customer Experience.
5. Data-driven.
6. Innovación.

### 8.3 Resultado esperado por dominio

Cada dominio debe almacenar:

```ts
interface CompetencyScore {
  macroDomain: string;
  score: number; // 0-100
  expectedScore: number;
  gap: number;
  confidence: number; // 0-1
  evidence: string[];
  rationale: string;
  developmentSuggestions: string[];
  status: "evaluated" | "needs_review" | "failed";
}
```

## 9. User Stories Detalladas

## Épica 1 — Fundaciones técnicas y seguridad

### HU 1.1 — Validación estricta de variables de entorno

**Como** Tech Lead,  
**quiero** que la aplicación valide variables críticas al iniciar,  
**para** evitar despliegues inseguros o incompletos.

#### Criterios de aceptación

- La aplicación no inicia en producción si falta `JWT_SECRET`, `DATABASE_URL`, `OAUTH_SERVER_URL` o credenciales de IA.
- `JWT_SECRET` debe tener mínimo 32 caracteres.
- Los errores de entorno no deben exponer secretos.
- Debe existir un test unitario de validación exitosa y fallida.

#### Prioridad

Alta.

---

### HU 1.2 — Rate limiting para endpoints IA

**Como** administrador técnico,  
**quiero** limitar el número de llamadas IA por usuario,  
**para** controlar costos, evitar abuso y proteger la estabilidad del sistema.

#### Criterios de aceptación

- `onboarding.sendMessage` tiene límite por minuto y por día.
- `assessment.generateQuestions` tiene límite por día.
- `assessment.submitAnswers` tiene protección contra reintentos abusivos.
- El usuario recibe un mensaje claro cuando excede el límite.
- El evento queda registrado en logs técnicos sin contenido sensible.

#### Prioridad

Alta.

---

### HU 1.3 — Auditoría mínima de acciones críticas

**Como** P&C Admin,  
**quiero** que las acciones sensibles queden auditadas,  
**para** tener trazabilidad y confianza operativa.

#### Criterios de aceptación

- Se auditan accesos a dashboard admin.
- Se auditan cambios de rol.
- Se auditan evaluaciones completadas.
- Se auditan revisiones humanas.
- Los logs incluyen actor, acción, timestamp y entidad afectada.
- Los logs no almacenan respuestas completas del colaborador salvo justificación explícita.

#### Prioridad

Alta.

---

## Épica 2 — Modelo de datos enterprise

### HU 2.1 — Relaciones e índices de base de datos

**Como** desarrollador backend,  
**quiero** claves foráneas e índices en tablas críticas,  
**para** asegurar integridad y performance.

#### Criterios de aceptación

- `onboarding_sessions.userId` referencia `users.id`.
- `competency_assessments.userId` referencia `users.id`.
- Existen índices por `userId`, `status`, `createdAt`, `role` y `department`.
- Hay migración Drizzle versionada.
- Los tests o checks de schema validan las relaciones esperadas.

#### Prioridad

Alta.

---

### HU 2.2 — Tabla de dominios de competencia

**Como** Super Admin,  
**quiero** gestionar dominios de competencia desde datos persistentes,  
**para** evitar hardcoding y facilitar evolución del framework.

#### Criterios de aceptación

- Existe tabla `competency_domains`.
- Cada dominio tiene nombre, descripción, estado activo y orden.
- Los 6 dominios actuales se cargan como seed inicial.
- La evaluación usa dominios desde base de datos o servicio centralizado, no constantes duplicadas.

#### Prioridad

Alta.

---

### HU 2.3 — Matriz de expectativas por rol

**Como** P&C Admin,  
**quiero** definir niveles esperados por rol y dominio,  
**para** comparar resultados de forma contextual.

#### Criterios de aceptación

- Existe tabla `role_skill_expectations`.
- Cada registro incluye `roleId`, `domainId`, `expectedScore` y `weight`.
- El radar compara score actual vs score esperado según rol.
- Si no existe matriz para un rol, el sistema usa una configuración default marcada como tal.

#### Prioridad

Alta.

---

## Épica 3 — Onboarding conversacional confiable

### HU 3.1 — Onboarding con extracción estructurada

**Como** colaborador,  
**quiero** que mi conversación de onboarding produzca un perfil basado en evidencias,  
**para** recibir una lectura justa y útil de mis competencias.

#### Criterios de aceptación

- No existe uso de `Math.random()` para construir scores.
- Al terminar onboarding, se llama a un servicio de extracción estructurada.
- La extracción devuelve score, confidence, evidencia, rationale y sugerencias.
- Si la extracción falla, el estado queda `needs_review`.
- El usuario ve un mensaje claro de que el perfil está pendiente de revisión o procesamiento.

#### Prioridad

Crítica.

---

### HU 3.2 — Control de finalización del onboarding

**Como** sistema,  
**quiero** detectar la finalización del onboarding de forma confiable,  
**para** evitar cierres prematuros o incompletos.

#### Criterios de aceptación

- La finalización no depende únicamente de un marcador textual libre.
- El LLM debe responder con estructura validada o tool schema.
- El onboarding requiere mínimo de intercambios configurables.
- El sistema valida que las 4 capas de competencias hayan sido cubiertas.

#### Prioridad

Alta.

---

## Épica 4 — Proof of Skills

### HU 4.1 — Generación validada de preguntas

**Como** colaborador,  
**quiero** recibir preguntas relevantes a mi rol,  
**para** demostrar competencias aplicadas.

#### Criterios de aceptación

- Se generan exactamente 6 preguntas.
- Cada pregunta corresponde a un macrodominio distinto.
- Las preguntas se adaptan al rol del usuario cuando está disponible.
- Si la IA falla, se usan preguntas fallback marcadas como fallback.
- Las preguntas fallback no deben bloquear la evaluación, pero deben registrarse.

#### Prioridad

Alta.

---

### HU 4.2 — Evaluación con evidencia y confidence

**Como** colaborador,  
**quiero** que mis respuestas sean evaluadas con feedback transparente,  
**para** entender mis fortalezas y áreas de mejora.

#### Criterios de aceptación

- Cada respuesta obtiene score 0-100.
- Cada respuesta tiene feedback, rationale, evidence y confidence.
- Si falla la IA, no se asigna score artificial.
- La respuesta queda `needs_review` o `failed`.
- El radar solo usa respuestas evaluadas o revisadas.

#### Prioridad

Crítica.

---

### HU 4.3 — Revisión humana opcional

**Como** P&C Admin,  
**quiero** revisar evaluaciones inciertas o fallidas,  
**para** mejorar justicia, precisión y confianza.

#### Criterios de aceptación

- El dashboard muestra evaluaciones `needs_review`.
- El admin puede aprobar, ajustar o devolver una evaluación.
- Toda edición queda auditada.
- El colaborador puede ver si su evaluación fue validada automáticamente o revisada.

#### Prioridad

Media-Alta.

---

## Épica 5 — Dashboards

### HU 5.1 — Dashboard colaborador con interpretación clara

**Como** colaborador,  
**quiero** ver mi radar, fortalezas, brechas y recomendaciones,  
**para** comprender mi desarrollo profesional.

#### Criterios de aceptación

- El dashboard muestra score actual, esperado y brecha por dominio.
- Cada dominio permite ver evidencia y recomendaciones.
- Se diferencia evaluación completada, pendiente, fallida o en revisión.
- La interfaz evita lenguaje punitivo.

#### Prioridad

Alta.

---

### HU 5.2 — Dashboard P&C con vista organizacional

**Como** P&C Admin,  
**quiero** ver métricas agregadas de talento,  
**para** identificar brechas y oportunidades de desarrollo.

#### Criterios de aceptación

- Se muestran usuarios evaluados, pendientes y en revisión.
- Se muestran gaps promedio por dominio.
- Se puede filtrar por departamento, rol y estado.
- No se exponen respuestas completas sin permiso específico.
- Los datos agregados respetan tenant y permisos.

#### Prioridad

Alta.

---

## Épica 6 — RBAC y administración

### HU 6.1 — Roles formales

**Como** Super Admin,  
**quiero** configurar roles y permisos,  
**para** evitar cambios manuales en base de datos.

#### Criterios de aceptación

- Existen roles: `super_admin`, `pc_admin`, `manager`, `collaborator`, `viewer`.
- Los permisos se validan en backend.
- El frontend solo adapta la experiencia, no reemplaza la seguridad backend.
- Cambios de rol quedan auditados.

#### Prioridad

Alta.

---

### HU 6.2 — Gestión de usuarios desde panel admin

**Como** P&C Admin,  
**quiero** gestionar usuarios desde la plataforma,  
**para** evitar operación manual en base de datos.

#### Criterios de aceptación

- Admin puede ver usuarios.
- Admin puede actualizar rol permitido según sus permisos.
- Admin puede asignar departamento y cargo.
- Admin no puede modificar usuarios fuera de su tenant.

#### Prioridad

Media-Alta.

---

## Épica 7 — Testing y calidad

### HU 7.1 — Cobertura de servicios críticos

**Como** Tech Lead,  
**quiero** tests sobre scoring, onboarding y assessment,  
**para** reducir regresiones en lógica sensible.

#### Criterios de aceptación

- Tests para env validation.
- Tests para scoring service.
- Tests para radar service.
- Tests para fallos IA.
- Tests para admin guard.
- Tests para inputs inválidos.

#### Prioridad

Alta.

---

### HU 7.2 — CI básico

**Como** equipo de desarrollo,  
**quiero** ejecutar checks automáticamente en cada PR,  
**para** evitar merges con errores básicos.

#### Criterios de aceptación

- GitHub Actions ejecuta `pnpm install`, `pnpm check`, `pnpm test` y `pnpm build`.
- El PR no debe aprobarse si falla build o test.
- El workflow no expone secretos.

#### Prioridad

Media.

## 10. Metrics

### Product Metrics

- % de colaboradores con onboarding completado.
- % de evaluaciones completadas.
- % de evaluaciones en revisión.
- Brecha promedio por dominio.
- Tiempo promedio de finalización de onboarding.
- Tiempo promedio de evaluación.
- NPS o satisfacción del colaborador.

### Technical Metrics

- Tasa de errores IA.
- Latencia promedio de endpoints IA.
- Costos IA por usuario/evaluación.
- Cobertura de tests.
- Errores en producción.
- Tiempo de build.

## 11. Risks

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Scores incorrectos por IA | Alto | Evidencia, confidence y revisión humana |
| Datos sensibles expuestos | Alto | RBAC, auditoría, privacidad y logs seguros |
| Costos IA elevados | Medio-Alto | Rate limiting y monitoreo |
| Acoplamiento a Manus | Medio | Providers desacoplados |
| Baja adopción interna | Medio | UX clara y lenguaje no punitivo |
| Hardcoding del framework | Medio | Tablas configurables |

## 12. Release Plan

### Release 0.1 — Stabilization

- Env validation.
- Eliminar random scoring.
- Servicios de scoring y LLM separados.
- Tests críticos.

### Release 0.2 — Competency Model

- Tablas de dominios.
- Matriz por rol.
- Radar dinámico.
- Evidencias por score.

### Release 0.3 — Admin & Review

- Dashboard P&C mejorado.
- Revisión humana.
- Auditoría.
- RBAC inicial.

### Release 0.4 — Enterprise Readiness

- Multi-tenant.
- SSO corporativo.
- HRIS integration.
- CI/CD básico.

## 13. Definition of Done General

Una HU se considera terminada cuando:

- Tiene implementación funcional.
- Tiene validación de inputs.
- Tiene manejo de errores.
- Tiene tests suficientes.
- No introduce datos simulados como si fueran reales.
- Respeta RBAC.
- No expone información sensible en logs.
- Está documentada si afecta arquitectura o configuración.
