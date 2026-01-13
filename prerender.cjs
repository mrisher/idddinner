const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, 'content');
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');
const OG_DIR = path.join(DIST_DIR, 'assets', 'og');

// Ensure OG directory exists
if (!fs.existsSync(OG_DIR)) {
    fs.mkdirSync(OG_DIR, { recursive: true });
}

// Background generator from Home.tsx
function getBackground(str) {
    const gradients = [
        'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)', // Pinky
        'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)', // Minty Blue
        'linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)', // Sunset
        'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)', // Lavender Blue
        'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)', // Silver
        'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // Cloudy
        'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)', // Bright Blue
        'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)', // Greenish
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Deep Purple
        'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)', // Citrus
        'linear-gradient(135deg, #FF6B6B 0%, #556270 100%)', // Red Grey
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
}

// Emoji generator from Home.tsx
function getEmoji(recipe) {
    const t = (recipe.tags || []).join(' ').toLowerCase();
    const title = recipe.title.toLowerCase();
    const combined = t + ' ' + title;

    if (combined.includes('pizza') || combined.includes('calzone')) return '🍕';
    if (combined.includes('burger')) return '🍔';
    if (combined.includes('taco') || combined.includes('fajita') || combined.includes('enchilada')) return '🌮';
    if (combined.includes('soup') || combined.includes('chili') || combined.includes('stew') || combined.includes('chowder')) return '🥣';
    if (combined.includes('salad')) return '🥗';
    if (combined.includes('bread') || combined.includes('cornbread') || combined.includes('focaccia')) return '🥖';
    if (combined.includes('cake') || combined.includes('torte') || combined.includes('pudding')) return '🍰';
    if (combined.includes('cookie') || combined.includes('biscuit')) return '🍪';
    if (combined.includes('pie') || combined.includes('tart')) return '🥧';
    if (combined.includes('pasta') || combined.includes('lasagna') || combined.includes('spaghetti') || combined.includes('macaroni') || combined.includes('ziti') || combined.includes('noodle')) return '🍝';
    if (combined.includes('rice') || combined.includes('risotto')) return '🍚';
    if (combined.includes('chicken') || combined.includes('turkey')) return '🍗';
    if (combined.includes('beef') || combined.includes('steak') || combined.includes('meatball') || combined.includes('brisket')) return '🥩';
    if (combined.includes('pork') || combined.includes('sausage') || combined.includes('ham') || combined.includes('bacon')) return '🥓';
    if (combined.includes('fish') || combined.includes('salmon') || combined.includes('cod') || combined.includes('tuna') || combined.includes('seafood')) return '🐟';
    if (combined.includes('shrimp') || combined.includes('lobster') || combined.includes('crab')) return '🦐';
    if (combined.includes('egg') || combined.includes('quiche') || combined.includes('frittata')) return '🍳';
    if (combined.includes('lemon')) return '🍋';
    if (combined.includes('apple')) return '🍎';
    if (combined.includes('banana')) return '🍌';
    if (combined.includes('pumpkin')) return '🎃';
    if (combined.includes('potato')) return '🥔';
    if (combined.includes('corn')) return '🌽';
    if (combined.includes('carrot')) return '🥕';
    if (combined.includes('broccoli')) return '🥦';
    if (combined.includes('avocado')) return '🥑';
    if (combined.includes('cheese') || combined.includes('queso')) return '🧀';
    if (combined.includes('sandwich') || combined.includes('grilled cheese')) return '🥪';
    if (combined.includes('curry')) return '🍛';

    return '🥘';
}

async function prerender() {
    if (!fs.existsSync(DIST_DIR) || !fs.existsSync(TEMPLATE_PATH)) {
        console.error('Build directory or index.html not found. Run npm run build first.');
        process.exit(1);
    }

    // Dynamic import for ESM modules
    const { default: satori } = await import('satori');
    const { Resvg } = await import('@resvg/resvg-js');

    // Fetch fonts
    // Fetch fonts
    const fontResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff');
    if (!fontResponse.ok) {
        throw new Error(`Failed to fetch font: ${fontResponse.statusText}`);
    }
    const fontData = await fontResponse.arrayBuffer();
    // Also fetch an emoji font if possible, or rely on system fallback/hope.
    // Noto Color Emoji is huge (20MB+), satori might struggle or it might be slow.
    // Let's try just the text font first. Satori often handles basic emojis if they are in the font, or we can use twemoji via satori options if needed.
    // For now, let's assume system characters or successful fallback.
    // Actually, satori needs an emoji font or logic to render emojis as images (graphemeImages).
    // A simple hack is to use a font that supports emojis or use `satori`'s `graphemeImages` option?
    // Let's try to just use Roboto Slab and see if the emoji renders (some environments have system fonts).
    // If not, we might see squares.
    // Safe bet: Fetch Noto Emoji just for the emoji? Or use a reliable small emoji font.
    // Let's start with just Roboto Slab and if it fails (squares), we can iterate.

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

    console.log(`Prerendering ${files.length} recipes...`);

    for (const file of files) {
        const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
        const { attributes, body } = frontMatter(content);

        // Generate slug from filename
        const slug = file.replace('.md', '');

        // Prepare metadata
        const title = `${attributes.title} | IDDDinner`;
        const excerpt = (attributes.summary || body)
            .replace(/[#*\[\]`]/g, '')
            .replace(/\n+/g, ' ')
            .substring(0, 150) + '...';

        // --- OG Image Generation ---
        const background = getBackground(attributes.title);
        const emoji = getEmoji({ ...attributes, title: attributes.title });

        // Construct the SVG markup object (React-element-like)
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: {
                        display: 'flex',
                        height: '100%',
                        width: '100%',
                        background: background,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        fontFamily: 'Inter',
                    },
                    children: [
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: 200, // Large emoji
                                },
                                children: emoji,
                            },
                        },
                        {
                            type: 'div',
                            props: {
                                style: {
                                    fontSize: 80,
                                    fontWeight: 'bold',
                                    color: 'white',
                                    marginTop: 40,
                                    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    textAlign: 'center',
                                    padding: '0 40px',
                                },
                                children: attributes.title,
                            },
                        },
                    ],
                },
            },
            {
                width: 1200,
                height: 630,
                fonts: [
                    {
                        name: 'Inter',
                        data: fontData,
                        weight: 700,
                        style: 'normal',
                    },
                ],
            }
        );

        const resvg = new Resvg(svg);
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        const ogParams = new URLSearchParams();
        ogParams.append('title', attributes.title);
        // We'll write the file to dist/assets/og/{slug}.png
        const ogFileName = `${slug}.png`;
        fs.writeFileSync(path.join(OG_DIR, ogFileName), pngBuffer);
        const ogImageUrl = `https://idddinner.com/assets/og/${ogFileName}`;

        // Create directory dist/recipe/:slug
        const outDir = path.join(DIST_DIR, 'recipe', slug);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        // Inject meta tags
        let html = template;

        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

        html = html.replace(
            /<meta property="og:title" content=".*?" \/>/,
            `<meta property="og:title" content="IDDDinner | ${title}" />`
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

        // Replace the OG Image
        html = html.replace(
            /<meta property="og:image"[\s\S]*?content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image" content="${ogImageUrl}" />`
        );

        // Also add twitter card if not present, or assume it uses og:image
        // The default template might not have twitter tags, but OG is usually enough for slack/discord/twitter basic.

        fs.writeFileSync(path.join(outDir, 'index.html'), html);
    }

    console.log('Prerendering complete! Static files and OG images ready.');
}

prerender();
