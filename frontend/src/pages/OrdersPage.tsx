import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useQuery, useMutation } from "react-query";
import { Package, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle, Loader, FileText, Calendar } from "lucide-react";
import toast from "react-hot-toast";

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

const statusLabel: Record<string, string> = {
  QUOTE_REQUESTED: "Quote pending",
  QUOTE_SENT: "Quote ready for approval",
  QUOTE_APPROVED: "Quote approved — awaiting contract",
  CONTRACT_SIGNED: "Contract received — scheduling",
  SCHEDULED: "Installation scheduled",
};

export default function OrdersPage() {
  const { data, isLoading, refetch } = useQuery("my-orders", () =>
    api.get("/orders/my?page=1&limit=50").then((r) => r.data.data)
  );

  const approveQuoteMutation = useMutation(
    (id: string) => api.post(`/orders/${id}/approve-quote`),
    {
      onSuccess: () => {
        toast.success("Quote approved");
        refetch();
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed"); },
    }
  );

  const cancelMutation = useMutation(
    (id: string) => api.post(`/orders/${id}/cancel`),
    {
      onSuccess: () => {
        toast.success("Order cancelled");
        refetch();
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed"); },
    }
  );

  const orders = data || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">My Orders</h1>
        <p className="text-gray-600">Track your service orders and subscriptions.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No orders yet.</p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1 px-4 py-2 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Browse Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order: any) => {
              const Icon = statusIcon[order.status] || AlertCircle;
              const label = statusLabel[order.status] || order.status;
              return (
                <div key={order.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColor[order.status] || "text-gray-600 bg-gray-50"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{order.service?.nameEn || "Unknown Service"}</p>
                      <p className="text-xs text-gray-500">
                        {label} • {order.contractDuration} • Ref: {order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      {order.serviceType === "VIRTUAL_MACHINE" && order.configuration && (
                        <p className="text-xs text-gray-500 mt-1">
                          {order.configuration.cpu} vCPU • {order.configuration.ramGB} GB RAM • {order.configuration.os}
                        </p>
                      )}
                      {order.serviceType === "VPN" && order.configuration?.sites && (
                        <p className="text-xs text-gray-500 mt-1">
                          {order.configuration.sites.length} sites
                        </p>
                      )}
                      {(order.status === "PROVISIONING" || order.status === "APPROVED") && (
                        <div className="mt-2">
                          <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                          </div>
                          <p className="text-[10px] text-blue-600 mt-0.5">Provisioning in progress...</p>
                        </div>
                      )}
                      {order.status === "SCHEDULED" && order.installationDate && (
                        <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Installation: {new Date(order.installationDate).toLocaleDateString()}
                        </p>
                      )}
                      {order.quoteDocumentUrl && (
                        <a
                          href={order.quoteDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Download Quote
                        </a>
                      )}
                      {order.contractDocumentUrl && (
                        <a
                          href={order.contractDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Download Contract
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">
                      TZS {order.totalAmount ? Number(order.totalAmount).toLocaleString() : "—"}
                    </p>
                    {order.prorataAmount && (
                      <p className="text-xs text-amber-600">+TZS {Number(order.prorataAmount).toLocaleString()} prorata</p>
                    )}
                    {order.status === "QUOTE_SENT" && (
                      <button
                        onClick={() => approveQuoteMutation.mutate(order.id)}
                        disabled={approveQuoteMutation.isLoading}
                        className="mt-2 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve Quote
                      </button>
                    )}
                    {["SUBMITTED", "UNDER_REVIEW", "QUOTE_REQUESTED"].includes(order.status) && (
                      <button
                        onClick={() => {
                          if (confirm("Cancel this order?")) {
                            cancelMutation.mutate(order.id);
                          }
                        }}
                        className="text-xs text-red-600 hover:underline mt-1"
                      >
                        Cancel
                      </button>
                    )}
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
