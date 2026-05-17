import { useState, useRef } from "react";
import { useQuery, useMutation } from "react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  FileText,
  Calendar,
  Wrench,
  Check,
} from "lucide-react";

const statusOptions = [
  { value: "", label: "All" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "QUOTE_REQUESTED", label: "Quote Requested" },
  { value: "QUOTE_SENT", label: "Quote Sent" },
  { value: "QUOTE_APPROVED", label: "Quote Approved" },
  { value: "CONTRACT_SIGNED", label: "Contract Signed" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "APPROVED", label: "Approved" },
  { value: "PROVISIONING", label: "Provisioning" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusIcon: Record<string, any> = {
  SUBMITTED: Clock,
  UNDER_REVIEW: Clock,
  QUOTE_REQUESTED: Clock,
  QUOTE_SENT: FileText,
  QUOTE_APPROVED: CheckCircle,
  CONTRACT_SIGNED: FileText,
  SCHEDULED: Calendar,
  APPROVED: Loader,
  PROVISIONING: Loader,
  ACTIVE: CheckCircle,
  COMPLETED: CheckCircle,
  REJECTED: XCircle,
  CANCELLED: XCircle,
};

const statusColor: Record<string, string> = {
  SUBMITTED: "text-amber-600 bg-amber-50",
  UNDER_REVIEW: "text-amber-600 bg-amber-50",
  QUOTE_REQUESTED: "text-amber-600 bg-amber-50",
  QUOTE_SENT: "text-blue-600 bg-blue-50",
  QUOTE_APPROVED: "text-blue-600 bg-blue-50",
  CONTRACT_SIGNED: "text-indigo-600 bg-indigo-50",
  SCHEDULED: "text-purple-600 bg-purple-50",
  APPROVED: "text-blue-600 bg-blue-50",
  PROVISIONING: "text-blue-600 bg-blue-50",
  ACTIVE: "text-green-600 bg-green-50",
  COMPLETED: "text-green-600 bg-green-50",
  REJECTED: "text-red-600 bg-red-50",
  CANCELLED: "text-red-600 bg-red-50",
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("");
  const [reason, setReason] = useState("");
  const [provisioningNotes, setProvisioningNotes] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"actions" | "files" | "schedule">("actions");
  const quoteFileRef = useRef<HTMLInputElement>(null);
  const contractFileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery(
    ["admin-orders", statusFilter],
    () => api.get(`/orders/admin/all?status=${statusFilter}&page=1&limit=50`).then((r) => r.data.data),
    { keepPreviousData: true }
  );

  const approveMutation = useMutation(
    (id: string) => api.post(`/orders/admin/${id}/approve`, { reason, provisioningNotes }),
    {
      onSuccess: () => {
        toast.success("Order approved and provisioning started");
        setActionOrderId(null);
        setReason("");
        setProvisioningNotes("");
        refetch();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || "Failed to approve");
      },
    }
  );

  const rejectMutation = useMutation(
    (id: string) => api.post(`/orders/admin/${id}/reject`, { reason }),
    {
      onSuccess: () => {
        toast.success("Order rejected");
        setActionOrderId(null);
        setReason("");
        setProvisioningNotes("");
        refetch();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || "Failed to reject");
      },
    }
  );

  const techReviewMutation = useMutation(
    (id: string) => api.post(`/orders/admin/${id}/tech-review`),
    {
      onSuccess: () => {
        toast.success("Technical review passed");
        refetch();
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed"); },
    }
  );

  const uploadQuoteMutation = useMutation(
    ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post(`/orders/admin/${id}/quote`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    {
      onSuccess: () => {
        toast.success("Quote uploaded");
        refetch();
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to upload"); },
    }
  );

  const uploadContractMutation = useMutation(
    ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post(`/orders/admin/${id}/contract`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    {
      onSuccess: () => {
        toast.success("Contract uploaded");
        refetch();
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to upload"); },
    }
  );

  const scheduleMutation = useMutation(
    ({ id, date }: { id: string; date: string }) =>
      api.post(`/orders/admin/${id}/schedule`, { installationDate: date }),
    {
      onSuccess: () => {
        toast.success("Installation scheduled");
        setInstallationDate("");
        refetch();
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed"); },
    }
  );

  const orders = data || [];

  const handleQuoteUpload = (orderId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadQuoteMutation.mutate({ id: orderId, file: files[0] });
  };

  const handleContractUpload = (orderId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadContractMutation.mutate({ id: orderId, file: files[0] });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zictia-navy">Order Queue</h1>
          <p className="text-gray-600">Review and manage customer orders.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6">
        {statusOptions.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              statusFilter === s.value
                ? "bg-zictia-blue text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order: any) => {
              const Icon = statusIcon[order.status] || Clock;
              const isActionOpen = actionOrderId === order.id;
              const canApprove = ["SUBMITTED", "UNDER_REVIEW", "CONTRACT_SIGNED", "SCHEDULED"].includes(order.status);
              const canReject = ["SUBMITTED", "UNDER_REVIEW", "QUOTE_REQUESTED"].includes(order.status);
              const needsTechReview = order.requiresTechnicalReview && !order.techReviewPassedAt;

              return (
                <div key={order.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColor[order.status] || "text-gray-600 bg-gray-50"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.service?.nameEn || "Unknown Service"}</p>
                        <p className="text-xs text-gray-500">
                          {order.account?.organisationName || order.account?.accountType} • Ref: {order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Submitted {new Date(order.createdAt).toLocaleDateString()} • {order.contractDuration}
                        </p>
                        {order.configuration && Object.keys(order.configuration).length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                            Config: {JSON.stringify(order.configuration)}
                          </p>
                        )}
                        {needsTechReview && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            <Wrench className="w-3 h-3" /> Technical Review Required
                          </span>
                        )}
                        {order.techReviewPassedAt && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            <Check className="w-3 h-3" /> Tech Review Passed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="font-semibold text-gray-900">
                        TZS {order.totalAmount ? Number(order.totalAmount).toLocaleString() : "—"}
                      </p>
                      {order.prorataAmount && (
                        <p className="text-xs text-amber-600">+TZS {Number(order.prorataAmount).toLocaleString()} prorata</p>
                      )}
                      {(canApprove || canReject || order.status === "QUOTE_REQUESTED" || order.status === "QUOTE_APPROVED" || order.status === "CONTRACT_SIGNED" || needsTechReview) && (
                        <div className="flex gap-2">
                          {isActionOpen ? (
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                              <div className="flex gap-2 text-xs">
                                <button
                                  onClick={() => setActiveTab("actions")}
                                  className={`px-2 py-1 rounded ${activeTab === "actions" ? "bg-gray-200" : "hover:bg-gray-100"}`}
                                >
                                  Actions
                                </button>
                                {(order.serviceType === "COLOCATION") && (
                                  <>
                                    <button
                                      onClick={() => setActiveTab("files")}
                                      className={`px-2 py-1 rounded ${activeTab === "files" ? "bg-gray-200" : "hover:bg-gray-100"}`}
                                    >
                                      Files
                                    </button>
                                    <button
                                      onClick={() => setActiveTab("schedule")}
                                      className={`px-2 py-1 rounded ${activeTab === "schedule" ? "bg-gray-200" : "hover:bg-gray-100"}`}
                                    >
                                      Schedule
                                    </button>
                                  </>
                                )}
                              </div>

                              {activeTab === "actions" && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Reason (optional)"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                                  />
                                  <textarea
                                    placeholder="Provisioning notes (optional)"
                                    value={provisioningNotes}
                                    onChange={(e) => setProvisioningNotes(e.target.value)}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded resize-none"
                                    rows={2}
                                  />
                                  <div className="flex items-center gap-2">
                                    {canApprove && (
                                      <button
                                        onClick={() => approveMutation.mutate(order.id)}
                                        disabled={approveMutation.isLoading}
                                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                      >
                                        {approveMutation.isLoading ? <Loader className="w-3 h-3 animate-spin" /> : "Approve"}
                                      </button>
                                    )}
                                    {canReject && (
                                      <button
                                        onClick={() => rejectMutation.mutate(order.id)}
                                        disabled={rejectMutation.isLoading}
                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                      >
                                        {rejectMutation.isLoading ? <Loader className="w-3 h-3 animate-spin" /> : "Reject"}
                                      </button>
                                    )}
                                    {needsTechReview && (
                                      <button
                                        onClick={() => techReviewMutation.mutate(order.id)}
                                        disabled={techReviewMutation.isLoading}
                                        className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                                      >
                                        {techReviewMutation.isLoading ? <Loader className="w-3 h-3 animate-spin" /> : "Pass Tech Review"}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => { setActionOrderId(null); setReason(""); setProvisioningNotes(""); }}
                                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}

                              {activeTab === "files" && order.serviceType === "COLOCATION" && (
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Upload Quote PDF</p>
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      ref={quoteFileRef}
                                      onChange={(e) => handleQuoteUpload(order.id, e.target.files)}
                                      className="text-xs"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Upload Contract PDF</p>
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      ref={contractFileRef}
                                      onChange={(e) => handleContractUpload(order.id, e.target.files)}
                                      className="text-xs"
                                    />
                                  </div>
                                  <button
                                    onClick={() => { setActionOrderId(null); }}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                  >
                                    Close
                                  </button>
                                </div>
                              )}

                              {activeTab === "schedule" && order.serviceType === "COLOCATION" && (
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-gray-700">Installation Date</label>
                                  <input
                                    type="datetime-local"
                                    value={installationDate}
                                    onChange={(e) => setInstallationDate(e.target.value)}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => scheduleMutation.mutate({ id: order.id, date: installationDate })}
                                      disabled={!installationDate || scheduleMutation.isLoading}
                                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                                    >
                                      {scheduleMutation.isLoading ? <Loader className="w-3 h-3 animate-spin" /> : "Schedule"}
                                    </button>
                                    <button
                                      onClick={() => { setActionOrderId(null); }}
                                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setActionOrderId(order.id); setActiveTab("actions"); }}
                              className="px-3 py-1.5 text-sm bg-zictia-blue text-white rounded hover:bg-blue-700"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      )}
                      {(order.status === "PROVISIONING" || order.status === "APPROVED") && (
                        <div className="mt-2">
                          <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                          </div>
                          <p className="text-[10px] text-blue-600 mt-0.5">Provisioning...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
