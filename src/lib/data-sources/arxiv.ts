import { XMLParser } from "fast-xml-parser";
import { NewsItem, NewsCategory } from "@/types";
import { proxyFetch } from "@/lib/proxy-fetch";

const CATEGORIES = ["cs.AI", "cs.CL", "cs.LG"];

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  published: string;
  author: { name: string } | { name: string }[];
  link: { "@_href": string }[] | { "@_href": string };
  "arxiv:primary_category"?: { "@_term": string };
}

interface ArxivResponse {
  feed: {
    entry: ArxivEntry[] | ArxivEntry;
  };
}

function categorizeByArxivCategory(category?: string): NewsCategory {
  if (!category) return "research";

  if (category === "cs.CL") {
    return "model"; // NLP papers often about language models
  }

  if (category === "cs.LG") {
    return "research"; // Machine learning research
  }

  return "research";
}

function getAuthorName(author: { name: string } | { name: string }[]): string {
  if (Array.isArray(author)) {
    return author[0]?.name || "Unknown";
  }
  return author?.name || "Unknown";
}

function getArticleUrl(link: { "@_href": string }[] | { "@_href": string }): string {
  if (Array.isArray(link)) {
    const absLink = link.find((l) => l["@_href"]?.includes("/abs/"));
    return absLink?.["@_href"] || link[0]?.["@_href"] || "";
  }
  return link?.["@_href"] || "";
}

export async function fetchArxivPapers(): Promise<NewsItem[]> {
  const papers: NewsItem[] = [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  for (const category of CATEGORIES) {
    try {
      const response = await proxyFetch(
        `https://export.arxiv.org/api/query?search_query=cat:${category}&sortBy=submittedDate&sortOrder=descending&max_results=5`
      );

      if (!response.ok) {
        console.error(`Failed to fetch arXiv ${category}: ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const result: ArxivResponse = parser.parse(xml);

      if (!result.feed?.entry) continue;

      const entries = Array.isArray(result.feed.entry)
        ? result.feed.entry
        : [result.feed.entry];

      for (const entry of entries) {
        // Extract ID from URL (e.g., "http://arxiv.org/abs/2401.12345v1" -> "2401.12345")
        const idMatch = entry.id.match(/(\d+\.\d+)/);
        const paperId = idMatch ? idMatch[1] : entry.id;

        papers.push({
          id: `arxiv-${paperId}`,
          title: entry.title.replace(/\n/g, " ").trim(),
          summary: entry.summary.replace(/\n/g, " ").trim().slice(0, 300),
          url: getArticleUrl(entry.link),
          source: "arxiv",
          sourceName: `arXiv ${category}`,
          category: categorizeByArxivCategory(
            entry["arxiv:primary_category"]?.["@_term"]
          ),
          publishedAt: new Date(entry.published).toISOString(),
          popularity: 50, // arXiv papers don't have popularity metrics
          metadata: {
            author: getAuthorName(entry.author),
          },
        });
      }
    } catch (error) {
      console.error(`Error fetching arXiv ${category}:`, error);
    }
  }

  return papers;
}
