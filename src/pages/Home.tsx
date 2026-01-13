
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
                        <div className="card-img-placeholder">
                            {/* Simple emoji logic based on simple heuristic */}
                            {getEmoji(recipe.tags || [])}
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

function getEmoji(tags: string[]) {
    const t = tags.join(' ').toLowerCase();
    if (t.includes('chicken')) return '🍗';
    if (t.includes('beef')) return '🥩';
    if (t.includes('pork')) return '🥓';
    if (t.includes('fish') || t.includes('shrimp') || t.includes('salmon')) return '🐟';
    if (t.includes('soup')) return 'soup';
    if (t.includes('baking') || t.includes('cake') || t.includes('bread')) return '🍞';
    if (t.includes('egg')) return '🍳';
    if (t.includes('pasta')) return '🍝';
    if (t.includes('rice')) return '🍚';
    return '🍽️';
}
