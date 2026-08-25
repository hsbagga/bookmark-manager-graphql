import { describe, expect, it, mock } from "bun:test";
import type { Folder } from "../generated/prisma/client";

const activeFolder: Folder = {
  id: "folder-1",
  name: "Reading List",
  isDeleted: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const findManyMock = mock(() => Promise.resolve([activeFolder]));

void mock.module("@/db/client", () => ({
  prisma: {
    folder: { findMany: findManyMock },
  },
}));

const { resolvers } = await import("@/resolvers/index");

describe("Query.folders", () => {
  it("returns only non-deleted folders, filtered via Prisma", async () => {
    findManyMock.mockClear();

    const result = await resolvers.Query.folders();

    expect(result).toEqual([activeFolder]);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
  });
});
