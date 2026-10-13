import { apiGet, apiPost } from "./api";
import type {
  ArticleListItem,
  ArticleOut,
  AuthorOut,
  CategoryOut,
  HomeResponse,
  NewsletterSubscribeResponse,
  PaginatedResponse,
} from "./types";

export async function getHome(): Promise<HomeResponse> {
  try {
    return await apiGet<HomeResponse>("/home", { revalidate: 60 });
  } catch (err) {
    console.error("Warning: Failed to fetch home data from API:", err);
    return { hero: null, secondary: [], feed: [] };
  }
}

export async function getCategories(): Promise<CategoryOut[]> {
  try {
    return await apiGet<CategoryOut[]>("/categories", { revalidate: 300 });
  } catch (err) {
    console.error("Warning: Failed to fetch categories from API:", err);
    return [];
  }
}

export function getCategoryArticles(slug: string, page = 1) {
  return apiGet<PaginatedResponse<ArticleListItem>>(
    `/categories/${slug}/articles?page=${page}`,
    { revalidate: 60 }
  );
}

export async function getArticlesForSitemap(limit = 1000): Promise<ArticleListItem[]> {
  try {
    return await apiGet<ArticleListItem[]>(`/articles?limit=${limit}`, { revalidate: 3600 });
  } catch (err) {
    console.error("Warning: Failed to fetch articles for sitemap from API:", err);
    return [];
  }
}

export function getArticle(slug: string) {
  return apiGet<ArticleOut>(`/articles/${slug}`, { revalidate: 60 });
}

export function getRelated(slug: string) {
  return apiGet<ArticleListItem[]>(`/articles/${slug}/related`, { revalidate: 60 });
}

export function getAuthor(slug: string) {
  return apiGet<AuthorOut>(`/authors/${slug}`, { revalidate: 300 });
}

export function search(q: string) {
  return apiGet<ArticleListItem[]>(`/search?q=${encodeURIComponent(q)}`);
}

export function getTrendingArticles(limit = 3) {
  return apiGet<ArticleListItem[]>(`/articles/trending?limit=${limit}`, { revalidate: 60 });
}

export function getArticles(limit = 20) {
  return apiGet<ArticleListItem[]>(`/articles?limit=${limit}`, { revalidate: 60 });
}

export function subscribeNewsletter(email: string) {
  return apiPost<NewsletterSubscribeResponse>("/newsletter", { email });
}
