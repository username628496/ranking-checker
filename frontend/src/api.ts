import { API_ENDPOINTS } from "@/config/api";

export async function fetchTemplates() {
  const res = await fetch(API_ENDPOINTS.TEMPLATES);
  if (!res.ok) throw new Error("Không thể tải template");
  return res.json();
}

export async function createTemplate(data: {
  user_name: string;
  name: string;
  keywords: string[];
  domains: string[];
}) {
  const res = await fetch(API_ENDPOINTS.TEMPLATES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Không thể tạo template");
  }
  return res.json();
}

export async function updateTemplate(id: number, data: {
  name?: string;
  keywords?: string[];
  domains?: string[];
}) {
  const res = await fetch(API_ENDPOINTS.TEMPLATE_BY_ID(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Không thể cập nhật template");
  }
  return res.json();
}

export async function deleteTemplate(id: number) {
  const res = await fetch(API_ENDPOINTS.TEMPLATE_BY_ID(id), {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Không thể xóa template");
  }
  return res.json();
}
