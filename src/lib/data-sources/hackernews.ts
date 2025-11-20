import { NewsItem, NewsCategory } from "@/types";
import { proxyFetch } from "@/lib/proxy-fetch";

interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
}

const AI_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "ml",
  "llm",
  "gpt",
  "claude",
  "openai",
  "anthropic",
  "neural",
  "deep learning",
  "transformer",
  "diffusion",
  "stable diffusion",
  "midjourney",
  "chatgpt",
  "gemini",
  "llama",
  "mistral",
  "copilot",
];

function isAIRelated(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return AI_KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
}

function categorizeStory(title: string): NewsCategory {
  const lowerTitle = title.toLowerCase();

  if (
    lowerTitle.includes("tutorial") ||
    lowerTitle.includes("guide") ||
    lowerTitle.includes("how to") ||
    lowerTitle.includes("learn")
  ) {
    return "tutorial";
  }

  if (
    lowerTitle.includes("release") ||
    lowerTitle.includes("launch") ||
    lowerTitle.includes("announcing") ||
    lowerTitle.includes("introduces") ||
    lowerTitle.includes("new model")
  ) {
    return "model";
  }

  if (
    lowerTitle.includes("tool") ||
    lowerTitle.includes("library") ||
    lowerTitle.includes("framework") ||
    lowerTitle.includes("open source")
  ) {
    return "tool";
  }

  if (
    lowerTitle.includes("paper") ||
    lowerTitle.includes("research") ||
    lowerTitle.includes("study")
  ) {
    return "research";
  }

  return "application";
}

export async function fetchHNStories(): Promise<NewsItem[]> {
  try {
    // Fetch top stories
    const topStoriesResponse = await proxyFetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );

    if (!topStoriesResponse.ok) {
      throw new Error(`Failed to fetch HN top stories: ${topStoriesResponse.status}`);
    }

    const storyIds: number[] = await topStoriesResponse.json();

    // Fetch first 50 stories details
    const storyPromises = storyIds.slice(0, 50).map(async (id) => {
      const response = await proxyFetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      );
      if (!response.ok) return null;
      return response.json() as Promise<HNStory>;
    });

    const stories = await Promise.all(storyPromises);

    // Filter AI-related stories and convert to NewsItem
    const newsItems: NewsItem[] = [];

    for (const story of stories) {
      if (!story || !story.title) continue;

      // Filter by AI keywords or high score
      if (!isAIRelated(story.title) && story.score < 200) continue;

      // Only include AI-related or very popular stories
      if (!isAIRelated(story.title)) continue;

      newsItems.push({
        id: `hn-${story.id}`,
        title: story.title,
        summary: story.text?.slice(0, 200) || undefined,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        source: "hn",
        sourceName: "Hacker News",
        category: categorizeStory(story.title),
        publishedAt: new Date(story.time * 1000).toISOString(),
        popularity: Math.min(100, story.score / 10 + (story.descendants || 0) / 5),
        metadata: {
          upvotes: story.score,
          comments: story.descendants || 0,
          author: story.by,
        },
      });
    }

    return newsItems;
  } catch (error) {
    console.error("Error fetching HN stories:", error);
    return [];
  }
}
