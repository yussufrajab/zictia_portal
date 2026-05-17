import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { BookOpen, Plus, Trash2, Edit, Save, X, Loader } from "lucide-react";

const emptyArticle = {
  titleEn: "",
  titleSw: "",
  contentEn: "",
  contentSw: "",
  category: "",
  tags: [] as string[],
  isPublished: false,
};

export default function AdminKB() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyArticle });
  const [tagInput, setTagInput] = useState("");

  const { data, isLoading } = useQuery("admin-kb-articles", () =>
    api.get("/kb/admin/articles?page=1&limit=50").then((r) => r.data)
  );

  const createMutation = useMutation(
    () => api.post("/kb/admin/articles", form),
    {
      onSuccess: () => {
        toast.success("Article created");
        setForm({ ...emptyArticle });
        setEditingId(null);
        queryClient.invalidateQueries("admin-kb-articles");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to create"); },
    }
  );

  const updateMutation = useMutation(
    () => api.put(`/kb/admin/articles/${editingId}`, form),
    {
      onSuccess: () => {
        toast.success("Article updated");
        setForm({ ...emptyArticle });
        setEditingId(null);
        queryClient.invalidateQueries("admin-kb-articles");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to update"); },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/kb/admin/articles/${id}`),
    {
      onSuccess: () => {
        toast.success("Article deleted");
        queryClient.invalidateQueries("admin-kb-articles");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to delete"); },
    }
  );

  const articles = data?.data || [];

  const startEdit = (article: any) => {
    setEditingId(article.id);
    setForm({
      titleEn: article.titleEn || "",
      titleSw: article.titleSw || "",
      contentEn: article.contentEn || "",
      contentSw: article.contentSw || "",
      category: article.category || "",
      tags: article.tags || [],
      isPublished: article.isPublished || false,
    });
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm({ ...form, tags: [...form.tags, trimmed] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const handleSubmit = () => {
    if (!form.titleEn || !form.titleSw || !form.contentEn || !form.contentSw || !form.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zictia-navy">Knowledge Base Manager</h1>
          <p className="text-gray-600">Create and manage help articles.</p>
        </div>
        <button
          onClick={() => { setEditingId("new"); setForm({ ...emptyArticle }); }}
          className="flex items-center gap-1 px-4 py-2 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Article
        </button>
      </div>

      {editingId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId === "new" ? "New Article" : "Edit Article"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
              <input
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (Swahili)</label>
              <input
                value={form.titleSw}
                onChange={(e) => setForm({ ...form, titleSw: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content (English)</label>
              <textarea
                value={form.contentEn}
                onChange={(e) => setForm({ ...form, contentEn: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content (Swahili)</label>
              <textarea
                value={form.contentSw}
                onChange={(e) => setForm({ ...form, contentSw: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={addTag}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-blue-700 hover:text-blue-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="isPublished"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">Published</label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="flex items-center gap-1 px-4 py-2 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {(createMutation.isLoading || updateMutation.isLoading) && <Loader className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={() => { setEditingId(null); setForm({ ...emptyArticle }); }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No articles yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {articles.map((article: any) => (
              <div key={article.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{article.titleEn}</p>
                  <p className="text-xs text-gray-500">
                    {article.category} &bull; {article.isPublished ? "Published" : "Draft"} &bull; {article.viewCount} views
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(article)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this article?")) deleteMutation.mutate(article.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
