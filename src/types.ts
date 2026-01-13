export interface Recipe {
    slug: string;
    title: string;
    originalTitle?: string;
    source?: string;
    tags?: string[];
    bg?: string;
    ingredients?: string[];
    body: string;
}
