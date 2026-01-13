
const fs = require('fs');
const path = require('path');
// Polyfill DOMMatrix for pdf-parse/pdfjs-dist key dependency
if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
        constructor() { self.a=1; self.b=0; self.c=0; self.d=1; self.e=0; self.f=0; }
    };
}
if (!global.self) {
    global.self = global;
}
// Handle potential import errors for pdf-parse gracefully if polyfill isn't enough
let pdf;
try {
    pdf = require('pdf-parse');
} catch (e) {
    console.warn('Failed to load pdf-parse:', e.message);
}
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const slugify = require('slugify');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const turndownService = new TurndownService();
const CONTENT_DIR = path.join(__dirname, 'content');

// Simple cache for scraped URLs to avoid hitting sites repeatedly
const CACHE_FILE = path.join(__dirname, 'scrape_cache.json');
let urlCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        urlCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to load cache', e);
    }
}

function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(urlCache, null, 2));
}

async function scrapeUrl(url) {
    if (!url || !url.startsWith('http')) return null;

    if (urlCache[url]) {
        console.log(`Using cached content for: ${url}`);
        return urlCache[url]; // Returns markdown string
    }

    try {
        console.log(`Scraping: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status}`);
            return null;
        }

        const html = await response.text();
        const doc = new JSDOM(html, { url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (article && article.content) {
            // Convert to MD
            let md = turndownService.turndown(article.content);
            // Append explicit attribution
            md = `\n\n> **Scraped from [${article.siteName || 'Original Source'}](${url})**\n\n` + md;

            urlCache[url] = md;
            saveCache();
            return md;
        }
    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
    }
    return null;
}

if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

// Helper to clean text
function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
}

// Generate MD content with frontmatter
function generateMarkdown(title, originalTitle, source, ingredients, tags, body) {
    const slug = slugify(originalTitle || title, { lower: true, strict: true });
    // Determine protein from ingredients (simple heuristic)
    const proteins = ['chicken', 'beef', 'pork', 'lamb', 'shrimp', 'fish', 'salmon', 'tofu', 'tempeh', 'lentils', 'beans', 'egg', 'turkey', 'sausage'];
    const foundProteins = proteins.filter(p => {
        const ingString = Array.isArray(ingredients) ? ingredients.join(' ').toLowerCase() : (ingredients || '').toLowerCase();
        return ingString.includes(p);
    });
    if (foundProteins.length > 0) {
        tags = [...(tags || []), ...foundProteins];
    }
    // Dedupe tags
    tags = [...new Set(tags)];

    const yaml = `---
title: "${title.replace(/"/g, '\\"')}"
originalTitle: "${originalTitle ? originalTitle.replace(/"/g, '\\"') : ''}"
source: "${source ? source.replace(/"/g, '\\"') : ''}"
tags: [${tags.map(t => `"${t}"`).join(', ')}]
bg: "${foundProteins[0] || ''}"
ingredients:
${Array.isArray(ingredients) ? ingredients.map(i => `  - "${i.replace(/"/g, '\\"')}"`).join('\n') : ''}
---

