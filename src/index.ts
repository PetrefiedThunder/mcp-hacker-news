#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://hacker-news.firebaseio.com/v0";
const ALGOLIA = "https://hn.algolia.com/api/v1";
const RATE_LIMIT_MS = 100;
let last = 0;

async function hnFetch(url: string): Promise<any> {
  const now = Date.now(); if (now - last < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  last = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN ${res.status}`);
  return res.json();
}

const server = new McpServer({ name: "mcp-hacker-news", version: "1.0.0" });

server.tool("get_top_stories", "Get top stories from Hacker News.", {
  limit: z.number().min(1).max(30).default(10),
}, async ({ limit }) => {
  const ids = await hnFetch(`${BASE}/topstories.json`);
  const stories = await Promise.all(ids.slice(0, limit).map((id: number) => hnFetch(`${BASE}/item/${id}.json`)));
  const items = stories.map((s: any) => ({
    id: s.id, title: s.title, url: s.url, score: s.score,
    by: s.by, time: new Date(s.time * 1000).toISOString(), descendants: s.descendants,
    hnUrl: `https://news.ycombinator.com/item?id=${s.id}`,
  }));
  return { content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }] };
});

server.tool("get_new_stories", "Get newest stories.", {
  limit: z.number().min(1).max(30).default(10),
}, async ({ limit }) => {
  const ids = await hnFetch(`${BASE}/newstories.json`);
  const stories = await Promise.all(ids.slice(0, limit).map((id: number) => hnFetch(`${BASE}/item/${id}.json`)));
  return { content: [{ type: "text" as const, text: JSON.stringify(stories.map((s: any) => ({
    id: s.id, title: s.title, url: s.url, score: s.score, by: s.by,
  })), null, 2) }] };
});

server.tool("search", "Search Hacker News stories and comments.", {
  query: z.string(), tags: z.string().optional().describe("Filter: 'story', 'comment', 'ask_hn', 'show_hn'"),
  numericFilters: z.string().optional().describe("e.g. 'points>100,num_comments>50'"),
  hitsPerPage: z.number().min(1).max(50).default(10),
}, async ({ query, tags, numericFilters, hitsPerPage }) => {
  const p = new URLSearchParams({ query, hitsPerPage: String(hitsPerPage) });
  if (tags) p.set("tags", tags);
  if (numericFilters) p.set("numericFilters", numericFilters);
  const d = await hnFetch(`${ALGOLIA}/search?${p}`);
  const hits = d.hits?.map((h: any) => ({
    title: h.title || h.story_title, url: h.url || h.story_url,
    author: h.author, points: h.points, numComments: h.num_comments,
    createdAt: h.created_at, objectID: h.objectID,
  }));
  return { content: [{ type: "text" as const, text: JSON.stringify({ total: d.nbHits, hits }, null, 2) }] };
});

server.tool("get_item", "Get a specific item (story, comment, poll) by ID.", {
  id: z.number().describe("HN item ID"),
}, async ({ id }) => {
  const d = await hnFetch(`${BASE}/item/${id}.json`);
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

server.tool("get_user", "Get a user profile.", {
  username: z.string(),
}, async ({ username }) => {
  const d = await hnFetch(`${BASE}/user/${username}.json`);
  return { content: [{ type: "text" as const, text: JSON.stringify({
    id: d.id, karma: d.karma, about: d.about?.slice(0, 500),
    created: new Date(d.created * 1000).toISOString(), submitted: d.submitted?.length,
  }, null, 2) }] };
});

server.tool("get_ask_hn", "Get Ask HN stories.", {
  limit: z.number().min(1).max(30).default(10),
}, async ({ limit }) => {
  const ids = await hnFetch(`${BASE}/askstories.json`);
  const stories = await Promise.all(ids.slice(0, limit).map((id: number) => hnFetch(`${BASE}/item/${id}.json`)));
  return { content: [{ type: "text" as const, text: JSON.stringify(stories.map((s: any) => ({
    id: s.id, title: s.title, score: s.score, by: s.by, descendants: s.descendants,
    text: s.text?.slice(0, 500),
  })), null, 2) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
