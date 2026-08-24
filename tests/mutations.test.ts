import { describe, expect, it, mock } from "bun:test";
import { GraphQLError } from "graphql";
import type { Bookmark, Folder } from "../generated/prisma/client";

const activeFolder: Folder = {
  id: "folder-1",
  name: "Reading List",
  isDeleted: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const activeBookmark: Bookmark = {
  id: "bookmark-1",
  title: "Example",
  url: "https://example.com",
  tags: [],
  isDeleted: false,
  folderId: "folder-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const folderFindFirstMock = mock(() => Promise.resolve<Folder | null>(null));
const bookmarkFindFirstMock = mock(() => Promise.resolve<Bookmark | null>(activeBookmark));
const bookmarkCreateMock = mock(() => Promise.resolve(activeBookmark));
const bookmarkUpdateMock = mock(() => Promise.resolve(activeBookmark));

mock.module("@/db/client", () => ({
  prisma: {
    folder: { findFirst: folderFindFirstMock },
    bookmark: {
      findFirst: bookmarkFindFirstMock,
      create: bookmarkCreateMock,
      update: bookmarkUpdateMock,
    },
  },
}));

const { resolvers } = await import("@/resolvers/index");

describe("Mutation.createBookmark", () => {
  it("rejects an empty title without calling Prisma create", async () => {
    bookmarkCreateMock.mockClear();
    folderFindFirstMock.mockClear();

    const call = resolvers.Mutation.createBookmark(undefined, {
      title: "   ",
      url: "https://example.com",
      tags: null,
      folderId: "folder-1",
    });

    await expect(call).rejects.toThrow(GraphQLError);
    await expect(call).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(bookmarkCreateMock).not.toHaveBeenCalled();
    expect(folderFindFirstMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed URL without calling Prisma create", async () => {
    bookmarkCreateMock.mockClear();
    folderFindFirstMock.mockClear();

    const call = resolvers.Mutation.createBookmark(undefined, {
      title: "Valid title",
      url: "not-a-url",
      tags: null,
      folderId: "folder-1",
    });

    await expect(call).rejects.toThrow(GraphQLError);
    await expect(call).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(bookmarkCreateMock).not.toHaveBeenCalled();
    expect(folderFindFirstMock).not.toHaveBeenCalled();
  });
});

describe("Mutation.moveBookmark", () => {
  it("throws NOT_FOUND when the target folder does not exist", async () => {
    bookmarkFindFirstMock.mockClear();
    folderFindFirstMock.mockClear();
    bookmarkUpdateMock.mockClear();
    bookmarkFindFirstMock.mockImplementationOnce(() => Promise.resolve(activeBookmark));
    folderFindFirstMock.mockImplementationOnce(() => Promise.resolve(null));

    const call = resolvers.Mutation.moveBookmark(undefined, {
      id: "bookmark-1",
      folderId: "missing-folder",
    });

    await expect(call).rejects.toThrow(GraphQLError);
    await expect(call).rejects.toMatchObject({
      extensions: { code: "NOT_FOUND" },
    });
    expect(bookmarkUpdateMock).not.toHaveBeenCalled();
  });
});
