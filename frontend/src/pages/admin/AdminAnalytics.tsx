import { useQuery } from "react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, ArrowLeft, ThumbsUp, ShieldCheck } from "lucide-react";
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
  const { data: csatTrends } = useQuery("admin-csat-trends", () =>
    api.get("/admin/analytics/csat-trends").then((r) => r.data.data)
  );
  const { data: slaCompliance } = useQuery("admin-sla-compliance", () =>
    api.get("/admin/analytics/sla-compliance").then((r) => r.data.data)
  );
  const { data: topCustomers } = useQuery("admin-top-customers", () =>
    api.get("/admin/analytics/top-customers").then((r) => r.data.data)
  );
  const { data: arAgeing } = useQuery("admin-ar-ageing", () =>
    api.get("/admin/analytics/ar-ageing").then((r) => r.data.data)
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

  const exportCsat = () => {
    if (!csatTrends) return;
    csvDownload("csat-trends.csv", [
      ["Month", "Avg Score", "Responses"],
      ...csatTrends.map((c: any) => [c.month, c.avgScore, c.responseCount]),
    ]);
  };

  const exportTopCustomers = () => {
    if (!topCustomers) return;
    csvDownload("top-customers.csv", [
      ["Rank", "Customer", "Type", "Invoices", "Revenue (TSh)"],
      ...topCustomers.map((c: any) => [c.rank, c.organisationName, c.accountType, c.invoiceCount, c.totalRevenue]),
    ]);
  };

  const exportArAgeing = () => {
    if (!arAgeing) return;
    csvDownload("ar-ageing.csv", [
      ["Bucket", "Invoices", "Amount (TSh)"],
      ...arAgeing.buckets.map((b: any) => [b.label, b.count, b.amount]),
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

      <div className="grid md:grid-cols-2 gap-6 mb-6">
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

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-zictia-blue" /> CSAT Trends (Last 6 Months)
            </h2>
            <button onClick={exportCsat} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          {csatTrends && csatTrends.length > 0 && csatTrends.some((c: any) => c.responseCount > 0) ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={csatTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 5]} tickFormatter={(v) => `${v}★`} />
                  <Tooltip formatter={(v: number, name: string) => {
                    if (name === "avgScore") return [`${v} / 5`, "Avg Rating"];
                    return [v, name];
                  }} />
                  <Line type="monotone" dataKey="avgScore" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No CSAT data yet.</div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-zictia-success" /> SLA Compliance (Last 30 Days)
            </h2>
          </div>
          {slaCompliance ? (
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[300px]">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Compliant", value: Math.max(0, Math.min(100, slaCompliance.complianceRate)) },
                        { name: "Breached", value: Math.max(0, 100 - slaCompliance.complianceRate) },
                      ]}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="70%"
                      outerRadius="100%"
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#188038" />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="-mt-8 text-center">
                <p className="text-4xl font-bold text-gray-900">{slaCompliance.complianceRate}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {slaCompliance.totalTickets > 0
                    ? `${slaCompliance.totalTickets - slaCompliance.breachedTickets} of ${slaCompliance.totalTickets} tickets met SLA`
                    : "No tickets in the last 30 days"}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Loading SLA data...</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">SLA Breakdown</h2>
          {slaCompliance ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{slaCompliance.totalTickets}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Breached</p>
                <p className="text-2xl font-bold text-zictia-danger">{slaCompliance.breachedTickets}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Compliant</p>
                <p className="text-2xl font-bold text-zictia-success">
                  {slaCompliance.totalTickets - slaCompliance.breachedTickets}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Period</p>
                <p className="text-2xl font-bold text-gray-900">{slaCompliance.periodDays} days</p>
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Loading SLA data...</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Top 10 Customers by Revenue (YTD)</h2>
          <button onClick={exportTopCustomers} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        {topCustomers && topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 w-16">Rank</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Invoices</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topCustomers.map((c: any) => (
                  <tr key={c.accountId}>
                    <td className="py-2 font-bold text-gray-900">{c.rank}</td>
                    <td className="py-2 font-medium text-gray-900">{c.organisationName}</td>
                    <td className="py-2 text-gray-600 capitalize">{c.accountType.toLowerCase()}</td>
                    <td className="py-2 text-gray-600 text-right">{c.invoiceCount}</td>
                    <td className="py-2 text-gray-900 text-right font-medium">
                      TSh {c.totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No revenue data yet.</div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">AR Ageing — Overdue Invoices</h2>
          <button onClick={exportArAgeing} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        {arAgeing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {arAgeing.buckets.map((b: any) => (
                <div key={b.label} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{b.label}</p>
                  <p className="text-xl font-bold text-gray-900">TSh {b.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{b.count} invoice{b.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arAgeing.buckets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `TSh ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`TSh ${v.toLocaleString()}`, "Amount"]} />
                  <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Total Overdue</p>
              <p className="text-2xl font-bold text-zictia-danger">TSh {arAgeing.totalOverdue.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Loading AR ageing data...</div>
        )}
      </div>
    </div>
  );
}
