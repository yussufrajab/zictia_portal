import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Pencil, Eye, EyeOff, Search } from "lucide-react";

const serviceTypes = [
  "INTERNET_CAPACITY",
  "INTERNET_GOVERNMENT",
  "VIRTUAL_MACHINE",
  "COLOCATION",
  "IP_MPLS",
  "VPN",
];

const slaTiers = ["PLATINUM", "GOLD", "SILVER", "STANDARD"];

export default function AdminServices() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    serviceType: "VIRTUAL_MACHINE",
    nameEn: "",
    descriptionEn: "",
    featuresEn: "",
    pricingMonthly: "",
    setupFee: "",
    minimumContractMonths: 1,
    slaTier: "STANDARD",
    category: "Cloud/VM",
    customerTypes: [] as string[],
  });

  const { data } = useQuery("admin-services", () =>
    api.get("/catalog/admin/list", { params: { page: 1, limit: 100 } }).then((r) => r.data)
  );

  const createMutation = useMutation(
    (payload: any) => api.post("/catalog/", payload),
    {
      onSuccess: () => {
        toast.success("Service created");
        queryClient.invalidateQueries("admin-services");
        setShowForm(false);
        resetForm();
      },
      onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
    }
  );

  const publishMutation = useMutation(
    (id: string) => api.post(`/catalog/${id}/publish`),
    {
      onSuccess: () => {
        toast.success("Service published");
        queryClient.invalidateQueries("admin-services");
      },
    }
  );

  const resetForm = () => {
    setForm({
      serviceType: "VIRTUAL_MACHINE",
      nameEn: "",
      descriptionEn: "",
      featuresEn: "",
      pricingMonthly: "",
      setupFee: "",
      minimumContractMonths: 1,
      slaTier: "STANDARD",
      category: "Cloud/VM",
      customerTypes: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      pricingMonthly: parseFloat(form.pricingMonthly),
      setupFee: parseFloat(form.setupFee) || 0,
      featuresEn: form.featuresEn.split(",").map((f) => f.trim()).filter(Boolean),
    };
    createMutation.mutate(payload);
  };

  const services = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zictia-navy">Service Catalog Admin</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zictia-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                required
                value={form.nameEn}
                onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.serviceType}
                onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                rows={3}
                value={form.descriptionEn}
                onChange={(e) => setForm((p) => ({ ...p, descriptionEn: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (TZS)</label>
              <input
                type="number"
                required
                value={form.pricingMonthly}
                onChange={(e) => setForm((p) => ({ ...p, pricingMonthly: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SLA Tier</label>
              <select
                value={form.slaTier}
                onChange={(e) => setForm((p) => ({ ...p, slaTier: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {slaTiers.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
              <input
                value={form.featuresEn}
                onChange={(e) => setForm((p) => ({ ...p, featuresEn: e.target.value }))}
                placeholder="e.g. SSD Storage, DDoS Protection"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                required
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-zictia-blue text-white rounded-lg hover:bg-blue-700">Save</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {services.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.nameEn}</p>
                <p className="text-xs text-gray-500">{s.serviceType} &bull; {s.category} &bull; TZS {Number(s.pricingMonthly).toLocaleString()} &bull; {s.status}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.status === "DRAFT" && (
                  <button
                    onClick={() => publishMutation.mutate(s.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Publish"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {s.status === "PUBLISHED" && (
                  <button
                    onClick={() => api.post(`/catalog/${s.id}/deprecate`).then(() => { toast.success("Deprecated"); queryClient.invalidateQueries("admin-services"); })}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Deprecate"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                )}
                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {services.length === 0 && <p className="p-6 text-center text-gray-500">No services found.</p>}
        </div>
      </div>
    </div>
  );
}
