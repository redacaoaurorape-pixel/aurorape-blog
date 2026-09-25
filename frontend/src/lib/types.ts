export interface CategoryOut {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  article_count?: number;
}

export interface CategoryCreate {
  name: string;
  slug?: string | null;
  description?: string | null;
}

export interface AuthorMini {
  id: number;
  name: string;
  slug: string;
  photo_url?: string | null;
}

export interface AuthorOut extends AuthorMini {
  bio?: string | null;
  social_links?: Record<string, string> | null;
  role?: string | null;
  email?: string | null;
}

export interface AuthorCreate {
  name: string;
  slug?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  social_links?: Record<string, string> | null;
  role: string;
  email: string;
  password: string;
}

export interface AuthorUpdate {
  name: string;
  slug?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  social_links?: Record<string, string> | null;
  role: string;
  email: string;
  password?: string | null;
}

export interface TagOut {
  id: number;
  name: string;
  slug: string;
}

// Formato de LEITURA — como o backend devolve cada imagem em ArticleOut.images
export interface ArticleImageOut {
  id: number;
  image_url: string;
  photographer?: string | null;
  sort_order: number;
}

// Formato de ESCRITA — como o backend espera cada imagem em ArticleCreate/ArticleUpdate.images
export interface ArticleImageIn {
  url: string;
  photographer?: string | null;
}

export interface UploadResponse {
  url: string;
}

export interface ArticleListItem {
  id: number;
  title: string;
  slug: string;
  subtitle?: string | null;
  chapeu?: string | null;
  featured_image_url?: string | null;
  reading_time_min: number;
  is_published: boolean;
  published_at?: string | null;
  author: AuthorMini;
  category: CategoryOut;
}

export interface ArticleOut extends ArticleListItem {
  body: string;
  tags: TagOut[];
  images: ArticleImageOut[];
  created_at: string;
  updated_at: string;
}

export interface ArticleCreate {
  title: string;
  slug?: string | null;
  subtitle?: string | null;
  chapeu?: string | null;
  body: string;
  images: ArticleImageIn[];
  reading_time_min?: number | null;
  is_published: boolean;
  author_id: number;
  category_id: number;
}

export type ArticleUpdate = ArticleCreate;

export interface HomeResponse {
  hero?: ArticleListItem | null;
  secondary: ArticleListItem[];
  feed: ArticleListItem[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface NewsletterSubscribeResponse {
  message: string;
}

export interface DashboardResponse {
  total_articles: number;
  total_published: number;
  total_authors: number;
  recent: ArticleListItem[];
}