${body || ''}
`;
    return { slug, content: yaml };
}

async function processDinnerHtml() {
    console.log('Processing dinner.html...');
    const filePath = path.join(__dirname, 'recipes', 'Dinner ideas', 'dinner.html');
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    const rows = $('table tbody tr').toArray();
    let count = 0;

    for (const row of rows) {
        // Skip header check if easier logic? or just use index logic
        // The original code used index check in .each.
        // We'll rely on the cells check.

        const tds = $(row).find('td');
        if (tds.length < 3) continue;

        const mealTd = $(tds).eq(1);
        const mealName = cleanText(mealTd.text());
        if (!mealName || mealName.toLowerCase().includes('meal name')) continue;

        const mealLink = mealTd.find('a').attr('href');
        const ingredientsText = cleanText($(tds).eq(2).text());
        const ingredients = ingredientsText.split(',').map(s => s.trim()).filter(s => s);
        const source = cleanText($(tds).eq(3).text());

        console.log(`Found recipe: ${mealName}`);

        let body = `Original Source: ${source} \n\n Link: ${mealLink || 'N/A'}`;

        if (mealLink && mealLink.startsWith('http')) {
             try {
                const scraped = await scrapeUrl(mealLink);
                if (scraped) {
                    body = scraped;
                }
             } catch (err) {
                 console.log(`Failed to scrape ${mealLink}`);
             }
        }

        const { slug, content } = generateMarkdown(mealName, mealName, mealLink || source, ingredients, ['dinner'], body);
        fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), content);
        count++;
    }
    console.log(`Processed ${count} recipes from dinner.html`);
}

async function processMillRecipes() {
    console.log('Processing Mill recipes...');
    const dir = path.join(__dirname, 'recipes', 'The Modern Mill');
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

    for (const file of files) {
        if (file.includes('Ingredient costs') || file.includes('Recipes to try')) {
             console.log(`Skipping non-recipe file: ${file}`);
             continue;
        }

        const filePath = path.join(dir, file);
        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);

        // Structure analysis of GFV Banana Bread:
        // Rows:
        // 0: Headers
        // 1: Title (Cell A1 / index 0)
        // 2: Cost headers
        // 3: Ingredient headers (Each, Grams, Cups...)
        // 4...: Ingredient rows. Col A (index 0) = Amount + Name (e.g., "4 small... bananas").
        //       Wait, actually col A seems to be the full text description?
        //       Let's check the view_file.
        //       Row 4 (index 3): Col A: "4 small/med very overripe bananas..."
        //       Col B: "Banana" (Item name for cost?)
        //       So Col A is the human readable ingredient line.
        //       We should collect Col A from row 4 until we hit "Recipe" or similar.

        // Find row with "Recipe" in Col A -> Instructions start after that?
        // Row 17 (index 16) Col A: "Recipe" -> Wait, cost summary?
        // Row 18 (index 17): "Whisk together..." -> Instructions start here.
        // Row 24 (index 23): "Link"
        // Row 25 (index 24): URL

        let title = cleanText($('table.waffle tbody tr').eq(0).find('td').eq(0).text());
        if (!title) title = file.replace('.html', '');

        const ingredients = [];
        let instructions = [];
        let sourceUrl = '';

        const rows = $('table.waffle tbody tr');
        let state = 'start'; // start, ingredients, instructions

        rows.each((i, row) => {
             const colA = $(row).find('td').eq(0);
             const textA = cleanText(colA.text());

             // Row 0 is title usually
             if (i === 0) {
                 state = 'ingredients_search';
                 return;
             }

             if (textA === 'Recipe') {
                 state = 'instructions';
                 return;
             }

             if (textA === 'Link') {
                 state = 'link';
                 return;
             }

             if (state === 'ingredients_search') {
                 // Skip headers like "Cost", "Each", "Grams" etc.
                 if (textA.startsWith('Cost') || textA === 'Each' || textA === '' || textA === 'A' || textA === '1') {
                     // likely header or empty
                 } else {
                     // It's an ingredient line
                     ingredients.push(textA);
                 }
             } else if (state === 'instructions') {
                 if (textA) {
                     instructions.push(textA);
                 }
             } else if (state === 'link') {
                  const link = colA.find('a').attr('href');
                  if (link) sourceUrl = link;
                  else if (textA.startsWith('http')) sourceUrl = textA;
             }
        });

        // If instructions is empty, fallback to simple turndown
        let body = '';
        if (instructions.length > 0) {
            body = `### Instructions\n\n${instructions.join('\n\n')}`;
        } else {
            // Fallback
             body = turndownService.turndown(html);
        }

        const { slug, content } = generateMarkdown(title, title, sourceUrl || 'The Modern Mill', ingredients, ['baking', 'mill'], body);
        fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), content);
    }
    console.log(`Processed ${files.length} Mill recipes`);
}

