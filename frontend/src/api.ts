const API_BASE = "http://localhost:8000/api"; 

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE}/templates`);
  if (!res.ok) throw new Error("Không thể tải template");
  return res.json();
}

export async function createTemplate(data: {
  user_name: string;
  name: string;
  keywords: string[];
  domains: string[];
}) {
  const res = await fetch(`${API_BASE}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Không thể tạo template");
  return res.json();
}

export async function updateTemplate(id: number, data: {
  name?: string;
  keywords?: string[];
  domains?: string[];
}) {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Không thể cập nhật template");
  return res.json();
}

export async function deleteTemplate(id: number) {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Không thể xóa template");
  return res.json();
}