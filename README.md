# Cpp Fast Config Backend

Backend API broker para distribucion privada de artefactos de Cpp Fast Config.

Implementado con NestJS + Prisma + PostgreSQL + JWT + Swagger.

## Objetivo

Este servicio permite:

- registro y login de usuarios;
- gestion de API keys para installer/CLI;
- emision de tickets de descarga con URL firmada efimera;
- trazabilidad de eventos de descarga.

## Stack tecnico

- NestJS 11
- Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`)
- PostgreSQL
- JWT (`@nestjs/jwt`, `passport-jwt`)
- Swagger (`@nestjs/swagger`)

## Estructura principal

```text
src/
  auth/
  users/
  api-keys/
  downloads/
  artifacts/
  prisma/
prisma/
  schema.prisma
  migrations/
docs/
  README.md
  01_OVERVIEW.md
  02_ARCHITECTURE.md
  03_LOCAL_SETUP.md
  04_ENVIRONMENT.md
  05_DATABASE_PRISMA.md
  06_API_ENDPOINTS.md
  07_SWAGGER_AND_TESTING.md
  08_OPERATIONS_RUNBOOK.md
```

## Requisitos

- Node.js 20+
- pnpm 10+
- PostgreSQL accesible por `DATABASE_URL`

## Instalacion

```bash
pnpm install
cp .env.example .env
```

## Variables de entorno

Variables clave:

- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL`
- `API_KEY_PEPPER`
- `DOWNLOAD_BASE_URL`
- `DOWNLOAD_URL_SIGNING_SECRET`
- `DOWNLOAD_TTL_SECONDS`
- `DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS`
- `DOWNLOAD_RATE_LIMIT_KEY_MAX`
- `DOWNLOAD_RATE_LIMIT_IP_MAX`

Ver detalle completo en `docs/04_ENVIRONMENT.md`.

## Base de datos y Prisma

Generar cliente y aplicar migraciones:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev --name init_local
```

## Ejecutar en desarrollo

```bash
pnpm start:dev
```

Base URL local:

- API: `http://localhost:3001/api`
- Swagger UI: `http://localhost:3001/docs`
- OpenAPI JSON: `http://localhost:3001/docs-json`

## Deploy en Vercel

El proyecto incluye entrada serverless para Vercel en `api/index.ts` y reglas en `vercel.json`.

Antes de desplegar, configura en Vercel las variables:

- `DATABASE_URL` (base de datos publica, no localhost)
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_TTL`
- `API_KEY_PEPPER`
- `DOWNLOAD_BASE_URL`
- `DOWNLOAD_URL_SIGNING_SECRET`
- `DOWNLOAD_TTL_SECONDS`
- `DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS`
- `DOWNLOAD_RATE_LIMIT_KEY_MAX`
- `DOWNLOAD_RATE_LIMIT_IP_MAX`

Notas:

- En Vercel no dependas de archivos locales del repo para artefactos persistentes.
- `DOWNLOAD_BASE_URL` debe apuntar al host real de artefactos (por ejemplo tu Hostinger VPS).

## Scripts disponibles

```bash
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:e2e
```

## Endpoints implementados (MVP)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/api-keys` (JWT)
- `GET /api/api-keys` (JWT)
- `POST /api/api-keys/:id/revoke` (JWT)
- `POST /api/artifacts` (JWT)
- `GET /api/artifacts` (JWT)
- `POST /api/downloads/ticket` (API key)
- `POST /api/downloads/consume` (firma de ticket)

Referencia completa con request/response y errores en `docs/06_API_ENDPOINTS.md`.

## Documentacion modular

- indice: `docs/README.md`
- overview: `docs/01_OVERVIEW.md`
- arquitectura: `docs/02_ARCHITECTURE.md`
- setup local: `docs/03_LOCAL_SETUP.md`
- entorno: `docs/04_ENVIRONMENT.md`
- prisma/db: `docs/05_DATABASE_PRISMA.md`
- endpoints: `docs/06_API_ENDPOINTS.md`
- swagger/testing: `docs/07_SWAGGER_AND_TESTING.md`
- runbook: `docs/08_OPERATIONS_RUNBOOK.md`
- plan de evolucion: `docs/PLAN_FASES_BACKEND_BROKER_PRIVADO_2026-03-04.md`

## Estado actual

Proyecto en fase MVP funcional de broker. Incluye base de autenticacion, API keys, inventario de artifacts, ticketing de descarga y consumo single-use (`usedAt`).

Siguientes fases recomendadas: refresh tokens, verificacion de email, rate limiting, endpoint de descarga con validacion de firma y observabilidad avanzada.