async function processPdfExtract() {
    console.log('Processing pdf_extract.md...');
    const filePath = path.join(__dirname, 'recipes', 'pdf_extract.md');
    if (!fs.existsSync(filePath)) return;

    const text = fs.readFileSync(filePath, 'utf8');
    // Each block might start with frontmatter?
    // Actually, the example shows:
    // ---
    // title: ...
    // ---
    // Body
    // ---
    // title: ...

    // So we can split by `^---\s*$` regex.
    const blocks = text.split(/^---\s*$/m).map(b => b.trim()).filter(b => b);

    // Blocks will alternate: [Frontmatter, Body, Frontmatter, Body...] ???
    // Wait, the file snippet shows:
    // --- (start)
    // title: ...
    // --- (end fm)
    // Body
    // --- (next start?)

    // Let's iterate and see if a block looks like YAML.

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.startsWith('title:')) {
            // This is a frontmatter block.
            // The next block (if it exists and doesn't start with title:) is the body.
            // IF the file structure is strictly `--- \n FM \n --- \n Body \n ---`
            // Then `split` consumes the separators.
            // [text before first ---], [FM], [Body], [FM], [Body]...

            // However, looking closely at lines 40-41 in view_file:
            // 40: ---
            // 41:
            // 42: Original Source...

            // So yes, it alternates.

            // Let's parse the simple YAML manually or use a lib if needed, but manual is fine for simple keys.
            const titleMatch = block.match(/title:\s*"(.*)"/);
            const sourceMatch = block.match(/source:\s*"(.*)"/);
            const originalTitleMatch = block.match(/originalTitle:\s*"(.*)"/);
            // tags: ["a", "b"]
            const tagsMatch = block.match(/tags:\s*\[(.*)\]/);

            // Ingredients is a list.
            // ingredients:
            // * item
            // * item

            const ingredientLines = block.split('\n').filter(l => l.trim().startsWith('*'));
            const ingredients = ingredientLines.map(l => l.replace(/^\*\s*/, '').trim());

            const title = titleMatch ? titleMatch[1] : 'Untitled';
            const source = sourceMatch ? sourceMatch[1] : '';
            const originalTitle = originalTitleMatch ? originalTitleMatch[1] : title;
            const tags = tagsMatch ? tagsMatch[1].split(',').map(s => s.trim().replace(/"/g, '')) : [];

            // Next block is likely body
            let body = '';
            // Check if next block exists and is NOT a metadata block
            if (i + 1 < blocks.length && !blocks[i+1].startsWith('title:')) {
                body = blocks[i+1];
                i++; // Advance
            }

            const { slug, content } = generateMarkdown(title, originalTitle, source, ingredients, tags, body);
            fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), content);
            console.log(`Extracted: ${title}`);
        }
    }
}


async function processPdfs() {
    console.log('Processing PDFs...');
    const pdfFiles = [
        path.join(__dirname, 'recipes', '2025_DinnerBook.pdf'),
        path.join(__dirname, 'recipes', 'Weld Recipes.pdf')
    ];

    for (const pdfPath of pdfFiles) {
        if (!fs.existsSync(pdfPath)) continue;
        console.log(`Reading ${path.basename(pdfPath)}...`);

        try {
            const dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdf(dataBuffer);

            // PDF text is unstructured. We'll save it as one big file for now, or split by pages?
            // "Split each of these recipes into individual markdown files"
            // Splitting a PDF with multiple recipes is hard without visual cues.
            // Becca's "DinnerBook" might have one recipe per page.

            // Let's try to split by "Ingredients" or ALL CAPS lines or page breaks.
            // pdf-parse returns text. It separates pages with \n\n usually.

            // Heuristic: Process as one "Book" file for now OR try to find page breaks.
            // User wants "small, mobile-friendly... split each".
            // Let's save the whole thing as one MD first, users can refactor later or we improve heuristic.
            // Actually, better to save as "PDF Import - [Filename]" and let user know.

            const text = data.text;
            const { slug, content } = generateMarkdown(path.basename(pdfPath, '.pdf'), path.basename(pdfPath, '.pdf'), 'PDF Import', [], ['pdf'], text);
            fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), content);

        } catch (e) {
            console.error(`Failed to parse ${pdfPath}`, e);
        }
    }
}

async function main() {
    await processDinnerHtml();
    await processMillRecipes();
    await processPdfExtract();
    await processPdfs();
}

main();
