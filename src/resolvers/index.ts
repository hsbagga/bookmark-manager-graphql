interface Folder {
  id: string;
  name: string;
  isDeleted: boolean;
  createdAt: string;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  isDeleted: boolean;
  folderId: string;
  createdAt: string;
}

const dummyFolders: Folder[] = [
  { id: "folder-1", name: "Reading List", isDeleted: false, createdAt: new Date().toISOString() },
  { id: "folder-2", name: "Recipes", isDeleted: false, createdAt: new Date().toISOString() },
];

const dummyBookmarks: Bookmark[] = [
  {
    id: "bookmark-1",
    title: "GraphQL Yoga Docs",
    url: "https://the-guild.dev/graphql/yoga-server",
    tags: ["graphql", "docs"],
    isDeleted: false,
    folderId: "folder-1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bookmark-2",
    title: "Pasta Carbonara",
    url: "https://example.com/carbonara",
    tags: ["food", "italian"],
    isDeleted: false,
    folderId: "folder-2",
    createdAt: new Date().toISOString(),
  },
];

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

export const resolvers = {
  Query: {
    folders: (): Folder[] => dummyFolders,
    folder: (_parent: unknown, args: FolderArgs): Folder | null =>
      dummyFolders.find((folder) => folder.id === args.id) ?? null,
    bookmarks: (_parent: unknown, _args: BookmarksArgs): Bookmark[] => dummyBookmarks,
  },
  Mutation: {
    createFolder: (_parent: unknown, args: CreateFolderArgs): Folder => ({
      id: "folder-stub",
      name: args.name,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    }),
    createBookmark: (_parent: unknown, args: CreateBookmarkArgs): Bookmark => ({
      id: "bookmark-stub",
      title: args.title,
      url: args.url,
      tags: args.tags ?? [],
      isDeleted: false,
      folderId: args.folderId,
      createdAt: new Date().toISOString(),
    }),
    updateBookmark: (_parent: unknown, args: UpdateBookmarkArgs): Bookmark => {
      const existing = dummyBookmarks.find((bookmark) => bookmark.id === args.id) ?? dummyBookmarks[0]!;
      return {
        ...existing,
        title: args.title ?? existing.title,
        url: args.url ?? existing.url,
        tags: args.tags ?? existing.tags,
      };
    },
    deleteBookmark: (_parent: unknown, args: DeleteBookmarkArgs): Bookmark => {
      const existing = dummyBookmarks.find((bookmark) => bookmark.id === args.id) ?? dummyBookmarks[0]!;
      return { ...existing, isDeleted: true };
    },
    moveBookmark: (_parent: unknown, args: MoveBookmarkArgs): Bookmark => {
      const existing = dummyBookmarks.find((bookmark) => bookmark.id === args.id) ?? dummyBookmarks[0]!;
      return { ...existing, folderId: args.folderId };
    },
  },
  Folder: {
    bookmarks: (parent: Folder): Bookmark[] =>
      dummyBookmarks.filter((bookmark) => bookmark.folderId === parent.id),
  },
  Bookmark: {
    folder: (parent: Bookmark): Folder | null =>
      dummyFolders.find((folder) => folder.id === parent.folderId) ?? null,
  },
};
