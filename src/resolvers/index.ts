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
    createFolder: (_parent: unknown, args: CreateFolderArgs): Promise<Folder> =>
      prisma.folder.create({
        data: { name: args.name },
      }),
    createBookmark: (_parent: unknown, args: CreateBookmarkArgs): Promise<Bookmark> =>
      prisma.bookmark.create({
        data: {
          title: args.title,
          url: args.url,
          tags: args.tags ?? [],
          folderId: args.folderId,
        },
      }),
    updateBookmark: (_parent: unknown, args: UpdateBookmarkArgs): Promise<Bookmark> =>
      prisma.bookmark.update({
        where: { id: args.id },
        data: {
          ...(args.title !== undefined && args.title !== null ? { title: args.title } : {}),
          ...(args.url !== undefined && args.url !== null ? { url: args.url } : {}),
          ...(args.tags !== undefined && args.tags !== null ? { tags: args.tags } : {}),
        },
      }),
    deleteBookmark: (_parent: unknown, args: DeleteBookmarkArgs): Promise<Bookmark> =>
      prisma.bookmark.update({
        where: { id: args.id },
        data: { isDeleted: true },
      }),
    moveBookmark: (_parent: unknown, args: MoveBookmarkArgs): Promise<Bookmark> =>
      prisma.bookmark.update({
        where: { id: args.id },
        data: { folderId: args.folderId },
      }),
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
