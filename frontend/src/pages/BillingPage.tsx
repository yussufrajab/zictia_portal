import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useQuery } from "react-query";
import {
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  Printer,
} from "lucide-react";

const statusIcon: Record<string, any> = {
  DRAFT: Clock,
  ISSUED: FileText,
  SENT: FileText,
  PARTIALLY_PAID: Clock,
  PAID: CheckCircle,
  OVERDUE: AlertCircle,
  WRITTEN_OFF: XCircle,
};

const statusColor: Record<string, string> = {
  DRAFT: "text-gray-600 bg-gray-50",
  ISSUED: "text-blue-600 bg-blue-50",
  SENT: "text-blue-600 bg-blue-50",
  PARTIALLY_PAID: "text-amber-600 bg-amber-50",
  PAID: "text-green-600 bg-green-50",
  OVERDUE: "text-red-600 bg-red-50",
  WRITTEN_OFF: "text-gray-500 bg-gray-100",
};

const statusOptions = [
  { value: "", label: "All" },
  { value: "ISSUED", label: "Issued" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PARTIALLY_PAID", label: "Partial" },
];

export default function BillingPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(
    ["my-invoices", statusFilter],
    () => api.get(`/billing/invoices?status=${statusFilter}&page=1&limit=50`).then((r) => r.data.data),
    { keepPreviousData: true }
  );

  const { data: stats } = useQuery("billing-stats", () =>
    api.get("/billing/stats").then((r) => r.data.data)
  );

  const { data: detailInvoice } = useQuery(
    ["invoice-detail", detailId],
    () => api.get(`/billing/invoices/${detailId}`).then((r) => r.data.data),
    { enabled: !!detailId }
  );

  const invoices = data || [];

  const handlePrintInvoice = () => {
    const printArea = document.getElementById("print-invoice");
    if (!printArea) return;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printArea.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">{t("billing.title")}</h1>
        <p className="text-gray-600">{t("billing.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Outstanding Balance</span>
            <CreditCard className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            TZS {stats?.outstandingBalance ? Number(stats.outstandingBalance).toLocaleString() : "0"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Overdue</span>
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            TZS {stats?.overdueBalance ? Number(stats.overdueBalance).toLocaleString() : "0"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Paid</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            TZS {stats?.totalPaid ? Number(stats.totalPaid).toLocaleString() : "0"}
          </p>
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
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No invoices found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {invoices.map((inv: any) => {
              const Icon = statusIcon[inv.status] || FileText;
              return (
                <div key={inv.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColor[inv.status] || "text-gray-600 bg-gray-50"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Invoice {inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">
                        {inv.status} • Period: {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due {new Date(inv.dueDate).toLocaleDateString()} • Ref: {inv.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-semibold text-gray-900">TZS {Number(inv.total).toLocaleString()}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDetailId(detailId === inv.id ? null : inv.id)}
                        className="text-xs text-zictia-blue hover:underline"
                      >
                        {detailId === inv.id ? "Hide" : "View"}
                      </button>
                      {(inv.status === "ISSUED" || inv.status === "SENT" || inv.status === "OVERDUE" || inv.status === "PARTIALLY_PAID") && (
                        <Link
                          to={`/payment?invoiceId=${inv.id}&amount=${inv.total}`}
                          className="text-xs px-2 py-1 bg-zictia-blue text-white rounded hover:bg-blue-700"
                        >
                          Pay
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailInvoice && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Invoice Details</h2>
            <button
              onClick={handlePrintInvoice}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" /> Download PDF
            </button>
          </div>
          <div id="print-invoice" className="hidden">
            <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 700, margin: "0 auto", padding: 40 }}>
              <div style={{ borderBottom: "2px solid #1e3a5f", paddingBottom: 16, marginBottom: 24 }}>
                <h1 style={{ color: "#1e3a5f", fontSize: 24, fontWeight: 700, margin: 0 }}>ZICTIA</h1>
                <p style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 0" }}>Zanzibar Communication Corporation</p>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Invoice {detailInvoice.invoiceNumber}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 14, marginBottom: 24 }}>
                <div>
                  <p><strong>Status:</strong> {detailInvoice.status}</p>
                  <p><strong>Period:</strong> {new Date(detailInvoice.periodStart).toLocaleDateString()} – {new Date(detailInvoice.periodEnd).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><strong>Due Date:</strong> {new Date(detailInvoice.dueDate).toLocaleDateString()}</p>
                  <p><strong>Total:</strong> TZS {Number(detailInvoice.total).toLocaleString()}</p>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 24 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "8px 0" }}>Description</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>Qty</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>Unit Price</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailInvoice.lineItems || []).map((item: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 0" }}>{item.description}</td>
                      <td style={{ textAlign: "right", padding: "8px 0" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right", padding: "8px 0" }}>TZS {Number(item.unitPrice).toLocaleString()}</td>
                      <td style={{ textAlign: "right", padding: "8px 0" }}>TZS {Number(item.unitPrice * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 14, gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                <p><strong>Subtotal:</strong> TZS {Number(detailInvoice.subtotal).toLocaleString()}</p>
                <p><strong>VAT (18%):</strong> TZS {Number(detailInvoice.vatAmount).toLocaleString()}</p>
                <p style={{ fontSize: 18, fontWeight: 700 }}>Total: TZS {Number(detailInvoice.total).toLocaleString()}</p>
              </div>
              <div style={{ marginTop: 40, borderTop: "1px solid #e5e7eb", paddingTop: 16, fontSize: 12, color: "#9ca3af" }}>
                <p>Thank you for choosing ZICTIA. Payment is due within 30 days.</p>
                <p>info@zictia.go.tz | +255 24 2235784 | https://zictia.go.tz</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Number</span>
              <span className="font-medium">{detailInvoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className="font-medium">{detailInvoice.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Period</span>
              <span className="font-medium">{new Date(detailInvoice.periodStart).toLocaleDateString()} – {new Date(detailInvoice.periodEnd).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date</span>
              <span className="font-medium">{new Date(detailInvoice.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="font-medium text-gray-900 mb-2">Line Items</p>
              <div className="space-y-2">
                {(detailInvoice.lineItems || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.description} x{item.quantity}</span>
                    <span className="font-medium">TZS {Number(item.unitPrice * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>TZS {Number(detailInvoice.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (18%)</span>
                <span>TZS {Number(detailInvoice.vatAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>TZS {Number(detailInvoice.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
