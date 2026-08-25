import { describe, expect, it, mock } from "bun:test";
import type { Bookmark } from "../generated/prisma/client";

const bookmarkFixture: Bookmark = {
  id: "bookmark-1",
  title: "Example",
  url: "https://example.com",
  tags: [],
  isDeleted: false,
  folderId: "folder-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const findManyMock = mock(() => Promise.resolve([bookmarkFixture]));

void mock.module("@/db/client", () => ({
  prisma: {
    bookmark: { findMany: findManyMock },
  },
}));

const { resolvers } = await import("@/resolvers/index");

describe("Query.bookmarks", () => {
  it("applies a case-insensitive search filter", async () => {
    findManyMock.mockClear();

    await resolvers.Query.bookmarks(undefined, {
      folderId: null,
      search: "Carbonara",
      take: null,
      cursor: null,
    });

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        isDeleted: false,
        title: { contains: "Carbonara", mode: "insensitive" },
      },
      orderBy: { id: "asc" },
      take: 10,
    });
  });

  it("applies cursor pagination args", async () => {
    findManyMock.mockClear();

    await resolvers.Query.bookmarks(undefined, {
      folderId: null,
      search: null,
      take: 5,
      cursor: "bookmark-1",
    });

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { isDeleted: false },
      orderBy: { id: "asc" },
      take: 5,
      cursor: { id: "bookmark-1" },
      skip: 1,
    });
  });
});
