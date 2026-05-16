import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useMutation, useQuery } from "react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Smartphone,
  CreditCard,
  Landmark,
  Loader,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const methods = [
  { code: "M_PESA", name: "M-Pesa", category: "mobile_money", icon: Smartphone },
  { code: "TIGO_PESA", name: "Tigo Pesa", category: "mobile_money", icon: Smartphone },
  { code: "AIRTEL_MONEY", name: "Airtel Money", category: "mobile_money", icon: Smartphone },
  { code: "HALO_PESA", name: "HaloPesa", category: "mobile_money", icon: Smartphone },
  { code: "CARD", name: "Debit/Credit Card", category: "card", icon: CreditCard },
  { code: "BANK_TRANSFER", name: "Bank Transfer", category: "bank", icon: Landmark },
];

const categoryLabel: Record<string, string> = {
  mobile_money: "Mobile Money",
  card: "Card",
  bank: "Bank Transfer",
};

export default function PaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoiceId") || "";
  const amountParam = searchParams.get("amount") || "0";
  const amount = Number(amountParam);

  const [selectedMethod, setSelectedMethod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const { data: invoice } = useQuery(
    ["invoice-detail", invoiceId],
    () => api.get(`/billing/invoices/${invoiceId}`).then((r) => r.data.data),
    { enabled: !!invoiceId }
  );

  const payMutation = useMutation(
    () =>
      api.post("/payments/zanmalipo/initiate", {
        invoiceId: invoiceId || undefined,
        amount: Number(invoice?.total || amount),
        method: selectedMethod,
        phoneNumber: phoneNumber || undefined,
      }),
    {
      onSuccess: (res) => {
        if (res.data.data?.mock) {
          toast.success(res.data.data.message || "Payment initiated (mock mode)");
          setTimeout(() => navigate("/billing"), 2000);
        } else {
          toast.success("Payment initiated. Complete it on your device.");
        }
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || "Payment initiation failed");
      },
    }
  );

  const displayAmount = Number(invoice?.total || amount);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate("/billing")}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Billing
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">Make a Payment</h1>
        <p className="text-gray-600">Select your preferred payment method.</p>
      </div>

      {invoice && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Invoice Summary</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Invoice Number</span>
            <span className="font-medium">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Amount Due</span>
            <span className="font-semibold">TZS {Number(invoice.total).toLocaleString()}</span>
          </div>
        </div>
      )}

      {!invoiceId && amount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount to Pay</span>
            <span className="font-semibold">TZS {Number(amount).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(
          methods.reduce((acc, m) => {
            (acc[m.category] = acc[m.category] || []).push(m);
            return acc;
          }, {} as Record<string, typeof methods>)
        ).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              {categoryLabel[category]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.code;
                return (
                  <button
                    key={m.code}
                    onClick={() => setSelectedMethod(m.code)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
                      isSelected
                        ? "border-zictia-blue bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected ? "bg-zictia-blue text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedMethod && ["M_PESA", "TIGO_PESA", "AIRTEL_MONEY", "HALO_PESA"].includes(selectedMethod) && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            placeholder="+255..."
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      )}

      <button
        onClick={() => payMutation.mutate()}
        disabled={!selectedMethod || payMutation.isLoading}
        className="mt-6 w-full py-3 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {payMutation.isLoading ? (
          <Loader className="w-5 h-5 animate-spin" />
        ) : (
          <CheckCircle className="w-5 h-5" />
        )}
        Pay TZS {Number(displayAmount).toLocaleString()}
      </button>

      <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
        <AlertCircle className="w-4 h-4 mt-0.5" />
        <p>
          In development mode, payments are simulated and will auto-complete after a few seconds. No real money is transferred.
        </p>
      </div>
    </div>
  );
}
