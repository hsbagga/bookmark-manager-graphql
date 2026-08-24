import { prisma } from "../src/db/client";

interface BookmarkSeed {
  title: string;
  url: string;
  tags: string[];
}

interface FolderSeed {
  name: string;
  bookmarks: BookmarkSeed[];
}

const folderSeeds: FolderSeed[] = [
  {
    name: "Reading List",
    bookmarks: [
      {
        title: "A Beginner's Guide to TypeScript Generics",
        url: "https://example.com/typescript-generics-guide",
        tags: ["tech", "tutorial"],
      },
      {
        title: "The Pragmatic Programmer: 20th Anniversary Edition",
        url: "https://example.com/pragmatic-programmer",
        tags: ["books", "career"],
      },
      {
        title: "How Databases Actually Work Under the Hood",
        url: "https://example.com/databases-under-the-hood",
        tags: ["tech", "databases"],
      },
    ],
  },
  {
    name: "Recipes",
    bookmarks: [
      {
        title: "Easy Weeknight Pasta Carbonara Recipe",
        url: "https://example.com/pasta-carbonara-recipe",
        tags: ["food", "italian"],
      },
      {
        title: "The Ultimate Guide to Baking Sourdough Bread",
        url: "https://example.com/sourdough-baking-guide",
        tags: ["food", "baking"],
      },
      {
        title: "Quick Thai Green Curry Recipe",
        url: "https://example.com/thai-green-curry-recipe",
        tags: ["food", "thai"],
      },
    ],
  },
  {
    name: "Dev Resources",
    bookmarks: [
      {
        title: "GraphQL Yoga Official Documentation",
        url: "https://the-guild.dev/graphql/yoga-server",
        tags: ["tech", "graphql", "docs"],
      },
      {
        title: "Prisma ORM Migration Guide",
        url: "https://example.com/prisma-migration-guide",
        tags: ["tech", "tutorial", "database"],
      },
      {
        title: "Understanding Bun's Native HTTP Server",
        url: "https://example.com/bun-http-server",
        tags: ["tech", "bun"],
      },
    ],
  },
];

async function main(): Promise<void> {
  await prisma.bookmark.deleteMany({});
  await prisma.folder.deleteMany({});

  for (const folderSeed of folderSeeds) {
    const folder = await prisma.folder.create({
      data: {
        name: folderSeed.name,
        isDeleted: false,
      },
    });

    for (const bookmarkSeed of folderSeed.bookmarks) {
      await prisma.bookmark.create({
        data: {
          title: bookmarkSeed.title,
          url: bookmarkSeed.url,
          tags: bookmarkSeed.tags,
          isDeleted: false,
          folderId: folder.id,
        },
      });
    }
  }

  console.log("Seed complete.");
  for (const folderSeed of folderSeeds) {
    console.log(`\n${folderSeed.name}:`);
    for (const bookmarkSeed of folderSeed.bookmarks) {
      console.log(`  - ${bookmarkSeed.title}`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
