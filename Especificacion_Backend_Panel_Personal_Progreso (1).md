**Panel Personal de Progreso**

Especificación técnica backend, modelo de datos, API y seguridad

*Versión: 1.0  
Fecha: 28 de junio de 2026  
Rol asumido: Senior Backend Engineer / Arquitectura de datos*

| **Elemento**            | **Definición**                                                                                                               |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------|
| **Decisión principal**  | Construir backend propio con NestJS + TypeScript, usando Prisma como ORM y Supabase PostgreSQL como base de datos principal. |
| **Frontend**            | Angular existente, desplegado preferentemente en Vercel.                                                                     |
| **Backend**             | NestJS en proyecto separado o monorepo, desplegable en Railway, Render, Fly.io o plataforma equivalente.                     |
| **Base de datos**       | Supabase PostgreSQL con UUID, relaciones, constraints, índices, vistas y RLS preparado.                                      |
| **Auth**                | Supabase Auth opcional a futuro, pero todo el modelo se diseña con user_id desde el inicio.                                  |
| **Principio de diseño** | Guardar eventos reales y calcular resúmenes mediante vistas, consultas o servicios backend.                                  |

# 1. Resumen ejecutivo

La app Panel Personal de Progreso debe nacer con una arquitectura
suficientemente sólida para uso personal, pero preparada para crecer.
Aunque el primer uso sea individual y sin login visible, el diseño debe
contemplar usuario, propiedad de datos, historial, seguridad futura y
separación clara entre presentación, lógica de negocio y persistencia.

La decisión recomendada es construir una arquitectura basada en
Angular + NestJS + Prisma + Supabase PostgreSQL. Angular mantiene la
interfaz existente. NestJS concentra la lógica de negocio, validaciones,
APIs y cálculos. Prisma proporciona una capa tipada de acceso a datos y
migraciones. Supabase PostgreSQL almacena la información relacional,
histórica y auditable.

Angular (UI)  
↓ HTTP/REST  
NestJS API (reglas de negocio, DTOs, validaciones, servicios)  
↓ Prisma  
Supabase PostgreSQL (tablas, relaciones, vistas, RLS, historial)

# 2. Justificación técnica de la decisión

| **Tecnología**      | **Uso en el proyecto** | **Justificación**                                                                                                                                                   |
|---------------------|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Angular             | Frontend               | La interfaz ya existe y está organizada por pantallas: Home, Money, Habits, Progress y Projects. Se mantiene el diseño visual actual.                               |
| TypeScript          | Lenguaje principal     | Permite compartir mentalidad, tipos y patrones entre frontend y backend. Reduce saltos de contexto.                                                                 |
| NestJS              | Backend                | Framework modular y escalable para Node.js. Su arquitectura por módulos, controladores, servicios e inyección de dependencias encaja bien con una app por dominios. |
| Prisma              | ORM                    | Permite modelar entidades, generar migraciones y trabajar con consultas tipadas hacia PostgreSQL.                                                                   |
| Supabase PostgreSQL | Base de datos          | PostgreSQL relacional con soporte para constraints, vistas, funciones, RLS y posible integración futura con Supabase Auth.                                          |
| Supabase Auth       | Autenticación futura   | Permite conectar user_id con auth.uid() cuando se active login real.                                                                                                |
| Vercel              | Deploy frontend        | Adecuado para frontend Angular. El backend puede alojarse separado si crece.                                                                                        |

NestJS se describe oficialmente como un framework progresivo de Node.js
para construir aplicaciones server-side eficientes, confiables y
escalables. Prisma documenta su integración con PostgreSQL y la
generación de Prisma Client tipado. Supabase documenta RLS como una
capacidad de PostgreSQL para proteger datos a nivel de fila, combinable
con Supabase Auth. Vercel documenta soporte para despliegue de Angular y
frameworks modernos.

# 3. Alcance y no alcance

| **Incluido en esta definición** | **Fuera de esta fase**            |
|---------------------------------|-----------------------------------|
| Arquitectura backend            | Programar proyecto NestJS todavía |
| Modelo entidad-relación         | Modificar diseño visual Angular   |
| Diccionario de datos            | Crear formularios Angular         |
| APIs REST esperadas             | Implementar login visible         |
| Reglas de negocio               | Crear integraciones bancarias     |
| Estrategia de RLS y seguridad   | Automatizaciones avanzadas        |
| Orden de implementación         | Publicación multiusuario          |

# 4. Arquitectura lógica propuesta

apps/  
web/ Angular existente  
api/ NestJS backend  
  
packages/  
shared/ Tipos y contratos compartidos futuros  
  
database/  
migrations/  
seeds/  
views/  
policies/

Se recomienda un monorepo organizado si el proyecto seguirá siendo
personal y controlado. Si se prefiere separar despliegues y ciclos de
vida, también es válido tener repos separados: frontend, backend y
database.

# 5. Perfil de usuario y propiedad de datos

Aunque al inicio no haya múltiples usuarios, el perfil de usuario sí es
importante porque define la propiedad de cada registro. Gastos, hábitos,
presupuestos, proyectos, deuda y ahorro pertenecen a un user_id. Esto
evita rediseñar la base cuando se active Supabase Auth o cuando el
proyecto crezca a multiusuario.

| **Concepto**   | **Decisión**                                                            |
|----------------|-------------------------------------------------------------------------|
| Usuario actual | Uso personal, un solo perfil operativo.                                 |
| Campo user_id  | Debe existir en las tablas principales desde el inicio.                 |
| profiles       | Tabla propia del dominio de la app, conectable a Supabase Auth después. |
| Auth futuro    | Supabase Auth podrá llenar/relacionar auth.users con profiles.          |
| RLS futuro     | Cada usuario solo podrá leer/escribir filas donde auth.uid() = user_id. |

# 6. Principios de modelado de datos

- Guardar eventos reales, no solo totales.

- Evitar duplicar totales si pueden calcularse desde eventos.

- Usar UUID como primary key.

- Usar numeric(12,2) para montos.

