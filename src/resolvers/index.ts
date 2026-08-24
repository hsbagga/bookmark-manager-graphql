import { GraphQLError } from "graphql";
import { prisma } from "@/db/client";
import type { Bookmark, Folder } from "../../generated/prisma/client";

interface CreateFolderArgs {
  name: string;
}

interface CreateBookmarkArgs {
  title: string;
  url: string;
  tags?: string[] | null;
  folderId: string;
}

interface UpdateBookmarkArgs {
  id: string;
  title?: string | null;
  url?: string | null;
  tags?: string[] | null;
}

interface DeleteBookmarkArgs {
  id: string;
}

interface MoveBookmarkArgs {
  id: string;
  folderId: string;
}

interface FolderArgs {
  id: string;
}

interface BookmarksArgs {
  folderId?: string | null;
  search?: string | null;
  take?: number | null;
  cursor?: string | null;
}

const DEFAULT_PAGE_SIZE = 10;

function requireNonBlank(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new GraphQLError(`${fieldName} must not be empty`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

function requireValidUrl(value: string): void {
  try {
    new URL(value);
  } catch {
    throw new GraphQLError("url is not a valid URL", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

async function requireActiveFolder(folderId: string): Promise<void> {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, isDeleted: false },
  });
  if (!folder) {
    throw new GraphQLError("Folder not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
}

async function requireActiveBookmark(id: string): Promise<Bookmark> {
  const bookmark = await prisma.bookmark.findFirst({
    where: { id, isDeleted: false },
  });
  if (!bookmark) {
    throw new GraphQLError("Bookmark not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return bookmark;
}

export const resolvers = {
  Query: {
    folders: (): Promise<Folder[]> =>
      prisma.folder.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      }),
    folder: async (_parent: unknown, args: FolderArgs): Promise<Folder | null> =>
      prisma.folder.findFirst({
        where: { id: args.id, isDeleted: false },
      }),
    bookmarks: (_parent: unknown, args: BookmarksArgs): Promise<Bookmark[]> =>
      prisma.bookmark.findMany({
        where: {
          isDeleted: false,
          ...(args.folderId ? { folderId: args.folderId } : {}),
          ...(args.search ? { title: { contains: args.search, mode: "insensitive" } } : {}),
        },
        orderBy: { id: "asc" },
        take: args.take ?? DEFAULT_PAGE_SIZE,
        ...(args.cursor
          ? {
              cursor: { id: args.cursor },
              skip: 1,
            }
          : {}),
      }),
  },
  Mutation: {
    createFolder: (_parent: unknown, args: CreateFolderArgs): Promise<Folder> => {
      requireNonBlank(args.name, "name");
      return prisma.folder.create({
        data: { name: args.name },
      });
    },
    createBookmark: async (_parent: unknown, args: CreateBookmarkArgs): Promise<Bookmark> => {
      requireNonBlank(args.title, "title");
      requireValidUrl(args.url);
      await requireActiveFolder(args.folderId);

      return prisma.bookmark.create({
        data: {
          title: args.title,
          url: args.url,
          tags: args.tags ?? [],
          isDeleted: false,
          folderId: args.folderId,
        },
      });
    },
    updateBookmark: async (_parent: unknown, args: UpdateBookmarkArgs): Promise<Bookmark> => {
      await requireActiveBookmark(args.id);

      if (args.title !== undefined && args.title !== null) {
        requireNonBlank(args.title, "title");
      }
      if (args.url !== undefined && args.url !== null) {
        requireValidUrl(args.url);
      }

      return prisma.bookmark.update({
        where: { id: args.id },
        data: {
          ...(args.title !== undefined && args.title !== null ? { title: args.title } : {}),
          ...(args.url !== undefined && args.url !== null ? { url: args.url } : {}),
          ...(args.tags !== undefined && args.tags !== null ? { tags: args.tags } : {}),
        },
      });
    },
    deleteBookmark: async (_parent: unknown, args: DeleteBookmarkArgs): Promise<Bookmark> => {
      await requireActiveBookmark(args.id);

      return prisma.bookmark.update({
        where: { id: args.id },
        data: { isDeleted: true },
      });
    },
    moveBookmark: async (_parent: unknown, args: MoveBookmarkArgs): Promise<Bookmark> => {
      await requireActiveBookmark(args.id);
      await requireActiveFolder(args.folderId);

      return prisma.bookmark.update({
        where: { id: args.id },
        data: { folderId: args.folderId },
      });
    },
  },
  Folder: {
    bookmarks: (parent: Folder): Promise<Bookmark[]> =>
      prisma.bookmark.findMany({
        where: { folderId: parent.id, isDeleted: false },
      }),
  },
  Bookmark: {
    folder: (parent: Bookmark): Promise<Folder | null> =>
      prisma.folder.findFirst({
        where: { id: parent.folderId, isDeleted: false },
      }),
  },
};
