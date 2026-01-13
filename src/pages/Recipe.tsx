
import { useParams, Link, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getRecipe } from '../lib/recipes';

export default function Recipe() {
    const { slug } = useParams<{ slug: string }>();
    const recipe = getRecipe(slug || '');

    if (!recipe) {
        return <Navigate to="/" replace />;
    }

    return (
        <div>
            <Link to="/" className="back-link">← Back to Recipes</Link>
            <article className="recipe-detail">
                <header className="recipe-header">
                    <h1 className="recipe-title">{recipe.title}</h1>
                    <div className="recipe-meta">
                        {recipe.source && <span>Source: {isUrl(recipe.source) ? <a href={recipe.source} target="_blank" rel="noopener noreferrer" style={{color:'var(--primary)'}}>Link</a> : recipe.source}</span>}
                        {recipe.tags && recipe.tags.length > 0 && <span>• {recipe.tags.join(', ')}</span>}
                    </div>
                </header>

                {(recipe.ingredients && recipe.ingredients.length > 0) && (
                    <section className="ingredients-section">
                        <h2 className="section-title">Ingredients</h2>
                        <ul className="ingredients-list">
                            {recipe.ingredients.map((ing, i) => (
                                <li key={i}>{ing}</li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className="instructions-section">
                     <h2 className="section-title">Instructions</h2>
                     <ReactMarkdown>{recipe.body}</ReactMarkdown>
                </section>
            </article>
        </div>
    );
}

function isUrl(str: string) {
    return str.startsWith('http');
}
