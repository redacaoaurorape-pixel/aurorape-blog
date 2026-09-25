"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminToken } from "@/lib/auth";
import { createArticle, deleteArticle, updateArticle, uploadImage } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import type { ArticleCreate, ArticleImageIn } from "@/lib/types";

export async function deleteArticleAction(id: number | string) {
  const token = await requireAdminToken();
  await deleteArticle(token, id);
  revalidatePath("/admin");
}

function parseImagesJson(raw: string): ArticleImageIn[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item): ArticleImageIn[] => {
    if (!item || typeof item !== "object") return [];
    const url = String((item as { url?: unknown }).url ?? "").trim();
    if (!url) return [];
    const photographerRaw = (item as { photographer?: unknown }).photographer;
    const photographer = typeof photographerRaw === "string" ? photographerRaw.trim() : "";
    return [{ url, photographer: photographer || null }];
  });
}

function parseArticleForm(formData: FormData): ArticleCreate {
  const readingTime = formData.get("reading_time_min");
  const actionIntent = String(formData.get("action_intent") ?? "");
  const isPublishedChecked = formData.get("is_published") === "true";

  let isPublished = isPublishedChecked;
  if (actionIntent === "publish") {
    isPublished = true;
  } else if (actionIntent === "save_draft") {
    isPublished = false;
  } else {
    isPublished = isPublishedChecked;
  }

  return {
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim() || null,
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    chapeu: String(formData.get("chapeu") ?? "").trim() || null,
    body: String(formData.get("body") ?? ""),
    images: parseImagesJson(String(formData.get("images_json") ?? "[]")),
    reading_time_min: readingTime ? Number(readingTime) : null,
    is_published: isPublished,
    author_id: Number(formData.get("author_id")),
    category_id: Number(formData.get("category_id")),
  };
}

export async function uploadArticleImageAction(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const token = await requireAdminToken();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Nenhum arquivo selecionado." };
  }

  try {
    const result = await uploadImage(token, file);
    return { url: result.url };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    return { error: "Falha ao enviar a imagem." };
  }
}

export async function createArticleAction(formData: FormData) {
  const token = await requireAdminToken();
  const payload = parseArticleForm(formData);
  await createArticle(token, payload);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateArticleAction(id: number | string, formData: FormData) {
  const token = await requireAdminToken();
  const payload = parseArticleForm(formData);
  await updateArticle(token, id, payload);
  revalidatePath("/admin");
  redirect("/admin");
}
