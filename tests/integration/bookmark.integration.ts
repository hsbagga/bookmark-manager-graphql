import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@/db/client";
import { resolvers } from "@/resolvers/index";
import type { Folder } from "../../generated/prisma/client";

// Uses DATABASE_URL as-is (the docker-compose Postgres instance), rather than
// a separate test database, since this project has no test-DB provisioning
// yet. Every row this suite creates is tagged with a unique title/name prefix
// and deleted in afterAll, so it never collides with or pollutes seed data.
const RUN_ID = crypto.randomUUID();
const FOLDER_NAME = `integration-test-folder-${RUN_ID}`;

let folder: Folder;

beforeAll(async () => {
  folder = await prisma.folder.create({
    data: { name: FOLDER_NAME, isDeleted: false },
  });
});

afterAll(async () => {
  await prisma.bookmark.deleteMany({ where: { folderId: folder.id } });
  await prisma.folder.delete({ where: { id: folder.id } });
  await prisma.$disconnect();
});

describe("createBookmark resolver (real Postgres)", () => {
  it("persists a bookmark that can be read back from the database", async () => {
    const created = await resolvers.Mutation.createBookmark(undefined, {
      title: `integration-test-bookmark-${RUN_ID}`,
      url: "https://example.com/integration-test",
      tags: ["integration"],
      folderId: folder.id,
    });

    const stored = await prisma.bookmark.findUnique({ where: { id: created.id } });

    expect(stored).not.toBeNull();
    expect(stored?.title).toBe(`integration-test-bookmark-${RUN_ID}`);
    expect(stored?.url).toBe("https://example.com/integration-test");
    expect(stored?.folderId).toBe(folder.id);
    expect(stored?.isDeleted).toBe(false);
  });
});