- Usar date para fechas de eventos financieros, hábitos y tareas.

- Usar timestamptz para created_at, updated_at y eventos técnicos.

- Mantener user_id en entidades principales.

- Usar constraints e índices desde el inicio.

- Permitir análisis histórico y auditoría.

- Separar catálogo, evento, periodo y resumen.

# 7. Módulos backend propuestos

| **Módulo NestJS** | **Responsabilidad**                                                                |
|-------------------|------------------------------------------------------------------------------------|
| profiles          | Perfil de usuario, configuración base, onboarding técnico.                         |
| settings          | Configuraciones personales: moneda, frecuencia de ingreso, días de pago, defaults. |
| money             | Gastos, categorías, movimientos financieros generales.                             |
| budgets           | Periodos presupuestales y límites por categoría.                                   |
| debts             | Deudas, pagos obligatorios, abonos extra y proyecciones.                           |
| savings           | Metas de ahorro, depósitos y retiros.                                              |
| habits            | Catálogo de hábitos, logs diarios y rachas.                                        |
| progress          | Heatmap, score diario y estados de progreso.                                       |
| projects          | Proyectos, tareas y presupuestos de proyecto.                                      |
| dashboard         | Consultas agregadas para Home y resumen general.                                   |
| auth              | Preparación para validación de token Supabase futuro.                              |

# 8. Modelo entidad-relación en texto

profiles  
├── app_settings  
├── income_events  
├── expense_categories  
│ └── expenses  
├── budget_periods  
│ └── budget_limits ── expense_categories  
├── recurring_obligations ── expense_categories  
├── debts  
│ └── debt_payments  
├── savings_goals  
│ └── savings_movements  
├── habits  
│ └── habit_logs  
├── daily_progress  
└── projects  
├── project_tasks  
└── project_budgets

# 9. Diccionario de datos

### 9.1 profiles

Tabla raíz del perfil de usuario dentro del dominio de la app. No
reemplaza auth.users, sino que lo complementa.

| **Campo**    | **Tipo PostgreSQL** | **Req.** | **Descripción**                                |
|--------------|---------------------|----------|------------------------------------------------|
| id           | uuid                | Sí       | PK del perfil.                                 |
| user_id      | uuid                | Sí       | ID futuro proveniente de Supabase Auth.        |
| display_name | text                | Sí       | Nombre visible del usuario.                    |
| email        | text                | Nullable | Correo opcional.                               |
| timezone     | text                | Sí       | Zona horaria, por defecto America/Mexico_City. |
| created_at   | timestamptz         | Sí       | Fecha de creación.                             |
| updated_at   | timestamptz         | Sí       | Fecha de última actualización.                 |

| **Aspecto**             | **Detalle**                                        |
|-------------------------|----------------------------------------------------|
| Clave primaria          | id                                                 |
| Claves foráneas         | N/A inicialmente; futuro user_id -\> auth.users.id |
| Constraints importantes | unique(user_id)                                    |
| Índices recomendados    | idx_profiles_user_id                               |

**Notas de uso:** Crear un perfil único por usuario. Si no hay login
todavía, se puede crear un user_id fijo provisional.

**Ejemplo de registro:**

display_name: "Usuario principal"  
timezone: "America/Mexico_City"

### 9.2 app_settings

Configuración personal que afecta presupuestos, cálculos y defaults de
la app.

| **Campo**                | **Tipo PostgreSQL** | **Req.** | **Descripción**                  |
|--------------------------|---------------------|----------|----------------------------------|
| id                       | uuid                | Sí       | PK.                              |
| user_id                  | uuid                | Sí       | Dueño.                           |
| currency                 | text                | Sí       | Moneda, ejemplo MXN.             |
| income_frequency         | text                | Sí       | weekly, biweekly, monthly.       |
| default_food_budget      | numeric(12,2)       | Sí       | Presupuesto default de comida.   |
| daily_transport_estimate | numeric(12,2)       | Sí       | Estimación diaria de transporte. |
| debt_payment_day         | smallint            | Nullable | Día del mes para pago de deuda.  |
| gym_payment_day          | smallint            | Nullable | Día del mes para pago de gym.    |
| created_at               | timestamptz         | Sí       | Creación.                        |
| updated_at               | timestamptz         | Sí       | Actualización.                   |

| **Aspecto**             | **Detalle**                                                                                                        |
|-------------------------|--------------------------------------------------------------------------------------------------------------------|
| Clave primaria          | id                                                                                                                 |
| Claves foráneas         | user_id -\> profiles.user_id                                                                                       |
| Constraints importantes | currency in ('MXN','USD'); income_frequency in ('weekly','biweekly','monthly'); días entre 1 y 31; unique(user_id) |
| Índices recomendados    | idx_app_settings_user_id                                                                                           |

**Notas de uso:** Debe existir un registro por usuario.

**Ejemplo de registro:**

currency: MXN  
income_frequency: biweekly  
default_food_budget: 700.00  
daily_transport_estimate: 20.00

### 9.3 income_events

Eventos reales de ingreso. Permiten calcular quincenas, meses y
disponibilidad.

| **Campo**   | **Tipo PostgreSQL** | **Req.** | **Descripción**             |
|-------------|---------------------|----------|-----------------------------|
| id          | uuid                | Sí       | PK.                         |
| user_id     | uuid                | Sí       | Dueño.                      |
| amount      | numeric(12,2)       | Sí       | Monto recibido.             |
| income_date | date                | Sí       | Fecha del ingreso.          |
| source      | text                | Sí       | salary, extra, gift, other. |
| note        | text                | Nullable | Descripción opcional.       |
| created_at  | timestamptz         | Sí       | Creación.                   |
| updated_at  | timestamptz         | Sí       | Actualización.              |

| **Aspecto**             | **Detalle**                                       |
|-------------------------|---------------------------------------------------|
| Clave primaria          | id                                                |
| Claves foráneas         | user_id -\> profiles.user_id                      |
| Constraints importantes | amount \> 0; source permitido                     |
| Índices recomendados    | idx_income_events_user_date(user_id, income_date) |

