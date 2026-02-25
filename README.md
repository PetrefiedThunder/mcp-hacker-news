# mcp-hacker-news

Get top stories, search via Algolia, read comments, and browse Ask HN.

> **Free API** — No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `get_top_stories` | Get top stories from Hacker News. |
| `get_new_stories` | Get newest stories. |
| `search` | Search Hacker News stories and comments. |
| `get_item` | Get a specific item (story, comment, poll) by ID. |
| `get_user` | Get a user profile. |
| `get_ask_hn` | Get Ask HN stories. |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-hacker-news.git
cd mcp-hacker-news
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hacker-news": {
      "command": "node",
      "args": ["/path/to/mcp-hacker-news/dist/index.js"]
    }
  }
}
```

## Usage with npx

```bash
npx mcp-hacker-news
```

## License

MIT
