import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Calendar,
  Tag,
  Globe,
  Check,
} from "lucide-react";
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../api";

type Template = {
  id: number;
  user_name: string;
  name: string;
  keywords: string[];
  domains: string[];
  created_at: string;
};

export default function UserTemplate() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [userName, setUserName] = useState("");
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [domains, setDomains] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function toggleExpand(id: number) {
    setExpandedId(expandedId === id ? null : id);
  }

  async function loadTemplates() {
    const data = await fetchTemplates();
    setTemplates(data);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  async function handleSave() {
    if (!userName || !name) return alert("Vui lòng nhập đầy đủ thông tin");

    const payload = {
      user_name: userName,
      name,
      keywords: keywords.split("\n").map((s) => s.trim()).filter(Boolean),
      domains: domains.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    if (editId) {
      await updateTemplate(editId, payload);
      setEditId(null);
    } else {
      await createTemplate(payload);
    }

    resetForm();
    loadTemplates();
  }

  function resetForm() {
    setUserName("");
    setName("");
    setKeywords("");
    setDomains("");
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(t: Template) {
    setEditId(t.id);
    setUserName(t.user_name);
    setName(t.name);
    setKeywords(t.keywords.join("\n"));
    setDomains(t.domains.join("\n"));
    setShowForm(true);

  }

  async function handleDelete(id: number) {
    if (confirm("Bạn có chắc muốn xoá template này?")) {
      await deleteTemplate(id);
      loadTemplates();
    }
  }

  function handleCopy(list: string[], label: string) {
    navigator.clipboard.writeText(list.join("\n"));
    setCopyFeedback(`Đã copy ${label}`);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
    });
  }

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Copy feedback toast */}
      {copyFeedback && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 animate-pulse">
          <Check className="w-4 h-4" />
          {copyFeedback}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
        
          <h3 className="text-4xl font-bold text-slate-900">Template cá nhân</h3>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Lưu trữ và quản lý bộ từ khóa & domain của riêng bạn
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {templates.length} templates
            </span>
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {templates.reduce((sum, t) => sum + t.domains.length, 0)} domains
            </span>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg ${
              showForm
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
            }`}
          >
            {showForm ? (
              <>
                <X className="w-5 h-5" />
                Đóng form
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Thêm Template
              </>
            )}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white/90 backdrop-blur-sm border border-white/50 rounded-3xl shadow-xs p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                {editId ? <Edit3 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {editId ? "Chỉnh sửa Template" : "Tạo Template Mới"}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Tên người dùng
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Tên người dùng"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Tên template
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Tên template"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  Keywords
                </label>
                <textarea
                  rows={6}
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Mỗi dòng 1 keyword"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all font-mono text-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Domains
                </label>
                <textarea
                  rows={6}
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  placeholder="Mỗi dòng 1 domain"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg transition-all transform hover:scale-105"
              >
                {editId ? "Cập nhật" : "Lưu"}
              </button>
              <button
                onClick={resetForm}
                className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-semibold transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        

        {/* Search */}
        <div className="relative max-w-md mx-auto group">
  {/* Icon Search */}
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 w-5 h-5 transition-colors" />

  {/* Input */}
  <input
    type="text"
    placeholder="Tìm template..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full pl-12 pr-12 py-4 rounded-full bg-white/80 border border-slate-200 shadow-xs 
               placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
               focus:outline-none transition-all text-slate-700"
  />

  {/* Nút clear khi có text */}
  {searchQuery && (
    <button
      onClick={() => setSearchQuery("")}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  )}
</div>

        {/* Template List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="group bg-white/80 backdrop-blur-sm border-2 border-white/50 rounded-2xl shadow-xs p-6 hover:shadow-2xs hover:scale-100 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-blue-700 transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-sm text-slate-600 font-medium">{t.user_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {t.keywords.length} keywords
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {t.domains.length} domains
                    </span>
                  </div>
                  {t.created_at && (
                    <p className="text-xs text-slate-400 mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(t.created_at)}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(t.keywords, "keywords")}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Copy keywords"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(t.domains, "domains")}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Copy domains"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(t)}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                    title="Chỉnh sửa"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview tags */}
              <div className="space-y-2 mb-4">
                <div className="flex flex-wrap gap-1">
                  {t.keywords.slice(0, 3).map((k, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium"
                    >
                      {k}
                    </span>
                  ))}
                  {t.keywords.length > 3 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                      +{t.keywords.length - 3}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.domains.slice(0, 2).map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md font-mono"
                    >
                      {d}
                    </span>
                  ))}
                  {t.domains.length > 2 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                      +{t.domains.length - 2}
                    </span>
                  )}
                </div>
              </div>


             
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? "Không tìm thấy template nào" : "Chưa có template nào"}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery 
                ? "Thử tìm kiếm với từ khóa khác" 
                : "Tạo template đầu tiên để bắt đầu"
              }
            </p>
            {!showForm && !searchQuery && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Tạo Template Đầu Tiên
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}