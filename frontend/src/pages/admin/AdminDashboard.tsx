import { useQuery } from "react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Users, Ticket, CreditCard, Activity, ArrowRight, Server, FileText, AlertTriangle, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboard() {
  const { data } = useQuery("admin-metrics", () => api.get("/admin/dashboard-metrics").then((r) => r.data.data));
  const { data: revenue } = useQuery("admin-revenue-trend", () =>
    api.get("/admin/analytics/revenue-trend").then((r) => r.data.data)
  );
  const { data: segments } = useQuery("admin-customer-segments", () =>
    api.get("/admin/analytics/customer-segments").then((r) => r.data.data)
  );

  const cards = [
    { label: "Total Customers", value: data?.totalCustomers ?? "—", icon: Users, to: "/admin/accounts" },
    { label: "Active Customers", value: data?.activeCustomers ?? "—", icon: Activity, to: "/admin/accounts" },
    { label: "Pending Approvals", value: data?.pendingApprovals ?? "—", icon: AlertTriangle, to: "/admin/accounts" },
    { label: "Total Services", value: data?.totalServices ?? "—", icon: Server, to: "/admin/services" },
    { label: "Total Tickets", value: data?.totalTickets ?? "—", icon: Ticket, to: "/admin/tickets" },
    { label: "Open Tickets", value: data?.openTickets ?? "—", icon: Ticket, to: "/admin/tickets" },
    { label: "Total Invoices", value: data?.totalInvoices ?? "—", icon: FileText, to: "/admin/billing" },
    { label: "Overdue Invoices", value: data?.overdueInvoices ?? "—", icon: AlertTriangle, to: "/admin/billing" },
    { label: "Pending Orders", value: data?.pendingOrders ?? "—", icon: CreditCard, to: "/admin/orders" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-zictia-navy mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{c.label}</span>
              <c.icon className="w-5 h-5 text-zictia-blue" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h2>
          {revenue && revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `TSh ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `TSh ${v.toLocaleString()}`} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No revenue data yet.</div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-5 h-5 text-zictia-blue" />
              <h2 className="font-semibold text-gray-900">Active Customers by Segment</h2>
            </div>
            {segments && segments.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segments}
                      dataKey="count"
                      nameKey="segment"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ segment, count }) => `${segment}: ${count}`}
                    >
                      {segments.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={["#2563eb", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No segment data yet.</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Quick Links</h2>
            </div>
          <div className="space-y-2">
            {[
              { label: "Manage Accounts", to: "/admin/accounts" },
              { label: "Manage Services", to: "/admin/services" },
              { label: "Manage Tickets", to: "/admin/tickets" },
              { label: "Manage Orders", to: "/admin/orders" },
              { label: "Manage Billing", to: "/admin/billing" },
              { label: "Manage KB Articles", to: "/admin/kb" },
              { label: "Analytics", to: "/admin/analytics" },
              { label: "System Settings", to: "/admin/settings" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
              >
                <span className="text-sm font-medium text-gray-700">{l.label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
