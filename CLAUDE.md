# Bookmark Manager GraphQL API

Bun + TypeScript GraphQL API for managing bookmarks organized into folders.

## Stack

- Runtime: Bun
- Language: TypeScript (strict mode, no `any` anywhere)
- Database: PostgreSQL (via Docker Compose), Prisma ORM v7
- API layer: GraphQL Yoga (schema-first). `src/schema/schema.graphql` defines
  `Folder`/`Bookmark` types plus `Query`/`Mutation`. `src/resolvers/index.ts`
  is wired to Prisma (via `src/db/client.ts`) and implements real query/mutation
  logic — soft-delete filtering, nested field resolvers, and cursor pagination
  on `bookmarks`.

## Scripts

- `bun run dev` — start dev server with watch mode (`src/index.ts`)
- `bun run build` — bundle to `dist/`
- `bun run test` — run tests (`bun test`)
- `bun run gendb` — run Prisma migrations (`bunx prisma migrate dev`)
- `bun run seed` — run `prisma/seed.ts` to reset and repopulate sample data
  (deletes all folders/bookmarks, then recreates 3 folders / 9 bookmarks). Run
  manually — not wired as a `prisma.seed` config hook.
- `bun run sanity` — typecheck only (`tsc --noEmit`)

## Project structure

- `src/schema/` — GraphQL schema files
- `src/resolvers/` — GraphQL resolvers (Prisma-backed)
- `src/db/` — Prisma client setup (`client.ts`), using the `@prisma/adapter-pg`
  driver adapter (required by Prisma 7)
- `prisma/schema.prisma` — Prisma data model
- `prisma/seed.ts` — manual seed script (see Scripts)
- `prisma.config.ts` — Prisma 7 config (reads `DATABASE_URL` from env)
- `generated/prisma/` — generated Prisma Client output (not hand-written)
- `docker-compose.yml` — local Postgres service

## Data model

- `Folder` has many `Bookmark` (one-to-many, required `folderId` on `Bookmark`).
- Both models have `isDeleted Boolean @default(false)` for **soft delete**.
- The `Bookmark.folder` relation uses `onDelete: Restrict`, not `Cascade` — hard
  deletes are intentionally blocked. Deleting a folder means: in a Prisma
  `$transaction`, set `isDeleted: true` on the folder and on all its bookmarks
  (`updateMany` on `Bookmark` where `folderId` matches, then update the
  `Folder`). This logic belongs in resolver/service code, not the schema,
  since Prisma's `onDelete` only fires on real SQL `DELETE` statements.
- Any read query (list folders, list bookmarks) filters
  `where: { isDeleted: false }` by default. Folder deletion (soft-delete
  cascade to its bookmarks via `$transaction`) is not yet implemented in
  resolvers — only individual bookmark soft-delete (`deleteBookmark`) exists.

## Local Postgres

`docker-compose.yml` defines a single `postgres:16` service with a named
volume, exposed on 5432, credentials from env vars (defaults:
`bookmark_user` / `bookmark_pass` / `bookmark_db`). `.env` (gitignored) and
`.env.example` hold `DATABASE_URL` plus the Postgres env vars — keep them in
sync if credentials change.

To stand up the DB and run the first migration (not yet done):

```
docker compose up -d
bunx prisma migrate dev --name init
```

## Conventions

- No `any` — TypeScript strict mode is enforced (`tsc --noEmit` via `sanity`).
- Prisma 7 requires a driver adapter (no bare `datasourceUrl`/connection
  string) — `src/db/client.ts` constructs `PrismaClient` with a `PrismaPg`
  adapter from `@prisma/adapter-pg`.
