const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, 'content');
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

function prerender() {
    if (!fs.existsSync(DIST_DIR) || !fs.existsSync(TEMPLATE_PATH)) {
        console.error('Build directory or index.html not found. Run npm run build first.');
        process.exit(1);
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

    console.log(`Prerendering ${files.length} recipes...`);

    files.forEach(file => {
        const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
        const { attributes, body } = frontMatter(content);

        // Generate slug from filename
        const slug = file.replace('.md', '');

        // Prepare metadata
        const title = `${attributes.title} | IDDDinner`;
        // Basic markup strip for description
        const excerpt = (attributes.summary || body)
            .replace(/[#*\[\]`]/g, '')
            .replace(/\n+/g, ' ')
            .substring(0, 150) + '...';

        // Create directory dist/recipe/:slug
        const outDir = path.join(DIST_DIR, 'recipe', slug);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        // Inject meta tags
        let html = template;

        // Replace Title
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

        // Replace OG Tags (naive regex replacement based on what we put in index.html)
        // Note: This matches the default tags we added to index.html

        html = html.replace(
            /<meta property="og:title" content=".*?" \/>/,
            `<meta property="og:title" content="${attributes.title}" />`
        );

        html = html.replace(
            /<meta name="description" content=".*?" \/>/,
            `<meta name="description" content="${excerpt.replace(/"/g, '&quot;')}" />`
        );

        html = html.replace(
            /<meta property="og:description" content=".*?" \/>/,
            `<meta property="og:description" content="${excerpt.replace(/"/g, '&quot;')}" />`
        );

        html = html.replace(
            /<meta property="og:type" content=".*?" \/>/,
            `<meta property="og:type" content="article" />`
        );

        // Write index.html to the subfolder
        fs.writeFileSync(path.join(outDir, 'index.html'), html);
    });

    console.log('Prerendering complete! Static files ready for social bots.');
}

prerender();
