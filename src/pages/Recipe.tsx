
import { useParams, Link, Navigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Helmet } from 'react-helmet-async';
import { getRecipe } from '../lib/recipes';

export default function Recipe() {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();
    const recipe = getRecipe(slug || '');

    if (!recipe) {
        return <Navigate to="/" replace />;
    }

    // Determine back link destination
    console.log('Recipe location state:', location.state);
    const searchString = location.state?.search;
    const backLinkTo = searchString ? `/?${searchString}` : '/';

    // Generate a simple excerpt from the body (remove markdown chars)
    const excerpt = recipe.summary || recipe.body
        .replace(/[#*\[\]`]/g, '') // strip basics
        .replace(/\n+/g, ' ') // collapse lines
        .substring(0, 160) + '...';

    return (
        <div>
            <Helmet>
                <title>{recipe.title} | IDDDinner</title>
                <meta name="description" content={excerpt} />
                <meta property="og:title" content={`IDDDinner | ${recipe.title}`} />
                <meta property="og:description" content={excerpt} />
                <meta property="og:type" content="article" />
            </Helmet>
            <Link to={backLinkTo} className="back-link">← Back to Recipes</Link>
            <article className="recipe-detail">
                <header className="recipe-header">
                    <h1 className="recipe-title">{recipe.title}</h1>
                    <div className="recipe-meta">
                        {recipe.tags && recipe.tags.length > 0 && <span>{recipe.tags.join(', ')}</span>}
                    </div>
                    {recipe.source && isUrl(recipe.source) && (
                         <div className="source-link">
                            <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="external-link-btn">
                                Open Original Recipe ↗
                            </a>
                         </div>
                    )}
                    {recipe.source && !isUrl(recipe.source) && <div className="source-text">Source: {recipe.source}</div>}
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
                     <ReactMarkdown remarkPlugins={[remarkBreaks]}>{recipe.body}</ReactMarkdown>
                </section>


            </article>
        </div>
    );
}

function isUrl(str: string) {
    return str.startsWith('http');
}