**Notas de uso:** Registrar cada ingreso real. Ingreso quincenal actual:
4730.

**Ejemplo de registro:**

amount: 4730.00  
income_date: 2026-07-01  
source: salary

### 9.4 expense_categories

Catálogo de categorías de gasto, ahorro o deuda.

| **Campo**  | **Tipo PostgreSQL** | **Req.** | **Descripción**                           |
|------------|---------------------|----------|-------------------------------------------|
| id         | uuid                | Sí       | PK.                                       |
| user_id    | uuid                | Sí       | Dueño.                                    |
| name       | text                | Sí       | Nombre visible.                           |
| slug       | text                | Sí       | Identificador único por usuario.          |
| type       | text                | Sí       | expense, saving, debt, income_adjustment. |
| is_fixed   | boolean             | Sí       | Indica si es gasto fijo.                  |
| is_active  | boolean             | Sí       | Permite ocultar sin borrar historial.     |
| color      | text                | Nullable | Color UI futuro.                          |
| icon       | text                | Nullable | Ícono UI futuro.                          |
| created_at | timestamptz         | Sí       | Creación.                                 |
| updated_at | timestamptz         | Sí       | Actualización.                            |

| **Aspecto**             | **Detalle**                                                     |
|-------------------------|-----------------------------------------------------------------|
| Clave primaria          | id                                                              |
| Claves foráneas         | user_id -\> profiles.user_id                                    |
| Constraints importantes | unique(user_id, slug); type permitido                           |
| Índices recomendados    | idx_expense_categories_user_slug; idx_expense_categories_active |

**Notas de uso:** Categorías iniciales: Comida, Transporte, Gym,
Nutriólogo, Ocio, Ahorro, Deuda, Imprevistos.

**Ejemplo de registro:**

name: "Comida"  
slug: "comida"  
type: "expense"  
is_fixed: false

### 9.5 expenses

Eventos reales de gasto. Es la fuente principal para análisis
financiero.

| **Campo**                   | **Tipo PostgreSQL** | **Req.** | **Descripción**                       |
|-----------------------------|---------------------|----------|---------------------------------------|
| id                          | uuid                | Sí       | PK.                                   |
| user_id                     | uuid                | Sí       | Dueño.                                |
| category_id                 | uuid                | Sí       | FK a expense_categories.              |
| amount                      | numeric(12,2)       | Sí       | Monto del gasto.                      |
| expense_date                | date                | Sí       | Fecha real.                           |
| note                        | text                | Nullable | Nota opcional.                        |
| source                      | text                | Sí       | manual, recurrent, imported.          |
| payment_method              | text                | Nullable | cash, debit, credit, transfer, other. |
| project_id                  | uuid                | Nullable | FK opcional a projects.               |
| related_debt_payment_id     | uuid                | Nullable | Liga opcional a pago de deuda.        |
| related_savings_movement_id | uuid                | Nullable | Liga opcional a movimiento de ahorro. |
| created_at                  | timestamptz         | Sí       | Creación.                             |
| updated_at                  | timestamptz         | Sí       | Actualización.                        |

| **Aspecto**             | **Detalle**                                                                                                                                                           |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Clave primaria          | id                                                                                                                                                                    |
| Claves foráneas         | category_id -\> expense_categories.id; project_id -\> projects.id; related_debt_payment_id -\> debt_payments.id; related_savings_movement_id -\> savings_movements.id |
| Constraints importantes | amount \> 0; source permitido                                                                                                                                         |
| Índices recomendados    | idx_expenses_user_date; idx_expenses_user_category_date; idx_expenses_project                                                                                         |

**Notas de uso:** No guardar totales. Guardar cada gasto real.

**Ejemplo de registro:**

amount: 95.00  
category: Comida  
expense_date: 2026-06-28  
note: "Comida"  
source: manual

### 9.6 budget_periods

Periodos de presupuesto: semanal, quincenal, mensual o anual.

| **Campo**       | **Tipo PostgreSQL** | **Req.** | **Descripción**                    |
|-----------------|---------------------|----------|------------------------------------|
| id              | uuid                | Sí       | PK.                                |
| user_id         | uuid                | Sí       | Dueño.                             |
| name            | text                | Sí       | Nombre visible.                    |
| period_type     | text                | Sí       | weekly, biweekly, monthly, yearly. |
| start_date      | date                | Sí       | Inicio del periodo.                |
| end_date        | date                | Sí       | Fin del periodo.                   |
| expected_income | numeric(12,2)       | Nullable | Ingreso esperado.                  |
| status          | text                | Sí       | planned, active, closed.           |
| created_at      | timestamptz         | Sí       | Creación.                          |
| updated_at      | timestamptz         | Sí       | Actualización.                     |

| **Aspecto**             | **Detalle**                                                      |
|-------------------------|------------------------------------------------------------------|
| Clave primaria          | id                                                               |
| Claves foráneas         | user_id -\> profiles.user_id                                     |
| Constraints importantes | end_date \>= start_date; period_type permitido; status permitido |
| Índices recomendados    | idx_budget_periods_user_dates; idx_budget_periods_user_status    |

**Notas de uso:** La quincena debe definirse por rango real, no
solamente por mes.

**Ejemplo de registro:**

name: "Quincena 1 Julio 2026"  
period_type: biweekly  
start_date: 2026-07-01  
end_date: 2026-07-15  
expected_income: 4730.00

### 9.7 budget_limits

Límites de gasto por categoría dentro de un periodo.

| **Campo**        | **Tipo PostgreSQL** | **Req.** | **Descripción**          |
|------------------|---------------------|----------|--------------------------|
| id               | uuid                | Sí       | PK.                      |
| user_id          | uuid                | Sí       | Dueño.                   |
| budget_period_id | uuid                | Sí       | FK a budget_periods.     |
| category_id      | uuid                | Sí       | FK a expense_categories. |
| limit_amount     | numeric(12,2)       | Sí       | Límite asignado.         |
| created_at       | timestamptz         | Sí       | Creación.                |
| updated_at       | timestamptz         | Sí       | Actualización.           |

