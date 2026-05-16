import { useParams, Link } from "react-router-dom";
import { useQuery } from "react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Tag, Eye } from "lucide-react";

export default function KBArticlePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery(
    ["kb-article", id],
    () => api.get(`/kb/articles/${id}`).then((r) => r.data.data),
    { enabled: !!id }
  );

  const article = data || {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/kb"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-zictia-blue mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
      </Link>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading article...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md mb-2">
                {article.category}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{article.titleEn}</h1>
              {article.titleSw && (
                <p className="text-lg text-gray-600 mt-1">{article.titleSw}</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <Eye className="w-4 h-4" />
              {article.viewCount ?? 0} views
            </div>
          </div>

          <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
            {article.contentEn}
          </div>

          {article.contentSw && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Kiswahili</p>
              <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {article.contentSw}
              </div>
            </div>
          )}

          {article.tags && article.tags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              {article.tags.map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
