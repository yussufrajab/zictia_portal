import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Search, CheckCircle, MessageSquare, ArrowRight, AlertCircle, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PENDING_CUSTOMER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

function computeSlaBreached(t: any) {
  const now = Date.now();
  const created = new Date(t.createdAt).getTime();
  if (t.slaResponseMinutes && !t.firstResponseAt && now > created + t.slaResponseMinutes * 60000) {
    return "RESPONSE";
  }
  if (t.slaResolveMinutes && !t.resolvedAt && now > created + t.slaResolveMinutes * 60000) {
    return "RESOLUTION";
  }
  return null;
}

export default function AdminTickets() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data } = useQuery(
    ["admin-tickets", statusFilter],
    () => api.get("/tickets/admin/all", { params: { status: statusFilter, page: 1, limit: 50 } }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const resolveMutation = useMutation(
    ({ id, note }: { id: string; note: string }) => api.post(`/tickets/admin/${id}/resolve`, { resolutionNote: note }),
    {
      onSuccess: () => {
        toast.success("Ticket resolved");
        queryClient.invalidateQueries("admin-tickets");
        setResolvingId(null);
        setResolutionNote("");
      },
      onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
    }
  );

  const tickets = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">Support Tickets</h1>
        <div className="flex gap-2">
          {["", "OPEN", "IN_PROGRESS", "PENDING_CUSTOMER", "RESOLVED", "CLOSED"].map((s) => (
            <button
              key={s || "ALL"}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${statusFilter === s ? "bg-zictia-blue text-white" : "bg-white border text-gray-700"}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {tickets.map((t: any) => (
            <div key={t.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {t.status === "OPEN" ? (
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                    ) : t.status === "RESOLVED" || t.status === "CLOSED" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.subject}</p>
                    <p className="text-xs text-gray-500">
                      {t.account?.organisationName || t.account?.accountType} &bull; {t.ticketType.replace(/_/g, " ")} &bull; {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {computeSlaBreached(t) && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> SLA {computeSlaBreached(t)}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] || "bg-gray-100"}`}>
                    {t.status}
                  </span>
                  {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                    <button
                      onClick={() => setResolvingId(resolvingId === t.id ? null : t.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="Resolve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {resolvingId === t.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Resolution note..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => resolveMutation.mutate({ id: t.id, note: resolutionNote })}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
          {tickets.length === 0 && <p className="p-6 text-center text-gray-500">No tickets found.</p>}
        </div>
      </div>
    </div>
  );
}