| **Aspecto**             | **Detalle**                                                                   |
|-------------------------|-------------------------------------------------------------------------------|
| Clave primaria          | id                                                                            |
| Claves foráneas         | budget_period_id -\> budget_periods.id; category_id -\> expense_categories.id |
| Constraints importantes | limit_amount \>= 0; unique(budget_period_id, category_id)                     |
| Índices recomendados    | idx_budget_limits_period; idx_budget_limits_category                          |

**Notas de uso:** Permite detectar categorías excedidas o en riesgo.

**Ejemplo de registro:**

category: Comida  
limit_amount: 1400.00

### 9.8 recurring_obligations

Pagos recurrentes o semi-recurrentes que deben considerarse al calcular
disponibilidad.

| **Campo**     | **Tipo PostgreSQL** | **Req.** | **Descripción**                           |
|---------------|---------------------|----------|-------------------------------------------|
| id            | uuid                | Sí       | PK.                                       |
| user_id       | uuid                | Sí       | Dueño.                                    |
| category_id   | uuid                | Nullable | Categoría asociada.                       |
| name          | text                | Sí       | Nombre del pago.                          |
| amount        | numeric(12,2)       | Sí       | Monto estimado.                           |
| frequency     | text                | Sí       | daily, weekly, biweekly, monthly, custom. |
| due_day       | smallint            | Nullable | Día del mes.                              |
| next_due_date | date                | Nullable | Próxima fecha estimada.                   |
| is_required   | boolean             | Sí       | Si debe apartarse obligatoriamente.       |
| is_active     | boolean             | Sí       | Si está activa.                           |
| created_at    | timestamptz         | Sí       | Creación.                                 |
| updated_at    | timestamptz         | Sí       | Actualización.                            |

| **Aspecto**             | **Detalle**                                             |
|-------------------------|---------------------------------------------------------|
| Clave primaria          | id                                                      |
| Claves foráneas         | category_id -\> expense_categories.id                   |
| Constraints importantes | amount \>= 0; frequency permitida; due_day entre 1 y 31 |
| Índices recomendados    | idx_recurring_user_next_due; idx_recurring_user_active  |

**Notas de uso:** Útil para Gym, deuda, nutriólogo y transporte
estimado.

**Ejemplo de registro:**

name: "Gym"  
amount: 450.00  
frequency: monthly  
due_day: 19  
is_required: true

### 9.9 debts

Registro de deudas activas, pagadas o pausadas.

| **Campo**       | **Tipo PostgreSQL** | **Req.** | **Descripción**                           |
|-----------------|---------------------|----------|-------------------------------------------|
| id              | uuid                | Sí       | PK.                                       |
| user_id         | uuid                | Sí       | Dueño.                                    |
| name            | text                | Sí       | Nombre de deuda.                          |
| initial_amount  | numeric(12,2)       | Sí       | Monto inicial o saldo inicial registrado. |
| current_amount  | numeric(12,2)       | Sí       | Saldo operativo actual.                   |
| minimum_payment | numeric(12,2)       | Sí       | Pago obligatorio.                         |
| payment_day     | smallint            | Sí       | Día de pago.                              |
| interest_rate   | numeric(5,2)        | Nullable | Tasa futura si aplica.                    |
| status          | text                | Sí       | active, paid, paused.                     |
| created_at      | timestamptz         | Sí       | Creación.                                 |
| updated_at      | timestamptz         | Sí       | Actualización.                            |

| **Aspecto**             | **Detalle**                                              |
|-------------------------|----------------------------------------------------------|
| Clave primaria          | id                                                       |
| Claves foráneas         | user_id -\> profiles.user_id                             |
| Constraints importantes | montos \>= 0; payment_day entre 1 y 31; status permitido |
| Índices recomendados    | idx_debts_user_status                                    |

**Notas de uso:** current_amount es cache operativo, pero debe poder
recalcularse desde debt_payments.

**Ejemplo de registro:**

name: "Deuda bancaria"  
initial_amount: 10015.00  
current_amount: 10015.00  
minimum_payment: 2372.85  
payment_day: 15

### 9.10 debt_payments

Historial de pagos obligatorios, abonos extra o ajustes a deuda.

| **Campo**    | **Tipo PostgreSQL** | **Req.** | **Descripción**              |
|--------------|---------------------|----------|------------------------------|
| id           | uuid                | Sí       | PK.                          |
| user_id      | uuid                | Sí       | Dueño.                       |
| debt_id      | uuid                | Sí       | FK a debts.                  |
| amount       | numeric(12,2)       | Sí       | Monto pagado.                |
| payment_date | date                | Sí       | Fecha de pago.               |
| payment_type | text                | Sí       | required, extra, adjustment. |
| note         | text                | Nullable | Nota opcional.               |
| created_at   | timestamptz         | Sí       | Creación.                    |
| updated_at   | timestamptz         | Sí       | Actualización.               |

| **Aspecto**             | **Detalle**                                              |
|-------------------------|----------------------------------------------------------|
| Clave primaria          | id                                                       |
| Claves foráneas         | debt_id -\> debts.id                                     |
| Constraints importantes | amount \> 0; payment_type permitido                      |
| Índices recomendados    | idx_debt_payments_user_date; idx_debt_payments_debt_date |

**Notas de uso:** Puede vincularse con expenses para que el pago
aparezca como salida financiera.

**Ejemplo de registro:**

amount: 2372.85  
payment_date: 2026-07-15  
payment_type: required

### 9.11 savings_goals

Metas de ahorro personales.

