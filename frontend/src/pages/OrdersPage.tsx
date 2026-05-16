import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useQuery } from "react-query";
import { Package, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";

const statusIcon: Record<string, any> = {
  SUBMITTED: Clock,
  UNDER_REVIEW: Clock,
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
  APPROVED: "text-blue-600 bg-blue-50",
  PROVISIONING: "text-blue-600 bg-blue-50",
  ACTIVE: "text-green-600 bg-green-50",
  COMPLETED: "text-green-600 bg-green-50",
  REJECTED: "text-red-600 bg-red-50",
  CANCELLED: "text-red-600 bg-red-50",
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery("my-orders", () =>
    api.get("/orders/my?page=1&limit=50").then((r) => r.data.data)
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
              return (
                <div key={order.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColor[order.status] || "text-gray-600 bg-gray-50"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{order.service?.nameEn || "Unknown Service"}</p>
                      <p className="text-xs text-gray-500">
                        {order.status} • {order.contractDuration} • Ref: {order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      {(order.status === "PROVISIONING" || order.status === "APPROVED") && (
                        <div className="mt-2">
                          <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                          </div>
                          <p className="text-[10px] text-blue-600 mt-0.5">Provisioning in progress...</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      TZS {order.totalAmount ? Number(order.totalAmount).toLocaleString() : "—"}
                    </p>
                    {(order.status === "SUBMITTED" || order.status === "UNDER_REVIEW") && (
                      <button
                        onClick={() => {
                          if (confirm("Cancel this order?")) {
                            api.post(`/orders/${order.id}/cancel`).then(() => {
                              window.location.reload();
                            });
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
