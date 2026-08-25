# Bookmark Manager GraphQL API

A Bun + TypeScript GraphQL API for managing bookmarks organized into folders,
backed by PostgreSQL via Prisma.

## Setup

```bash
git clone https://github.com/hsbagga/bookmark-manager-graphql.git
cd bookmark-manager-graphql

cp .env.example .env   # adjust values if needed

docker compose up -d   # start Postgres
bun install             # install dependencies

bun run gendb            # apply Prisma migrations
bun run seed              # (optional) reset DB and load sample data: 3 folders, 9 bookmarks

bun run dev               # start the dev server (watch mode)
```

The server starts at `http://localhost:4000/graphql` (port from `PORT` env
var, default `4000`).

## Environment Variables

Defined in `.env` (gitignored), based on `.env.example`:

| Variable            | Purpose                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`      | Prisma/Postgres connection string, e.g. `postgresql://bookmark_user:bookmark_pass@localhost:5432/bookmark_db?schema=public` |
| `POSTGRES_USER`     | Postgres username, used by `docker-compose.yml`                |
| `POSTGRES_PASSWORD` | Postgres password, used by `docker-compose.yml`                |
| `POSTGRES_DB`       | Postgres database name, used by `docker-compose.yml`            |

Keep `DATABASE_URL` in sync with `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`
if you change the defaults.

## Database

Postgres runs locally via Docker Compose (`docker-compose.yml`): a single
`postgres:16` service on port 5432 with a named volume for persistence.

Schema is managed with Prisma (`prisma/schema.prisma`, Prisma ORM v7, using
the `@prisma/adapter-pg` driver adapter). Migrations live in
`prisma/migrations/` and are **generated**, not hand-written — run
`bun run gendb` (`prisma migrate dev`) to create/apply migrations after
changing `prisma/schema.prisma`. The generated Prisma Client is emitted to
`generated/prisma/` (not checked in as source, regenerated on install/build).

`prisma/seed.ts` (`bun run seed`) wipes all folders/bookmarks and recreates
3 folders with 9 bookmarks total — run manually, it is not wired as an
automatic `prisma.seed` hook.

## Cursor Pagination

The `bookmarks` query supports cursor-based pagination via `take` and
`cursor` arguments. It returns a flat array of bookmarks (no edges/pageInfo
wrapper) ordered by `id`. To page through results, the client passes the
`id` of the last bookmark in the previous response as the next `cursor`;
the resolver excludes that row (`skip: 1`) and returns up to `take` rows
after it. Getting back fewer results than `take` (including zero) signals
there are no more results.

## Soft Deletes

Both `Folder` and `Bookmark` have an `isDeleted` boolean column (default
`false`) instead of being physically removed from the database. Every read
resolver (`folders`, `folder`, `bookmarks`, and the nested `Folder.bookmarks`
/ `Bookmark.folder` field resolvers) filters `isDeleted: false` consistently,
so soft-deleted rows never appear in query results. `deleteBookmark` sets
`isDeleted: true` rather than issuing a SQL `DELETE`. The `Bookmark.folder`
relation also uses `onDelete: Restrict` at the database level, so a folder
row can't be hard-deleted while bookmarks still reference it — folder
deletion, when implemented, will need to soft-delete the folder and cascade
`isDeleted: true` to its bookmarks in a single `$transaction` (not yet
implemented as a resolver).

## Running Tests

- `bun run test` — unit tests (`tests/*.test.ts`), Prisma client mocked via
  `mock.module`, no database required.
- `bun run test:integration` — integration test
  (`tests/integration/bookmark.integration.ts`), runs against the real
  Postgres from `docker-compose.yml` — make sure `docker compose up -d` has
  been run first.
- `bun run sanity` — runs everything in sequence: `lint`, `typecheck`,
  `test`, then `test:integration`.

## API Reference

**Queries**

- `folders: [Folder!]!` — list all non-deleted folders.
- `folder(id: ID!): Folder` — fetch a single non-deleted folder by id.
- `bookmarks(folderId: ID, search: String, take: Int, cursor: ID): [Bookmark!]!`
  — list non-deleted bookmarks, optionally filtered by folder or a
  case-insensitive title search, with cursor pagination (see above).

**Mutations**

- `createFolder(name: String!): Folder!` — create a folder; rejects a
  blank/whitespace-only name.
- `createBookmark(title: String!, url: String!, tags: [String!], folderId: ID!): Bookmark!`
  — create a bookmark; rejects a blank title or malformed URL, and requires
  `folderId` to reference an existing, non-deleted folder.
- `updateBookmark(id: ID!, title: String, url: String, tags: [String!]): Bookmark!`
  — partial update of a bookmark; only the fields provided are changed, with
  the same title/URL validation as `createBookmark` applied to provided fields.
- `deleteBookmark(id: ID!): Bookmark!` — soft-delete a bookmark
  (`isDeleted: true`).
- `moveBookmark(id: ID!, folderId: ID!): Bookmark!` — reassign a bookmark to
  a different folder; both the bookmark and the target folder must exist
  and be non-deleted.

All mutation failures throw a `GraphQLError` with `extensions.code` set to
`BAD_USER_INPUT` (validation failures) or `NOT_FOUND` (missing/soft-deleted
folder or bookmark).

## Docker

A `Dockerfile` is included for containerizing the API service itself
(Postgres already runs via `docker-compose.yml`, separately). It's optional
— local development uses `bun run dev` directly against the Compose Postgres
instance and does not require building or running this image. See the
commented-out `api` service block in `docker-compose.yml` for how to join
the API container to the same Compose network as Postgres, if needed.

## How I'd Extend This

The most significant gap is **authentication/authorization** — there is no
concept of a user or ownership anywhere in the schema or resolvers, which
was out of scope for this assignment but would be required before this
could be a real multi-user service. For **performance**, the nested field
resolvers (`Folder.bookmarks`, `Bookmark.folder`) each issue their own
Prisma query per parent, so a list query returning many folders/bookmarks
will N+1; batching these with something like a DataLoader per-request would
fix that without changing the schema. **Search** is currently a plain
`contains`/`mode: insensitive` filter on `title` — fine at small scale, but
it doesn't rank results or search `tags`/`url`; Postgres full-text search
(`tsvector`/`tsquery`) would be a natural next step, and a dedicated search
index (e.g. Elasticsearch/Meilisearch) would make sense only if bookmark
volume grew large enough that Postgres text search became a bottleneck.
There's currently no **observability** — no structured logging or request
tracing, so debugging a production issue would mean grepping raw
`console.log` output; adding structured logs (e.g. one line per resolved
GraphQL operation, with resolver-level timing) and basic tracing would be
the first addition before this ran anywhere real. The schema also has no
**versioning** story — GraphQL's typical approach of additive, non-breaking
schema evolution (deprecating rather than removing fields) would need to be
an explicit team convention once this schema is depended on. Finally, on
**scaling**, `src/db/client.ts` currently opens a single `PrismaClient`
with one `@prisma/adapter-pg` connection pool per process; running multiple
API instances behind a load balancer would need pool-size tuning (or an
external pooler like PgBouncer) to avoid exhausting Postgres connections,
and read-heavy query load (like `bookmarks` search) is the kind of traffic
that would benefit from a Postgres read replica once a single primary
became the bottleneck.