| **Campo**      | **Tipo PostgreSQL** | **Req.** | **Descripción**                       |
|----------------|---------------------|----------|---------------------------------------|
| id             | uuid                | Sí       | PK.                                   |
| user_id        | uuid                | Sí       | Dueño.                                |
| name           | text                | Sí       | Nombre de meta.                       |
| target_amount  | numeric(12,2)       | Sí       | Monto objetivo.                       |
| current_amount | numeric(12,2)       | Sí       | Monto operativo actual.               |
| target_date    | date                | Nullable | Fecha objetivo.                       |
| status         | text                | Sí       | active, completed, paused, cancelled. |
| created_at     | timestamptz         | Sí       | Creación.                             |
| updated_at     | timestamptz         | Sí       | Actualización.                        |

| **Aspecto**             | **Detalle**                                                |
|-------------------------|------------------------------------------------------------|
| Clave primaria          | id                                                         |
| Claves foráneas         | user_id -\> profiles.user_id                               |
| Constraints importantes | target_amount \> 0; current_amount \>= 0; status permitido |
| Índices recomendados    | idx_savings_goals_user_status                              |

**Notas de uso:** current_amount debe poder recalcularse desde
savings_movements.

**Ejemplo de registro:**

name: "Fondo de emergencia"  
target_amount: 5000.00  
current_amount: 0.00

### 9.12 savings_movements

Depósitos, retiros y ajustes relacionados con metas de ahorro.

| **Campo**       | **Tipo PostgreSQL** | **Req.** | **Descripción**                  |
|-----------------|---------------------|----------|----------------------------------|
| id              | uuid                | Sí       | PK.                              |
| user_id         | uuid                | Sí       | Dueño.                           |
| savings_goal_id | uuid                | Sí       | FK a savings_goals.              |
| amount          | numeric(12,2)       | Sí       | Monto.                           |
| movement_date   | date                | Sí       | Fecha del movimiento.            |
| movement_type   | text                | Sí       | deposit, withdrawal, adjustment. |
| note            | text                | Nullable | Nota opcional.                   |
| created_at      | timestamptz         | Sí       | Creación.                        |
| updated_at      | timestamptz         | Sí       | Actualización.                   |

| **Aspecto**             | **Detalle**                                                      |
|-------------------------|------------------------------------------------------------------|
| Clave primaria          | id                                                               |
| Claves foráneas         | savings_goal_id -\> savings_goals.id                             |
| Constraints importantes | amount \> 0; movement_type permitido                             |
| Índices recomendados    | idx_savings_movements_user_date; idx_savings_movements_goal_date |

**Notas de uso:** Puede vincularse con expenses si se desea tratar
ahorro como salida.

**Ejemplo de registro:**

amount: 300.00  
movement_date: 2026-07-01  
movement_type: deposit

### 9.13 habits

Catálogo de hábitos diarios o recurrentes.

| **Campo**    | **Tipo PostgreSQL** | **Req.** | **Descripción**                                |
|--------------|---------------------|----------|------------------------------------------------|
| id           | uuid                | Sí       | PK.                                            |
| user_id      | uuid                | Sí       | Dueño.                                         |
| name         | text                | Sí       | Nombre del hábito.                             |
| description  | text                | Nullable | Descripción.                                   |
| moment       | text                | Sí       | morning, afternoon, night, anytime.            |
| is_financial | boolean             | Sí       | Indica si pertenece al módulo financiero.      |
| is_key_habit | boolean             | Sí       | Indica si cuenta como hábito clave para score. |
| is_active    | boolean             | Sí       | Activo/inactivo.                               |
| created_at   | timestamptz         | Sí       | Creación.                                      |
| updated_at   | timestamptz         | Sí       | Actualización.                                 |

| **Aspecto**             | **Detalle**                             |
|-------------------------|-----------------------------------------|
| Clave primaria          | id                                      |
| Claves foráneas         | user_id -\> profiles.user_id            |
| Constraints importantes | unique(user_id, name); moment permitido |
| Índices recomendados    | idx_habits_user_active                  |

**Notas de uso:** Ejemplos: Gym, Registrar gastos, Revisar presupuesto.

**Ejemplo de registro:**

name: "Registrar gastos"  
moment: night  
is_financial: true  
is_key_habit: true

### 9.14 habit_logs

Registro diario del cumplimiento de hábitos.

| **Campo**  | **Tipo PostgreSQL** | **Req.** | **Descripción**             |
|------------|---------------------|----------|-----------------------------|
| id         | uuid                | Sí       | PK.                         |
| user_id    | uuid                | Sí       | Dueño.                      |
| habit_id   | uuid                | Sí       | FK a habits.                |
| log_date   | date                | Sí       | Fecha del registro.         |
| status     | text                | Sí       | completed, skipped, missed. |
| note       | text                | Nullable | Nota opcional.              |
| created_at | timestamptz         | Sí       | Creación.                   |
| updated_at | timestamptz         | Sí       | Actualización.              |

| **Aspecto**             | **Detalle**                                           |
|-------------------------|-------------------------------------------------------|
| Clave primaria          | id                                                    |
| Claves foráneas         | habit_id -\> habits.id                                |
| Constraints importantes | unique(user_id, habit_id, log_date); status permitido |
| Índices recomendados    | idx_habit_logs_user_date; idx_habit_logs_habit_date   |

**Notas de uso:** Un hábito solo debe tener un log por día.

**Ejemplo de registro:**

habit: Gym  
log_date: 2026-06-28  
status: completed

### 9.15 daily_progress

Snapshot recalculable para alimentar el heatmap anual.

| **Campo**                | **Tipo PostgreSQL** | **Req.** | **Descripción**                       |
|--------------------------|---------------------|----------|---------------------------------------|
| id                       | uuid                | Sí       | PK.                                   |
| user_id                  | uuid                | Sí       | Dueño.                                |
| progress_date            | date                | Sí       | Día del score.                        |
| score                    | smallint            | Sí       | Puntos del día.                       |
| value                    | smallint            | Sí       | Nivel 0 a 4.                          |
| state                    | text                | Sí       | empty, low, medium, good, excellent.  |
| expense_registered       | boolean             | Sí       | Registró al menos un gasto.           |
| within_daily_limit       | boolean             | Sí       | No excedió límite diario.             |
| habits_completion_rate   | numeric(5,2)        | Sí       | Porcentaje de hábitos completados.    |
| financial_key_habit_done | boolean             | Sí       | Hábito financiero clave cumplido.     |
| saved_or_paid_debt       | boolean             | Sí       | Ahorró o abonó deuda.                 |
| filter_type              | text                | Sí       | general, habits, money, saving, debt. |
| created_at               | timestamptz         | Sí       | Creación.                             |
| updated_at               | timestamptz         | Sí       | Actualización.                        |

