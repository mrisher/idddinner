
import fm from 'front-matter';
import type { Recipe } from '../types';

// Load all markdown files from the content directory
const modules = import.meta.glob('../../content/*.md', { query: '?raw', import: 'default', eager: true });

export const recipes: Recipe[] = Object.keys(modules).map((path) => {
    const markdown = modules[path] as string;
    const { attributes, body } = fm<any>(markdown);
    const slug = path.split('/').pop()?.replace('.md', '') || '';

    return {
        slug,
        title: attributes.title || 'Untitled',
        originalTitle: attributes.originalTitle,
        source: attributes.source,
        tags: attributes.tags || [],
        bg: attributes.bg,
        ingredients: attributes.ingredients || [],
        body
    };
});

export function getRecipe(slug: string): Recipe | undefined {
    return recipes.find(r => r.slug === slug);
}
