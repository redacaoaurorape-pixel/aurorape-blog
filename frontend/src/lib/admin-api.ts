import { apiDelete, apiGetAuthed, apiPost, apiPostForm, apiPut } from "./api";
import type {
  ArticleCreate,
  ArticleListItem,
  ArticleOut,
  ArticleUpdate,
  AuthorCreate,
  AuthorOut,
  AuthorUpdate,
  CategoryCreate,
  CategoryOut,
  DashboardResponse,
  LoginRequest,
  TokenResponse,
  UploadResponse,
} from "./types";

export function login(payload: LoginRequest) {
  return apiPost<TokenResponse>("/admin/auth/login", payload);
}

export function getDashboard(token: string) {
  return apiGetAuthed<DashboardResponse>("/admin/dashboard", token);
}

export function listArticles(token: string) {
  return apiGetAuthed<ArticleListItem[]>("/admin/articles", token);
}

export function getArticleById(token: string, id: number | string) {
  return apiGetAuthed<ArticleOut>(`/admin/articles/${id}`, token);
}

export function createArticle(token: string, payload: ArticleCreate) {
  return apiPost<ArticleOut>("/admin/articles", payload, token);
}

export function updateArticle(token: string, id: number | string, payload: ArticleUpdate) {
  return apiPut<ArticleOut>(`/admin/articles/${id}`, payload, token);
}

export function deleteArticle(token: string, id: number | string) {
  return apiDelete<void>(`/admin/articles/${id}`, token);
}

export function uploadImage(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiPostForm<UploadResponse>("/admin/uploads", formData, token);
}

export function listAuthors(token: string) {
  return apiGetAuthed<AuthorOut[]>("/admin/authors", token);
}

export function getAuthorById(token: string, id: number) {
  return apiGetAuthed<AuthorOut>(`/admin/authors/${id}`, token);
}

export function createAuthor(token: string, payload: AuthorCreate) {
  return apiPost<AuthorOut>("/admin/authors", payload, token);
}

export function updateAuthor(token: string, id: number, payload: AuthorUpdate) {
  return apiPut<AuthorOut>(`/admin/authors/${id}`, payload, token);
}

export function deleteAuthor(token: string, id: number) {
  return apiDelete<void>(`/admin/authors/${id}`, token);
}

export function listCategoriesAdmin(token: string) {
  return apiGetAuthed<CategoryOut[]>("/admin/categories", token);
}

export function createCategory(token: string, payload: CategoryCreate) {
  return apiPost<CategoryOut>("/admin/categories", payload, token);
}