| **Aspecto**             | **Detalle**                                                    |
|-------------------------|----------------------------------------------------------------|
| Clave primaria          | id                                                             |
| Claves foráneas         | user_id -\> profiles.user_id                                   |
| Constraints importantes | value entre 0 y 4; unique(user_id, progress_date, filter_type) |
| Índices recomendados    | idx_daily_progress_user_filter_date                            |

**Notas de uso:** No reemplaza eventos reales. Debe poder recalcularse.

**Ejemplo de registro:**

progress_date: 2026-06-28  
score: 4  
value: 4  
state: excellent

### 9.16 projects

Proyectos personales activos, pausados o completados.

| **Campo**   | **Tipo PostgreSQL** | **Req.** | **Descripción**                                |
|-------------|---------------------|----------|------------------------------------------------|
| id          | uuid                | Sí       | PK.                                            |
| user_id     | uuid                | Sí       | Dueño.                                         |
| name        | text                | Sí       | Nombre del proyecto.                           |
| description | text                | Nullable | Descripción.                                   |
| status      | text                | Sí       | planned, active, paused, completed, cancelled. |
| priority    | text                | Sí       | low, medium, high, critical.                   |
| start_date  | date                | Nullable | Fecha inicio.                                  |
| target_date | date                | Nullable | Fecha objetivo.                                |
| created_at  | timestamptz         | Sí       | Creación.                                      |
| updated_at  | timestamptz         | Sí       | Actualización.                                 |

| **Aspecto**             | **Detalle**                                     |
|-------------------------|-------------------------------------------------|
| Clave primaria          | id                                              |
| Claves foráneas         | user_id -\> profiles.user_id                    |
| Constraints importantes | status y priority permitidos                    |
| Índices recomendados    | idx_projects_user_status; idx_projects_priority |

**Notas de uso:** El progreso se calcula desde project_tasks.

**Ejemplo de registro:**

name: "Panel Personal de Progreso"  
status: active  
priority: high

### 9.17 project_tasks

Tareas de proyectos personales.

| **Campo**    | **Tipo PostgreSQL** | **Req.** | **Descripción**                     |
|--------------|---------------------|----------|-------------------------------------|
| id           | uuid                | Sí       | PK.                                 |
| user_id      | uuid                | Sí       | Dueño.                              |
| project_id   | uuid                | Sí       | FK a projects.                      |
| title        | text                | Sí       | Título.                             |
| description  | text                | Nullable | Descripción.                        |
| status       | text                | Sí       | todo, in_progress, done, cancelled. |
| priority     | text                | Sí       | low, medium, high, critical.        |
| due_date     | date                | Nullable | Fecha límite.                       |
| completed_at | timestamptz         | Nullable | Fecha/hora de completado.           |
| created_at   | timestamptz         | Sí       | Creación.                           |
| updated_at   | timestamptz         | Sí       | Actualización.                      |

| **Aspecto**             | **Detalle**                                                                     |
|-------------------------|---------------------------------------------------------------------------------|
| Clave primaria          | id                                                                              |
| Claves foráneas         | project_id -\> projects.id                                                      |
| Constraints importantes | status y priority permitidos                                                    |
| Índices recomendados    | idx_project_tasks_user_project; idx_project_tasks_status; idx_project_tasks_due |

**Notas de uso:** Al marcar done debe llenarse completed_at.

**Ejemplo de registro:**

title: "Definir modelo de datos"  
status: done  
priority: high

### 9.18 project_budgets

Presupuestos por proyecto o concepto.

| **Campo**      | **Tipo PostgreSQL** | **Req.** | **Descripción**          |
|----------------|---------------------|----------|--------------------------|
| id             | uuid                | Sí       | PK.                      |
| user_id        | uuid                | Sí       | Dueño.                   |
| project_id     | uuid                | Sí       | FK a projects.           |
| name           | text                | Sí       | Concepto.                |
| planned_amount | numeric(12,2)       | Sí       | Monto planeado.          |
| spent_amount   | numeric(12,2)       | Sí       | Monto operativo gastado. |
| notes          | text                | Nullable | Notas.                   |
| created_at     | timestamptz         | Sí       | Creación.                |
| updated_at     | timestamptz         | Sí       | Actualización.           |

| **Aspecto**             | **Detalle**                              |
|-------------------------|------------------------------------------|
| Clave primaria          | id                                       |
| Claves foráneas         | project_id -\> projects.id               |
| Constraints importantes | planned_amount \>= 0; spent_amount \>= 0 |
| Índices recomendados    | idx_project_budgets_project              |

**Notas de uso:** spent_amount puede calcularse desde
expenses.project_id en versión más limpia.

**Ejemplo de registro:**

name: "Infraestructura"  
planned_amount: 0.00  
spent_amount: 0.00

# 10. Reglas de negocio principales

| **Área**    | **Regla**                                                                                            |
|-------------|------------------------------------------------------------------------------------------------------|
| Gastos      | Todo gasto debe tener monto, categoría, fecha y source. No se guardan totales como fuente principal. |
| Presupuesto | Un periodo define el rango y los límites por categoría. El gasto usado se calcula sumando expenses.  |
| Deuda       | El historial vive en debt_payments. current_amount es operativo y debe ser recalculable.             |
| Ahorro      | El progreso de una meta se calcula desde depósitos y retiros.                                        |
| Hábitos     | Solo puede existir un habit_log por hábito y fecha.                                                  |
| Heatmap     | daily_progress es snapshot recalculable; la fuente real son eventos.                                 |
| Proyectos   | El progreso se calcula desde tareas completadas.                                                     |
| Usuario     | Toda entidad principal pertenece a user_id.                                                          |

