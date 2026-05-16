import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Clock, MessageSquare, AlertCircle, CheckCircle, Star, ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";

function computeSlaStatus(t: any) {
  const now = Date.now();
  const created = new Date(t.createdAt).getTime();
  let responseBreached = false;
  let resolveBreached = false;
  let responseDueAt: Date | null = null;
  let resolveDueAt: Date | null = null;

  if (t.slaResponseMinutes) {
    responseDueAt = new Date(created + t.slaResponseMinutes * 60000);
    if (!t.firstResponseAt && now > responseDueAt.getTime()) {
      responseBreached = true;
    }
  }
  if (t.slaResolveMinutes) {
    resolveDueAt = new Date(created + t.slaResolveMinutes * 60000);
    if (!t.resolvedAt && now > resolveDueAt.getTime()) {
      resolveBreached = true;
    }
  }
  return { responseBreached, resolveBreached, responseDueAt, resolveDueAt };
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [csatScore, setCsatScore] = useState(0);
  const [csatResolved, setCsatResolved] = useState("");
  const [csatComment, setCsatComment] = useState("");

  const { data, isLoading } = useQuery(["ticket", id], () =>
    api.get(`/tickets/my/${id}`).then((r) => r.data.data)
  );

  const csatMutation = useMutation(
    () => api.post(`/tickets/my/${id}/csat`, { score: csatScore, resolved: csatResolved, comment: csatComment }),
    {
      onSuccess: () => {
        toast.success("Thank you for your feedback!");
        queryClient.invalidateQueries(["ticket", id]);
      },
      onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to submit feedback"),
    }
  );

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Ticket not found.</div>;

  const t = data;
  const sla = computeSlaStatus(t);
  const showCsat = (t.status === "RESOLVED" || t.status === "CLOSED") && !t.csatScore;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-zictia-blue hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to tickets
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-gray-900">{t.subject}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                t.priority === "CRITICAL" ? "bg-red-100 text-red-700" :
                t.priority === "HIGH" ? "bg-orange-100 text-orange-700" :
                t.priority === "MEDIUM" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {t.priority}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {t.ticketType.replace(/_/g, " ")} &bull; Created {new Date(t.createdAt).toLocaleString()}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
            t.status === "OPEN" ? "bg-blue-100 text-blue-700" :
            t.status === "RESOLVED" ? "bg-green-100 text-green-700" :
            t.status === "CLOSED" ? "bg-gray-100 text-gray-700" :
            "bg-amber-100 text-amber-700"
          }`}>
            {t.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
          <div className={`p-3 rounded-lg border ${sla.responseBreached ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${sla.responseBreached ? "text-red-600" : "text-gray-500"}`} />
              <span className="font-medium">SLA Response</span>
            </div>
            <p className={`mt-1 ${sla.responseBreached ? "text-red-700" : "text-gray-600"}`}>
              {sla.responseBreached ? "BREACHED — " : ""}
              {t.slaResponseMinutes ? `${Math.floor(t.slaResponseMinutes / 60)}h ${t.slaResponseMinutes % 60}m` : "N/A"}
            </p>
            {sla.responseDueAt && (
              <p className="text-xs text-gray-500">Due: {sla.responseDueAt.toLocaleString()}</p>
            )}
            {t.firstResponseAt && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> First response: {new Date(t.firstResponseAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg border ${sla.resolveBreached ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 ${sla.resolveBreached ? "text-red-600" : "text-gray-500"}`} />
              <span className="font-medium">SLA Resolution</span>
            </div>
            <p className={`mt-1 ${sla.resolveBreached ? "text-red-700" : "text-gray-600"}`}>
              {sla.resolveBreached ? "BREACHED — " : ""}
              {t.slaResolveMinutes ? `${Math.floor(t.slaResolveMinutes / 60)}h ${t.slaResolveMinutes % 60}m` : "N/A"}
            </p>
            {sla.resolveDueAt && (
              <p className="text-xs text-gray-500">Due: {sla.resolveDueAt.toLocaleString()}</p>
            )}
            {t.resolvedAt && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Resolved: {new Date(t.resolvedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="prose max-w-none text-gray-800">
          <p>{t.description}</p>
        </div>
      </div>

      {showCsat && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp className="w-5 h-5 text-zictia-blue" />
            <h2 className="font-semibold text-gray-900">How did we do?</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">Your ticket has been resolved. Please take a moment to rate our support.</p>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Rate your experience (1–5)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCsatScore(s)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition ${
                    csatScore >= s ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Star className={`w-5 h-5 ${csatScore >= s ? "fill-amber-500 text-amber-500" : ""}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Was your issue resolved?</p>
            <div className="flex gap-2">
              {["Yes", "Partially", "No"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCsatResolved(opt)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    csatResolved === opt ? "bg-zictia-blue text-white border-zictia-blue" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional comments (optional)</label>
            <textarea
              rows={3}
              maxLength={500}
              value={csatComment}
              onChange={(e) => setCsatComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            onClick={() => csatMutation.mutate()}
            disabled={!csatScore || !csatResolved || csatMutation.isLoading}
            className="px-4 py-2 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {csatMutation.isLoading ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      )}

      {t.csatScore && (
        <div className="bg-green-50 rounded-xl border border-green-100 p-6 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-green-800">Feedback received</h2>
          </div>
          <p className="text-sm text-green-700">
            Rating: {t.csatScore}/5 &bull; Issue resolved: {t.csatResolved}
            {t.csatComment && <span className="block mt-1 italic">"{t.csatComment}"</span>}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Conversation</h2>
        <div className="space-y-4">
          {(!t.comments || t.comments.length === 0) && (
            <p className="text-sm text-gray-500">No replies yet. Our team will respond within the SLA window.</p>
          )}
          {t.comments?.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{c.user?.fullName || "Agent"}</span>
                  <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-gray-700">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
