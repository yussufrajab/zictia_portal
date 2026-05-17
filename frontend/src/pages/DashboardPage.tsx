import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { useQuery } from "react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Wifi,
  CreditCard,
  Ticket,
  Activity,
  ArrowRight,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Users,
} from "lucide-react";

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9CA3AF",
  ISSUED: "#3B82F6",
  SENT: "#60A5FA",
  PARTIALLY_PAID: "#F59E0B",
  PAID: "#10B981",
  OVERDUE: "#EF4444",
  WRITTEN_OFF: "#6B7280",
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: dash } = useQuery("customer-dashboard", () =>
    api.get("/admin/dashboard").then((r) => r.data.data)
  );

  const quickActions = [
    { label: t("dashboard.orderService"), icon: Package, to: "/catalog", color: "bg-blue-100 text-blue-700" },
    { label: t("dashboard.payInvoice"), icon: CreditCard, to: "/billing", color: "bg-green-100 text-green-700" },
    { label: t("dashboard.raiseTicket"), icon: Ticket, to: "/tickets", color: "bg-amber-100 text-amber-700" },
    { label: "View Orders", icon: Activity, to: "/orders", color: "bg-purple-100 text-purple-700" },
    { label: "Manage Team", icon: Users, to: "/sub-users", color: "bg-indigo-100 text-indigo-700" },
  ];

  const stats = [
    { label: t("dashboard.activeServices"), value: String(dash?.activeServices || 0), icon: Wifi, color: "text-blue-600" },
    { label: t("dashboard.outstandingBalance"), value: `TZS ${Number(dash?.outstandingBalance || 0).toLocaleString()}`, icon: CreditCard, color: "text-red-600" },
    { label: t("dashboard.activeTickets"), value: String(dash?.activeTickets || 0), icon: Ticket, color: "text-amber-600" },
    { label: t("dashboard.nextPayment"), value: "—", icon: AlertCircle, color: "text-gray-600" },
  ];

  const chartData = (dash?.invoiceStatusCounts || []).map((item: any) => ({
    name: item.status.replace(/_/g, " "),
    value: item.count,
    color: INVOICE_STATUS_COLORS[item.status] || "#9CA3AF",
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">{t("dashboard.title")}</h1>
        <p className="text-gray-600">
          {t("dashboard.welcome")}, {user?.fullName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">{t("dashboard.quickActions")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:shadow-sm transition"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.color}`}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 text-center">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Tickets</h2>
              <Link to="/tickets" className="text-sm text-zictia-blue hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {(!dash?.recentTickets || dash.recentTickets.length === 0) && (
                <p className="text-sm text-gray-500">No tickets yet.</p>
              )}
              {dash?.recentTickets?.map((t: any) => (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.subject}</p>
                    <p className="text-xs text-gray-500">{t.status} &bull; {new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.priority === "CRITICAL" ? "bg-red-100 text-red-700" :
                    t.priority === "HIGH" ? "bg-orange-100 text-orange-700" :
                    t.priority === "MEDIUM" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {t.priority}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
              <Link to="/billing" className="text-sm text-zictia-blue hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {(!dash?.recentInvoices || dash.recentInvoices.length === 0) && (
                <p className="text-sm text-gray-500">No invoices yet.</p>
              )}
              {dash?.recentInvoices?.map((inv: any) => (
                <Link
                  key={inv.id}
                  to="/billing"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{inv.status} &bull; Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span className="font-medium text-sm">TZS {Number(inv.total).toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Account Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">{user?.accountType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="font-medium">{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">MFA</span>
                <span className="font-medium">{user?.mfaEnabled ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Service Health</h2>
            {(!dash?.recentServices || dash.recentServices.length === 0) ? (
              <p className="text-sm text-gray-500">No active services yet.</p>
            ) : (
              <div className="space-y-3">
                {dash.recentServices.map((s: any) => {
                  const status = s.currentStatus || "Active";
                  const uptime = s.uptimePercent ? Number(s.uptimePercent) : 0;
                  const isHealthy = status === "Active" && uptime >= 99;
                  const StatusIcon = status === "Active" ? CheckCircle : status === "Provisioning" ? Clock : XCircle;
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className={`w-4 h-4 shrink-0 ${isHealthy ? "text-green-600" : "text-amber-600"}`} />
                        <span className="text-sm text-gray-700 truncate">{s.service?.nameEn || "Service"}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 shrink-0">{uptime.toFixed(1)}%</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Avg Uptime</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {dash?.recentServices?.length > 0
                      ? (dash.recentServices.reduce((sum: number, s: any) => sum + Number(s.uptimePercent || 0), 0) / dash.recentServices.length).toFixed(1) + "%"
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {dash?.creditLimit > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Credit Account</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Limit</span>
                  <span className="font-medium">TZS {Number(dash.creditLimit).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Utilised</span>
                  <span className="font-medium">TZS {Number(dash.creditUtilised).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      (dash.creditUtilised / dash.creditLimit) >= 0.9
                        ? "bg-red-500"
                        : (dash.creditUtilised / dash.creditLimit) >= 0.8
                        ? "bg-amber-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, (dash.creditUtilised / dash.creditLimit) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{Math.round((dash.creditUtilised / dash.creditLimit) * 100)}% used</span>
                  <span>Available: TZS {(dash.creditLimit - dash.creditUtilised).toLocaleString()}</span>
                </div>
                {(dash.creditUtilised / dash.creditLimit) >= 0.8 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {(dash.creditUtilised / dash.creditLimit) >= 0.9
                      ? "Credit utilisation critically high"
                      : "Credit utilisation approaching limit"}
                  </p>
                )}
              </div>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Invoice Overview</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend fontSize={12} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