# 11. Máquina de estados del heatmap

| **Condición**                   | **Puntos** |
|---------------------------------|------------|
| Registró al menos un gasto      | +1         |
| No excedió límite diario        | +1         |
| Completó 60% o más de hábitos   | +1         |
| Cumplió hábito financiero clave | +1         |
| Ahorró o abonó deuda            | +1 extra   |

| **Score** | **Value** | **Estado** |
|-----------|-----------|------------|
| 0         | 0         | empty      |
| 1         | 1         | low        |
| 2         | 2         | medium     |
| 3         | 3         | good       |
| 4 o más   | 4         | excellent  |

Filtros futuros: general, habits, money, saving y debt. Cada filtro
puede generar un registro distinto por fecha en daily_progress.

# 12. Vistas SQL recomendadas

| **Vista**                    | **Objetivo**                                                                                       | **Consumida por** |
|------------------------------|----------------------------------------------------------------------------------------------------|-------------------|
| v_current_period_summary     | Resumen de la quincena/periodo activo: ingreso, gastos, obligatorio, disponible y sugerido diario. | Home, Money       |
| v_budget_status              | Límite, gastado, restante, porcentaje y estado por categoría.                                      | Money             |
| v_expenses_by_category_week  | Gasto semanal agrupado por categoría.                                                              | Money             |
| v_expenses_by_category_month | Gasto mensual agrupado por categoría.                                                              | Money, Progress   |
| v_debt_progress              | Saldo, pagado, pagos restantes y fecha estimada de liquidación.                                    | Money, Home       |
| v_savings_goal_progress      | Progreso de metas de ahorro.                                                                       | Money, Home       |
| v_habits_today               | Checklist del día con estado.                                                                      | Habits, Home      |
| v_heatmap_year               | Datos anuales para heatmap.                                                                        | Progress          |
| v_project_progress           | Progreso por proyecto basado en tareas.                                                            | Projects, Home    |

# 13. Diseño de API REST

La API debe ocultar detalles internos de la base de datos al frontend.
Angular no debería conocer todas las relaciones, solo consumir recursos
y casos de uso.

| **Método** | **Endpoint**                     | **Descripción**                                  |
|------------|----------------------------------|--------------------------------------------------|
| GET        | /api/dashboard/summary           | Resumen general para Home.                       |
| GET        | /api/money/expenses              | Lista de gastos con filtros por fecha/categoría. |
| POST       | /api/money/expenses              | Crear gasto manual.                              |
| PATCH      | /api/money/expenses/:id          | Editar gasto.                                    |
| DELETE     | /api/money/expenses/:id          | Eliminar gasto si no está bloqueado.             |
| GET        | /api/money/categories            | Listar categorías.                               |
| POST       | /api/money/categories            | Crear categoría.                                 |
| GET        | /api/budgets/current             | Obtener presupuesto activo.                      |
| POST       | /api/budgets/periods             | Crear periodo presupuestal.                      |
| POST       | /api/budgets/limits              | Crear/actualizar límite por categoría.           |
| GET        | /api/debts                       | Listar deudas.                                   |
| POST       | /api/debts                       | Crear deuda.                                     |
| POST       | /api/debts/:id/payments          | Registrar pago obligatorio o abono extra.        |
| GET        | /api/debts/:id/projection        | Proyección de liquidación.                       |
| GET        | /api/savings/goals               | Listar metas de ahorro.                          |
| POST       | /api/savings/goals               | Crear meta.                                      |
| POST       | /api/savings/goals/:id/movements | Registrar depósito o retiro.                     |
| GET        | /api/habits                      | Listar hábitos.                                  |
| GET        | /api/habits/today                | Obtener checklist de hoy.                        |
| POST       | /api/habits/:id/logs             | Registrar cumplimiento diario.                   |
| GET        | /api/progress/heatmap            | Obtener heatmap por año y filtro.                |
| POST       | /api/progress/recalculate        | Recalcular score diario o rango.                 |
| GET        | /api/projects                    | Listar proyectos.                                |
| POST       | /api/projects                    | Crear proyecto.                                  |
| POST       | /api/projects/:id/tasks          | Crear tarea.                                     |
| PATCH      | /api/projects/:id/tasks/:taskId  | Actualizar tarea.                                |
| GET        | /api/settings                    | Obtener configuración.                           |
| PATCH      | /api/settings                    | Actualizar configuración.                        |

# 14. DTOs y validaciones esperadas

| **DTO**                  | **Validaciones**                                                                 |
|--------------------------|----------------------------------------------------------------------------------|
| CreateExpenseDto         | amount \> 0, categoryId uuid, expenseDate date, source permitido, note opcional. |
| CreateBudgetPeriodDto    | periodType permitido, startDate \<= endDate, expectedIncome \>= 0.               |
| CreateDebtPaymentDto     | amount \> 0, paymentDate date, paymentType permitido.                            |
| CreateSavingsMovementDto | amount \> 0, movementType permitido.                                             |
| LogHabitDto              | logDate date, status permitido, unique por habitId y fecha.                      |
| CreateProjectTaskDto     | title requerido, status inicial todo, priority permitida.                        |
| UpdateSettingsDto        | moneda permitida, frecuencia permitida, días entre 1 y 31.                       |

# 15. Estrategia de seguridad y RLS

La API NestJS debe validar identidad cuando exista Auth. Supabase
PostgreSQL debe estar preparado con user_id y políticas RLS. Si en la
primera etapa se usa backend con credenciales de servicio, el backend
será responsable de filtrar por user_id. Cuando el frontend acceda
directo a Supabase o se active Auth, RLS se vuelve obligatorio.

Política base futura por tabla:  
SELECT: auth.uid() = user_id  
INSERT: auth.uid() = user_id  
UPDATE: auth.uid() = user_id  
DELETE: auth.uid() = user_id

