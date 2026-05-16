import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { Plus, Filter, Search, MessageSquare, Clock, AlertCircle, BookOpen, ArrowRight } from "lucide-react";

const priorities = [
  { value: "CRITICAL", label: "Critical", color: "bg-red-100 text-red-700" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "LOW", label: "Low", color: "bg-gray-100 text-gray-700" },
];

const types = [
  { value: "TECHNICAL_ISSUE", label: "Technical Issue" },
  { value: "BILLING_QUERY", label: "Billing Query" },
  { value: "SERVICE_REQUEST", label: "Service Request" },
  { value: "COMPLAINT", label: "Complaint" },
  { value: "GENERAL_ENQUIRY", label: "General Enquiry" },
];

const statuses = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING_CUSTOMER", label: "Pending Customer" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export default function TicketsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    ticketType: "TECHNICAL_ISSUE",
    subject: "",
    description: "",
    priority: "MEDIUM" as string,
    preferredContact: "email",
    subscriptionId: "",
  });

  const { data: myServices } = useQuery("my-services", () =>
    api.get("/services/my").then((r) => r.data.data || [])
  );

  const [suggestedArticles, setSuggestedArticles] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const text = `${form.subject} ${form.description}`.trim();
    if (text.length < 5) {
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(() => {
      api.get(`/kb/articles?search=${encodeURIComponent(text)}&page=1&limit=3`).then((r) => {
        const articles = r.data.data?.data || [];
        setSuggestedArticles(articles);
        setShowSuggestions(articles.length > 0);
      }).catch(() => setShowSuggestions(false));
    }, 600);
    return () => clearTimeout(timer);
  }, [form.subject, form.description]);

  const { data, isLoading } = useQuery(
    ["my-tickets", statusFilter, search],
    () =>
      api
        .get("/tickets/my", { params: { status: statusFilter, search, page: 1, limit: 20 } })
        .then((r) => r.data),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    (payload: any) => api.post("/tickets/", payload),
    {
      onSuccess: () => {
        toast.success("Ticket created successfully");
        queryClient.invalidateQueries("my-tickets");
        setShowForm(false);
        setForm({ ticketType: "TECHNICAL_ISSUE", subject: "", description: "", priority: "MEDIUM", preferredContact: "email", subscriptionId: "" });
      },
      onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to create ticket"),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const tickets = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">{t("tickets.title")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zictia-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("tickets.newTicket")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Support Ticket</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("tickets.ticketType")}</label>
              <select
                value={form.ticketType}
                onChange={(e) => setForm((p) => ({ ...p, ticketType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {types.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("tickets.priority")}</label>
              <div className="flex gap-2">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                      form.priority === p.value ? `${p.color} border-transparent` : "bg-white border-gray-300 text-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {myServices && myServices.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("tickets.affectedService")}</label>
              <select
                value={form.subscriptionId}
                onChange={(e) => setForm((p) => ({ ...p, subscriptionId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select a service (optional)</option>
                {myServices.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.service?.nameEn || "Service"}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("tickets.subject")}</label>
            <input
              required
              maxLength={150}
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("tickets.description")}</label>
            <textarea
              required
              rows={4}
              maxLength={5000}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {showSuggestions && suggestedArticles.length > 0 && (
            <div className="mb-4 bg-blue-50 rounded-lg border border-blue-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">Did these articles help?</p>
              </div>
              <div className="space-y-2">
                {suggestedArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/kb/${article.id}`}
                    target="_blank"
                    className="flex items-center justify-between p-2.5 bg-white rounded border border-blue-100 hover:border-blue-300 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{article.titleEn}</p>
                      <p className="text-xs text-gray-500">{article.category}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="px-4 py-2 bg-zictia-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? "Submitting..." : t("tickets.submit")}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                statusFilter === s.value
                  ? "bg-zictia-blue text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">{t("common.loading")}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {tickets.length === 0 && (
              <div className="p-8 text-center text-gray-500">No tickets found.</div>
            )}
            {tickets.map((t: any) => {
              const pri = priorities.find((p) => p.value === t.priority);
              return (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="flex items-start gap-4 p-4 hover:bg-gray-50 transition"
                >
                  <div className="mt-1">
                    {t.status === "OPEN" ? (
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                    ) : t.status === "RESOLVED" || t.status === "CLOSED" ? (
                      <MessageSquare className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pri?.color || "bg-gray-100"}`}>
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {t.ticketType.replace(/_/g, " ")} &bull; {t.status} &bull; {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
