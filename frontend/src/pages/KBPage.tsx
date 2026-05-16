import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useQuery } from "react-query";
import { Search, BookOpen, Tag, ArrowRight } from "lucide-react";

export default function KBPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const [query, setQuery] = useState(search);

  const { data: categories } = useQuery("kb-categories", () =>
    api.get("/kb/categories").then((r) => r.data.data)
  );

  const { data: articlesData, isLoading } = useQuery(
    ["kb-articles", search, category],
    () => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      return api.get(`/kb/articles?${params.toString()}`).then((r) => r.data);
    },
    { keepPreviousData: true }
  );

  const articles = articlesData?.data || [];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (category) params.set("category", category);
    setSearchParams(params);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zictia-navy">Knowledge Base</h1>
        <p className="text-gray-600">Find answers to common questions and learn about our services.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search articles..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setSearchParams({}); setQuery(""); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${!category ? "bg-zictia-blue text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            All
          </button>
          {categories.map((c: any) => (
            <button
              key={c.name}
              onClick={() => {
                const params = new URLSearchParams();
                params.set("category", c.name);
                if (search) params.set("search", search);
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                category === c.name ? "bg-zictia-blue text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No articles found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {articles.map((article: any) => (
              <Link
                key={article.id}
                to={`/kb/${article.id}`}
                className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">{article.titleEn}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {article.category} &bull; {article.viewCount} views
                  </p>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {article.tags.map((tag: string) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <Tag className="w-3 h-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