| **Capa**      | **Responsabilidad de seguridad**                                             |
|---------------|------------------------------------------------------------------------------|
| Angular       | No confiar en frontend para seguridad; solo enviar token cuando exista Auth. |
| NestJS        | Validar token, resolver user_id, aplicar reglas y filtrar datos.             |
| PostgreSQL    | Constraints, FK, índices, RLS y consistencia.                                |
| Supabase Auth | Identidad futura del usuario.                                                |

# 16. Estrategia Prisma

Prisma debe utilizarse para definir modelos, relaciones y migraciones.
La base real seguirá siendo Supabase PostgreSQL. Las migraciones deben
versionarse en Git.

| **Decisión**        | **Detalle**                                                                  |
|---------------------|------------------------------------------------------------------------------|
| ORM                 | Prisma ORM.                                                                  |
| Conexión            | DATABASE_URL de Supabase PostgreSQL.                                         |
| Migraciones         | Prisma Migrate para cambios estructurales controlados.                       |
| Seed                | Script para categorías, settings, deuda inicial y obligaciones recurrentes.  |
| Consultas complejas | Usar Prisma cuando sea simple; SQL raw o vistas para agregaciones avanzadas. |

# 17. Datos iniciales del usuario

| **Dato**             | **Valor inicial**                                   |
|----------------------|-----------------------------------------------------|
| Ingreso quincenal    | \$4,730.00                                          |
| Deuda actual         | \$10,015.00                                         |
| Pago mensual deuda   | \$2,372.85 cada día 15                              |
| Último pago estimado | Diciembre, \$528.72                                 |
| Gym                  | \$450.00 mensual, día 19                            |
| Nutriólogo           | \$490.00, no siempre mensual, próximo pago en julio |
| Transporte           | \$20.00 diario aproximado                           |
| Comida               | \$700.00 semanal aproximado                         |

# 18. Orden recomendado de implementación

| **Fase**                      | **Objetivo**                                         | **Resultado**                       |
|-------------------------------|------------------------------------------------------|-------------------------------------|
| 1\. Diseño final DB           | Confirmar tablas, relaciones, constraints e índices. | Modelo aprobado antes de codificar. |
| 2\. Crear proyecto backend    | NestJS + Prisma + configuración base.                | API base corriendo localmente.      |
| 3\. Migraciones y seed        | Crear tablas y datos iniciales.                      | Supabase con modelo listo.          |
| 4\. Módulo settings/profiles  | Resolver perfil y configuración.                     | Base para user_id y defaults.       |
| 5\. Módulo money              | Categorías y gastos.                                 | Primer CRUD real.                   |
| 6\. Presupuestos/deuda/ahorro | Casos financieros principales.                       | Preguntas de dinero respondidas.    |
| 7\. Hábitos/progreso          | Logs y heatmap.                                      | Progress funcional.                 |
| 8\. Proyectos                 | Proyectos, tareas, presupuestos.                     | Módulo Projects funcional.          |
| 9\. Dashboard views           | Vistas y endpoints agregados.                        | Home con datos calculados.          |
| 10\. Auth/RLS                 | Activar Supabase Auth y políticas.                   | Modelo seguro y escalable.          |

# 19. Decisiones pendientes

- Confirmar si el backend se alojará inicialmente en Railway, Render,
  Fly.io o Vercel Functions.

- Definir si el primer user_id será provisional o se creará un usuario
  real en Supabase Auth desde el inicio.

- Definir si pagos de deuda y ahorro se registrarán automáticamente
  también como expenses.

- Definir si project_budgets.spent_amount será operativo o calculado
  desde expenses.project_id.

- Ajustar fórmula del heatmap si se decide que un día sin gastar también
  debe sumar positivo.

- Definir estrategia de backups y exportación de datos personales.

# 20. Riesgos técnicos y mitigaciones

| **Riesgo**                         | **Mitigación**                                                     |
|------------------------------------|--------------------------------------------------------------------|
| Sobrecomplicar antes de validar    | Implementar por fases, empezando por gastos, presupuestos y deuda. |
| Duplicar totales inconsistentes    | Guardar eventos como fuente de verdad y recalcular snapshots.      |
| RLS bloqueando desarrollo sin Auth | Documentar políticas y activarlas cuando exista sesión real.       |
| Frontend demasiado acoplado a DB   | Angular debe consumir API NestJS, no tablas directamente.          |
| Consultas agregadas lentas         | Usar índices, vistas SQL y endpoints dashboard específicos.        |
| Cambios futuros de modelo          | Usar migraciones versionadas con Prisma.                           |

# 21. Conclusión técnica

La decisión más sólida y escalable para Panel Personal de Progreso es
usar TypeScript como lenguaje principal y dividir responsabilidades
claramente: Angular como interfaz, NestJS como backend de negocio,
Prisma como capa tipada de acceso a datos y Supabase PostgreSQL como
base de datos relacional principal.

El modelo propuesto prioriza historial, trazabilidad y cálculo desde
eventos reales. Esta decisión evita improvisar, permite crecer a Auth y
multiusuario, mantiene el diseño visual separado de la lógica y deja una
base profesional para crear el nuevo proyecto backend.

Decisión final:  
Angular + NestJS + Prisma + Supabase PostgreSQL  
  
Principio rector:  
Guardar eventos reales, calcular resúmenes, proteger por user_id y
mantener la arquitectura modular.

# 22. Referencias técnicas

- NestJS Docs: https://docs.nestjs.com/ y https://nestjs.com/

- Prisma ORM Docs PostgreSQL:
  https://www.prisma.io/docs/prisma-orm/quickstart/postgresql

- NestJS Prisma recipe: https://docs.nestjs.com/recipes/prisma

- Supabase Row Level Security:
  https://supabase.com/docs/guides/database/postgres/row-level-security

- Supabase Auth Docs: https://supabase.com/docs/guides/auth

- Vercel Angular deployment guide:
  https://vercel.com/kb/guide/deploying-angular-with-vercel

- Vercel Functions Docs: https://vercel.com/docs/functions
