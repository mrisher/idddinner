
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { recipes } from '../lib/recipes';

export default function Home() {
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    // Get all unique tags for filter
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        recipes.forEach(r => r.tags?.forEach(t => tags.add(t.toLowerCase())));
        return Array.from(tags).sort();
    }, []);

    const fuse = useMemo(() => {
        return new Fuse(recipes, {
            keys: ['title', 'ingredients', 'tags'],
            threshold: 0.3,
            ignoreLocation: true
        });
    }, []);

    const filteredRecipes = useMemo(() => {
        let result = recipes;

        if (query) {
            result = fuse.search(query).map(r => r.item);
        }

        if (activeFilter) {
            result = result.filter(r => r.tags?.some(t => t.toLowerCase() === activeFilter));
        }

        return result;
    }, [query, activeFilter, fuse]);

    return (
        <div>
            <input
                type="text"
                placeholder="Search recipes, ingredients..."
                className="search-bar"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            <div className="filters">
                <button
                    className={`filter-chip ${activeFilter === null ? 'active' : ''}`}
                    onClick={() => setActiveFilter(null)}
                >
                    All
                </button>
                {allTags.map(tag => (
                    <button
                        key={tag}
                        className={`filter-chip ${activeFilter === tag ? 'active' : ''}`}
                        onClick={() => setActiveFilter(tag)}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            <div className="recipe-grid">
                {filteredRecipes.map(recipe => (
                    <Link to={`/recipe/${recipe.slug}`} key={recipe.slug} className="recipe-card">
                        <div className="card-img-placeholder" style={{ background: getBackground(recipe.title) }}>
                            {getEmoji(recipe)}
                        </div>
                        <div className="card-content">
                            <h3 className="card-title">{recipe.title}</h3>
                            <div className="card-tags">
                                {recipe.tags?.slice(0, 3).map(t => (
                                    <span key={t} className="tag">{t}</span>
                                ))}
                                {(recipe.tags?.length || 0) > 3 && <span className="tag">+{recipe.tags!.length - 3}</span>}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            {filteredRecipes.length === 0 && (
                <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-light)'}}>
                    No recipes found. Try a different search!
                </div>
            )}
        </div>
    );
}

// Deterministic gradient generator
function getBackground(str: string) {
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

function getEmoji(recipe: any) {
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

    return '🥘'; // Generic pot of food as default instead of plate
}
