// Dynamic API base URL based on environment
const API_BASE = import.meta.env.PROD
  ? "https://ranking.aeseo1.org/api"  // Production domain
  : "http://localhost:8001/api";      // Development 

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

// Tracking APIs
export async function fetchTrackingList() {
  const res = await fetch(`${API_BASE}/tracking`);
  if (!res.ok) throw new Error("Không thể tải danh sách tracking");
  return res.json();
}

export async function addTracking(data: {
  user_name?: string;
  keyword: string;
  domain: string;
  location?: string;
  device?: string;
  frequency?: string;
}) {
  const res = await fetch(`${API_BASE}/tracking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Không thể thêm tracking");
  }
  return res.json();
}

export async function deleteTracking(id: number) {
  const res = await fetch(`${API_BASE}/tracking/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Không thể xóa tracking");
  return res.json();
}

export async function manualCheckTracking(id: number) {
  const res = await fetch(`${API_BASE}/tracking/${id}/check`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Không thể kiểm tra");
  return res.json();
}

export async function fetchTrackingHistory(keyword: string, domain: string, days: number = 30) {
  const res = await fetch(`${API_BASE}/tracking/history?keyword=${encodeURIComponent(keyword)}&domain=${encodeURIComponent(domain)}&days=${days}`);
  if (!res.ok) throw new Error("Không thể tải lịch sử");
  return res.json();
}

export async function fetchMonthlySnapshot(year: number, month: number) {
  const res = await fetch(`${API_BASE}/tracking/monthly/${year}/${month}`);
  if (!res.ok) throw new Error("Không thể tải snapshot tháng");
  return res.json();
}