import { useState } from "react";
import { useQuery, useMutation } from "react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { CreditCard, FileText, ArrowRight, Loader, CheckCircle, AlertCircle, Clock } from "lucide-react";

const statusIcon: Record<string, any> = {
  DRAFT: Clock,
  ISSUED: FileText,
  SENT: FileText,
  PARTIALLY_PAID: Clock,
  PAID: CheckCircle,
  OVERDUE: AlertCircle,
  WRITTEN_OFF: AlertCircle,
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

export default function AdminBilling() {
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading, refetch } = useQuery("admin-invoices", () =>
    api.get("/billing/admin/invoices?page=1&limit=50").then((r) => r.data.data)
  );

  const generateMutation = useMutation(
    () => api.post("/billing/admin/invoices/generate", { accountId, notes }),
    {
      onSuccess: () => {
        toast.success("Invoice generated");
        setAccountId("");
        setNotes("");
        refetch();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || "Failed to generate invoice");
      },
    }
  );

  const invoices = data || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">Billing & Invoicing</h1>
        <p className="text-gray-600">Generate and manage customer invoices.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Generate Invoice</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Account ID"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={() => generateMutation.mutate()}
            disabled={!accountId || generateMutation.isLoading}
            className="px-5 py-2 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generateMutation.isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
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
                      <p className="font-medium text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">
                        {inv.account?.organisationName || inv.account?.accountType} • Ref: {inv.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due {new Date(inv.dueDate).toLocaleDateString()} • {inv.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">TZS {Number(inv.total).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">VAT: TZS {Number(inv.vatAmount).toLocaleString()}</p>
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
