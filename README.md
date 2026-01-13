
# 🍽️ IDDDinner Recipe Manager

A static React application for browsing and searching your personal recipe collection.

## 🚀 Getting Started

### Prerequisites
- Node.js v20+

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## 📝 Adding New Recipes

### Option A: Manual Markdown
Create a new file in the `content/` directory (e.g., `content/my-tasty-dish.md`).
Use the following format:

```yaml
---
title: "My Tasty Dish"
source: "https://example.com/recipe"
tags: ["dinner", "chicken"]
ingredients:
  - "1 cup rice"
  - "500g chicken"
---

### Instructions

Step 1...
```

### Option B: Auto-Scraping External Links
To automatically fetch content from a URL:

1. Create a file in `content/` with just the metadata and the source link:
   ```yaml
   ---
   title: "Amazing Stew"
   source: "https://very-long-recipe-site.com/stew"
   tags: ["soup"]
   ---

   Original Source: https://very-long-recipe-site.com/stew
   ```
2. Run the processing script:
   ```bash
   node process_recipes.cjs
   ```
3. The script will fetch the URL, extract the article content, and appended it to your markdown file automatically!

**Note**: Scraped content is cached in `scrape_cache.json` to speed up subsequent runs.

## 🛠️ Project Structure

- `content/`: Markdown files for all recipes.
- `recipes/`: Original source files (HTML exports, PDFs) used for initial import.
- `src/`: React application source code.
- `process_recipes.cjs`: Utility script for converting/scraping recipes.
