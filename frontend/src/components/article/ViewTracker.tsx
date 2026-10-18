"use client";

import { useEffect } from "react";
import { apiPost } from "@/lib/api";

export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    apiPost(`/articles/${slug}/view`).catch(() => {});
  }, [slug]);

  return null;
}
