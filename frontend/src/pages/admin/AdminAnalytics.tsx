import { useQuery } from "react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const COLORS = ["#2563eb", "#06b6d4", "#f59e0b", "#ef4444"];

function csvDownload(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics() {
  const { data: revenue } = useQuery("admin-revenue-trend", () =>
    api.get("/admin/analytics/revenue-trend").then((r) => r.data.data)
  );
  const { data: ticketMetrics } = useQuery("admin-ticket-resolution", () =>
    api.get("/admin/analytics/ticket-resolution").then((r) => r.data.data)
  );
  const { data: uptime } = useQuery("admin-service-uptime", () =>
    api.get("/admin/analytics/service-uptime").then((r) => r.data.data)
  );

  const exportRevenue = () => {
    if (!revenue) return;
    csvDownload("revenue-trend.csv", [["Month", "Total"], ...revenue.map((r: any) => [r.month, r.total])]);
  };

  const exportTickets = () => {
    if (!ticketMetrics) return;
    csvDownload("ticket-resolution.csv", [
      ["Priority", "Count", "Avg Resolution Minutes"],
      ...ticketMetrics.map((t: any) => [t.priority, t.count, t.avgMinutes]),
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-zictia-navy">Analytics</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Revenue Trend (Last 6 Months)</h2>
            <button onClick={exportRevenue} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          {revenue && revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `TSh ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `TSh ${v.toLocaleString()}`} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">No revenue data yet.</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ticket Resolution by Priority</h2>
            <button onClick={exportTickets} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          {ticketMetrics && ticketMetrics.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={ticketMetrics} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={80}>
                    {ticketMetrics.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2">Priority</th>
                    <th className="pb-2">Resolved</th>
                    <th className="pb-2">Avg Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ticketMetrics.map((t: any) => (
                    <tr key={t.priority}>
                      <td className="py-2 font-medium text-gray-900 capitalize">{t.priority.toLowerCase()}</td>
                      <td className="py-2 text-gray-600">{t.count}</td>
                      <td className="py-2 text-gray-600">
                        {t.avgMinutes > 0 ? `${Math.floor(t.avgMinutes / 60)}h ${t.avgMinutes % 60}m` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">No resolved tickets yet.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Service Uptime Summary</h2>
        {uptime ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Active Services</p>
              <p className="text-2xl font-bold text-gray-900">{uptime.totalServices}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Average Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{uptime.avgUptime}%</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No uptime data available.</p>
        )}
      </div>
    </div>
  );
}
