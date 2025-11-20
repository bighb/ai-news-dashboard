import { NewsItem, NewsCategory } from "@/types";
import { proxyFetch } from "@/lib/proxy-fetch";

const SUBREDDITS = ["MachineLearning", "artificial", "LocalLLaMA"];

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    subreddit: string;
    author: string;
    created_utc: number;
    ups: number;
    num_comments: number;
    link_flair_text?: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

function categorizePost(title: string, flair?: string): NewsCategory {
  const lowerTitle = title.toLowerCase();
  const lowerFlair = flair?.toLowerCase() || "";

  if (
    lowerTitle.includes("tutorial") ||
    lowerTitle.includes("guide") ||
    lowerTitle.includes("how to") ||
    lowerFlair.includes("tutorial")
  ) {
    return "tutorial";
  }

  if (
    lowerTitle.includes("release") ||
    lowerTitle.includes("announcing") ||
    lowerTitle.includes("new model") ||
    lowerTitle.includes("gpt") ||
    lowerTitle.includes("llama") ||
    lowerTitle.includes("claude")
  ) {
    return "model";
  }

  if (
    lowerTitle.includes("tool") ||
    lowerTitle.includes("app") ||
    lowerTitle.includes("library") ||
    lowerTitle.includes("framework")
  ) {
    return "tool";
  }

  if (
    lowerTitle.includes("paper") ||
    lowerTitle.includes("research") ||
    lowerTitle.includes("arxiv") ||
    lowerFlair.includes("research")
  ) {
    return "research";
  }

  return "application";
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await proxyFetch(url, options);
      if (response.ok) return response;
      if (response.status >= 500 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}

export async function fetchRedditPosts(): Promise<NewsItem[]> {
  const posts: NewsItem[] = [];

  for (const subreddit of SUBREDDITS) {
    try {
      const response = await fetchWithRetry(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
        {
          headers: {
            "User-Agent":
              "AI-News-Dashboard/1.0 (https://github.com/user/ai-news)",
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch r/${subreddit}: ${response.status}`);
        continue;
      }

      // Add delay between requests to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));

      const data: RedditResponse = await response.json();

      for (const child of data.data.children) {
        const post = child.data;

        // Skip stickied posts
        if (post.permalink.includes("/comments/")) {
          posts.push({
            id: `reddit-${post.id}`,
            title: post.title,
            summary: post.selftext.slice(0, 200) || undefined,
            url: post.url.startsWith("http")
              ? post.url
              : `https://reddit.com${post.permalink}`,
            source: "reddit",
            sourceName: `r/${post.subreddit}`,
            category: categorizePost(post.title, post.link_flair_text),
            publishedAt: new Date(post.created_utc * 1000).toISOString(),
            popularity: Math.min(100, post.ups / 10 + post.num_comments / 5),
            metadata: {
              upvotes: post.ups,
              comments: post.num_comments,
              author: post.author,
              subreddit: post.subreddit,
            },
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching r/${subreddit}:`, error);
    }
  }

  return posts;
}
