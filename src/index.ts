import { createSchema, createYoga } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvers } from "@/resolvers/index";

const typeDefs = readFileSync(join(import.meta.dir, "schema", "schema.graphql"), "utf-8");

const schema = createSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({ schema });

const port = Number(process.env["PORT"] ?? 4000);

Bun.serve({
  port,
  fetch: yoga.fetch,
});

console.log(`GraphQL Yoga server running at http://localhost:${port}/graphql`);
