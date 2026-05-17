import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Loader, Settings } from "lucide-react";

const SETTINGS_KEYS = [
  { key: "invoice_due_days", label: "Invoice Due Days", type: "number", default: 30 },
  { key: "password_expiry_days", label: "Password Expiry Days", type: "number", default: 90 },
  { key: "max_login_attempts", label: "Max Login Attempts Before Lockout", type: "number", default: 5 },
  { key: "lockout_minutes", label: "Account Lockout Duration (minutes)", type: "number", default: 15 },
  { key: "portal_name_en", label: "Portal Name (EN)", type: "text", default: "ZICTIA Customer Portal" },
  { key: "portal_name_sw", label: "Portal Name (SW)", type: "text", default: "ZICTIA Customer Portal" },
  { key: "support_email", label: "Support Email", type: "text", default: "support@zictia.go.tz" },
  { key: "support_phone", label: "Support Phone", type: "text", default: "+255 24 2235784" },
  { key: "vat_rate", label: "VAT Rate (%)", type: "number", default: 18 },
];

const MAINTENANCE_KEYS = [
  { key: "maintenanceWindowStart", label: "Maintenance Window Start", type: "datetime-local", default: "" },
  { key: "maintenanceWindowEnd", label: "Maintenance Window End", type: "datetime-local", default: "" },
  { key: "maintenanceMessageEn", label: "Maintenance Message (EN)", type: "text", default: "Scheduled maintenance in progress." },
  { key: "maintenanceMessageSw", label: "Maintenance Message (SW)", type: "text", default: "Matengenezo yalioratibwa yanendelea." },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery("system-settings", () =>
    api.get("/admin/settings").then((r) => r.data.data)
  );

  const saveMutation = useMutation(
    () => api.put("/admin/settings", values),
    {
      onSuccess: () => {
        toast.success("Settings saved");
        queryClient.invalidateQueries("system-settings");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error?.message || "Failed to save settings"); },
    }
  );

  const current = data || {};

  const update = (key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (key: string, type: string) => {
    if (values[key] !== undefined) return values[key];
    const val = current[key];
    if (val === undefined || val === null) return "";
    if (type === "number") return String(val);
    return String(val);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-zictia-navy">System Configuration</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-zictia-blue" />
          <h2 className="font-semibold text-gray-900">Portal Settings</h2>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : (
          <div className="space-y-4">
            {SETTINGS_KEYS.map((s) => (
              <div key={s.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">{s.label}</label>
                <div className="md:col-span-2">
                  <input
                    type={s.type === "number" ? "number" : "text"}
                    value={getValue(s.key, s.type)}
                    onChange={(e) => update(s.key, s.type === "number" ? Number(e.target.value) : e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default: {s.default}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-gray-900">Scheduled Maintenance</h2>
          </div>
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {MAINTENANCE_KEYS.map((s) => (
                <div key={s.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">{s.label}</label>
                  <div className="md:col-span-2">
                    <input
                      type={s.type === "number" ? "number" : s.type}
                      value={getValue(s.key, s.type)}
                      onChange={(e) => update(s.key, s.type === "number" ? Number(e.target.value) : e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isLoading || isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isLoading && <Loader className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
