// Tool registry. To add a tool: create app/tools/<slug>/page.tsx and add an entry here.
export type Tool = {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  status?: "new" | "beta";
};

export const tools: Tool[] = [
  {
    slug: "fliphtml5",
    name: "FlipHTML5 Downloader",
    description:
      "Turn a public FlipHTML5 flipbook into a PDF. Handles old and new (encrypted) books.",
    category: "Documents",
    tags: ["pdf", "flipbook", "download", "catalogue"],
    status: "new",
  },
];

export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
