# Bookmark Manager GraphQL API

Bun + TypeScript GraphQL API for managing bookmarks organized into folders.

## Stack

- Runtime: Bun
- Language: TypeScript (strict mode, no `any` anywhere)
- Database: PostgreSQL (via Docker Compose), Prisma ORM v7
- API layer: GraphQL (not yet installed — schema/resolvers are scaffolded but empty)

## Scripts

- `bun run dev` — start dev server with watch mode (`src/index.ts`)
- `bun run build` — bundle to `dist/`
- `bun run test` — run tests (`bun test`)
- `bun run gendb` — run Prisma migrations (`bunx prisma migrate dev`)
- `bun run sanity` — typecheck only (`tsc --noEmit`)

## Project structure

- `src/schema/` — GraphQL schema files
- `src/resolvers/` — GraphQL resolvers
- `src/db/` — Prisma client setup (`client.ts`)
- `prisma/schema.prisma` — Prisma data model
- `prisma.config.ts` — Prisma 7 config (reads `DATABASE_URL` from env)
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
- Any read query (list folders, list bookmarks) should filter
  `where: { isDeleted: false }` by default once resolvers exist.

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
- Don't install `graphql`/`yoga` packages or add resolver logic until asked —
  this repo has been deliberately scaffolded in stages.
