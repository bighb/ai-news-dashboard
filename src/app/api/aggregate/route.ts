import { NextResponse } from "next/server";
import { fetchRedditPosts } from "@/lib/data-sources/reddit";
import { fetchHNStories } from "@/lib/data-sources/hackernews";
import { fetchArxivPapers } from "@/lib/data-sources/arxiv";
import { AggregateResponse, NewsItem } from "@/types";

// Cache for 1 hour
export const revalidate = 3600;

export async function GET() {
  const errors: string[] = [];

  // Fetch from all sources in parallel
  const [redditPosts, hnStories, arxivPapers] = await Promise.allSettled([
    fetchRedditPosts(),
    fetchHNStories(),
    fetchArxivPapers(),
  ]);

  const items: NewsItem[] = [];

  // Process Reddit results
  if (redditPosts.status === "fulfilled") {
    items.push(...redditPosts.value);
  } else {
    errors.push(`Reddit: ${redditPosts.reason}`);
  }

  // Process HN results
  if (hnStories.status === "fulfilled") {
    items.push(...hnStories.value);
  } else {
    errors.push(`Hacker News: ${hnStories.reason}`);
  }

  // Process arXiv results
  if (arxivPapers.status === "fulfilled") {
    items.push(...arxivPapers.value);
  } else {
    errors.push(`arXiv: ${arxivPapers.reason}`);
  }

  // Deduplicate items by ID, keeping the one with highest popularity
  const itemsMap = new Map<string, NewsItem>();
  for (const item of items) {
    const existing = itemsMap.get(item.id);
    if (!existing || item.popularity > existing.popularity) {
      itemsMap.set(item.id, item);
    }
  }

  const deduplicatedItems = Array.from(itemsMap.values());

  // Sort by published date (newest first)
  deduplicatedItems.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const response: AggregateResponse = {
    items: deduplicatedItems,
    fetchedAt: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  };

  return NextResponse.json(response);
}
