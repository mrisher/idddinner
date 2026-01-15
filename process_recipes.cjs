
const fs = require('fs');
const mammoth = require('mammoth');
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
        // Legacy cache check: if it's a string, wrap it
        if (typeof urlCache[url] === 'string') {
            return { md: urlCache[url], excerpt: '' };
        }
        // Assuming it's an object { md, excerpt }
        return urlCache[url];
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

            const result = { md, excerpt: article.excerpt || '' };
            urlCache[url] = result;
            saveCache();
            return result;
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
// Generate MD content with frontmatter
function generateMarkdown(title, originalTitle, source, ingredients, tags, body, summary) {
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
summary: "${summary ? summary.replace(/"/g, '\\"').replace(/\n/g, ' ') : ''}"
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
        let scrapedSummary = '';

        if (mealLink && mealLink.startsWith('http')) {
             try {
                const result = await scrapeUrl(mealLink);
                if (result) {
                    body = result.md;
                    scrapedSummary = result.excerpt;
                }
             } catch (err) {
                 console.log(`Failed to scrape ${mealLink}`);
             }
        }

        const { slug, content } = generateMarkdown(mealName, mealName, mealLink || source, ingredients, ['dinner'], body, scrapedSummary);
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

        // Header Structure:
        // Row 1 (Index 0): Title in first cell
        // Row 4+ (Index 3+): Ingredients (one per row, in first cell)
        // Instructions follow a row with "Recipe" in first cell

        let title = cleanText($('table tbody tr').eq(0).find('td').eq(0).text());
        if (!title || title === '1') title = file.replace('.html', '');

        const ingredients = [];
        let instructions = [];
        let sourceUrl = '';
        let isInIngredients = false;
        let isInInstructions = false;

        const rows = $('table tbody tr');

        rows.each((i, row) => {
            const colA = $(row).find('td').eq(0);
            const textA = cleanText(colA.text());

            // Start looking for ingredients at row 4 (index 3)
            if (i === 3) {
                isInIngredients = true;
            }

            if (textA === 'Recipe' || textA === 'Instructions') {
                isInIngredients = false;
                isInInstructions = true;
                return; // Skip this header row
            }

            if (textA === 'Link' || textA === 'Source') {
                isInInstructions = false;
                // Next rows might contain the link
                return;
            }

            // Capture Data
            if (isInIngredients) {
                // If the line is very long, it's likely an instruction paragraph (heuristic)
                if (textA.length > 80) {
                    isInIngredients = false;
                    isInInstructions = true;
                    instructions.push(textA);
                }
                // Must have text, and not be a header row
                else if (textA && !textA.match(/^cost/i) && !textA.match(/^(Each|Grams|Cups)/) && textA.length > 2) {
                     // Check if it looks like a row number (just digits)
                     if (!/^\d+$/.test(textA)) {
                        ingredients.push(textA);
                     }
                }
            } else if (isInInstructions) {
                 if (textA && textA.length > 5) { // Avoid stray numbers
                     instructions.push(textA);
                 }
            }

            // Check for link anywhere
            const href = colA.find('a').attr('href');
            if (href && href.startsWith('http')) {
                sourceUrl = href;
            }
        });

        // Assemble Body
        let body = '';
        if (instructions.length > 0) {
            body = `### Instructions\n\n${instructions.join('\n\n')}`;
        } else {
            // If parsing failed to find "Instructions" section, might be unstructured
            // But let's NOT default to dumping the whole HTML anymore
            body = 'No instructions extracted. See original source.';
        }

        const { slug, content } = generateMarkdown(title, title, sourceUrl || 'The Modern Mill', ingredients, ['baking', 'mill'], body, '');
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

            const { slug, content } = generateMarkdown(title, originalTitle, source, ingredients, tags, body, '');
            fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), content);
            console.log(`Extracted: ${title}`);
        }
    }
}


async function process2025DinnerBook() {
    console.log('Processing 2025_DinnerBook.docx...');
    const docxPath = path.join(__dirname, 'recipes', '2025_DinnerBook.docx');
    if (!fs.existsSync(docxPath)) {
        console.warn('2025_DinnerBook.docx not found, skipping.');
        return;
    }

    const outputDir = path.join(CONTENT_DIR, '2025_DinnerBook');
    // Clean up old files
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    try {
        const result = await mammoth.convertToHtml({ path: docxPath });
        const html = result.value;
        const $ = cheerio.load(html);

        // Iterate over top-level elements
        // Mammoth output is usually flat: <h1>...</h1><p>...</p>
        const elements = $('body').children().toArray();

        let currentCategory = '';
        let currentRecipe = null;
        let count = 0;

        const saveCurrentRecipe = () => {
            if (currentRecipe && currentRecipe.title) {
                // Convert body elements back to HTML string
                const bodyHtml = currentRecipe.bodyElements.map(el => $.html(el)).join('\n');
                const md = turndownService.turndown(bodyHtml);

                // Add category and source tag
                const tags = ['2025-dinner-book'];
                if (currentCategory) tags.push(currentCategory.toLowerCase());

                const { slug, content } = generateMarkdown(
                    currentRecipe.title,
                    currentRecipe.title,
                    '2025 Dinner Book',
                    [], // Ingredients extraction skipped for now
                    tags,
                    md,
                    ''
                );

                fs.writeFileSync(path.join(outputDir, `${slug}.md`), content);
                count++;
            }
        };

        for (const el of elements) {
            const tagName = el.tagName.toLowerCase();
            const text = $(el).text().trim();

            if (tagName === 'h1') {
                saveCurrentRecipe();
                currentCategory = text;
                currentRecipe = null;
            } else if (tagName === 'h2') {
                saveCurrentRecipe();
                currentRecipe = {
                    title: text,
                    bodyElements: []
                };
            } else {
                // Add content to current recipe
                if (currentRecipe) {
                    currentRecipe.bodyElements.push(el);
                }
            }
        }
        // Save the last one
        saveCurrentRecipe();

        console.log(`Processed ${count} recipes from 2025_DinnerBook.docx to ${outputDir}`);

    } catch (e) {
        console.error('Failed to process 2025_DinnerBook.docx', e);
    }
}

async function processWeldRecipes() {
    console.log('Processing Weld Recipes.pdf...');
    const pdfPath = path.join(__dirname, 'recipes', 'Weld Recipes.pdf');
    if (!fs.existsSync(pdfPath)) return;

    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);
        const text = data.text;

        // Split by 3+ newlines (visual delimiter)
        const fragments = text.split(/\n\s*\n\s*\n/);

        const outputDir = path.join(CONTENT_DIR, 'Weld_Recipes');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let count = 0;
        for (const fragment of fragments) {
            const lines = fragment.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 3) continue; // Noise

            // Title is first line
            const title = lines[0];
            const body = fragment.trim();

             // Ignore TOC or Intro fragments
            if (title.match(/table of contents/i) || title.match(/^ingredients$/i)) continue;

            const { slug, content } = generateMarkdown(
                title,
                title,
                'Weld Recipes',
                [],
                ['weld-recipes'],
                body,
                ''
            );

            fs.writeFileSync(path.join(outputDir, `${slug}.md`), content);
            count++;
        }

        console.log(`Extracted ${count} recipes to ${outputDir}`);

    } catch (e) {
        console.error(`Failed to process Weld Recipes.pdf`, e);
    }
}

async function processPdfs() {
    await process2025DinnerBook();
    await processWeldRecipes();
}

async function processPBatraRecipes() {
    console.log('Processing PBatra Recipes...');
    const dir = path.join(__dirname, 'recipes', 'PBatra Recipes');
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file, ext);

        if (ext === '.docx') {
            try {
                const result = await mammoth.convertToHtml({path: filePath});
                const html = result.value;
                const md = turndownService.turndown(html);

                const { slug, content } = generateMarkdown(
                    baseName,
                    baseName,
                    'PBatra Recipes',
                    [], // No ingredients extraction for now
                    ['pbatra'],
                    md,
                    ''
                );
                fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), content);
                console.log(`Processed DOCX: ${baseName}`);
            } catch (err) {
                console.error(`Failed to process DOCX ${file}:`, err.message);
            }
        } else if (ext === '.pdf') {
             try {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdf(dataBuffer);
                const text = data.text;

                 const { slug, content } = generateMarkdown(
                    baseName,
                    baseName,
                    'PBatra Recipes (PDF)',
                    [],
                    ['pbatra', 'pdf'],
                    text,
                    ''
                );
                fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), content);
                console.log(`Processed PDF: ${baseName}`);

            } catch (e) {
                console.error(`Failed to parse PDF ${file}`, e);
            }
        }
    }
}

async function main() {
    await processDinnerHtml();
    await processMillRecipes();
    await processPdfExtract();
    await processPdfs();
    await processPBatraRecipes();
}

main();
