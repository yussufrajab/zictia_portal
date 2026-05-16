import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useQuery } from "react-query";
import { Search, Wifi, Server, Shield, Cloud, ArrowRight, Check, X, Scale } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

const categories = [
  { key: "", label: "All" },
  { key: "Internet", label: "Internet" },
  { key: "Cloud/VM", label: "Cloud/VM" },
  { key: "Co-location", label: "Co-location" },
  { key: "Networking", label: "Networking" },
  { key: "Security", label: "Security" },
];

const slaColor: Record<string, string> = {
  PLATINUM: "bg-purple-100 text-purple-700",
  GOLD: "bg-amber-100 text-amber-700",
  SILVER: "bg-gray-100 text-gray-700",
  STANDARD: "bg-blue-100 text-blue-700",
};

const iconMap: Record<string, any> = {
  INTERNET_CAPACITY: Wifi,
  INTERNET_GOVERNMENT: Wifi,
  VIRTUAL_MACHINE: Server,
  COLOCATION: Cloud,
  IP_MPLS: Shield,
  VPN: Shield,
};

export default function CatalogPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [compareList, setCompareList] = useState<any[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const { data, isLoading } = useQuery(
    ["catalog", category, search, sortBy],
    () => {
      const params: Record<string, any> = { page: 1, limit: 50 };
      if (category) params.category = category;
      if (search) params.search = search;
      if (sortBy) params.sortBy = sortBy;
      return api.get("/catalog", { params }).then((r) => r.data.data);
    },
    { keepPreviousData: true }
  );

  const services = data || [];

  const toggleCompare = (svc: any) => {
    setCompareList((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      if (exists) return prev.filter((s) => s.id !== svc.id);
      if (prev.length >= 4) return prev;
      return [...prev, svc];
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zictia-navy mb-1">{t("catalog.title")}</h1>
        <p className="text-gray-600">{t("catalog.subtitle")}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zictia-blue"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                category === c.key
                  ? "bg-zictia-blue text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">{t("common.loading")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc: any) => {
            const Icon = iconMap[svc.serviceType] || Wifi;
            const isCompared = compareList.some((s) => s.id === svc.id);
            return (
              <div
                key={svc.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-zictia-blue" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${slaColor[svc.slaTier] || "bg-gray-100"}`}>
                    {svc.slaTier}
                  </span>
                </div>

                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">{svc.nameEn}</h3>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{svc.descriptionEn}</p>

                <div className="space-y-2 mb-4">
                  {svc.featuresEn?.slice(0, 3).map((f: string) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-600" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500">{t("catalog.pricing")}</p>
                    <p className="font-bold text-zictia-navy">TZS {Number(svc.pricingMonthly).toLocaleString()}/mo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCompare(svc)}
                      className={`text-xs px-2 py-1 rounded border ${
                        isCompared
                          ? "bg-zictia-blue text-white border-zictia-blue"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {isCompared ? "Comparing" : "Compare"}
                    </button>
                    <Link
                      to={`/catalog/${svc.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-zictia-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      {t("catalog.orderNow")}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {compareList.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 z-50">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-zictia-blue" />
            <span className="text-sm font-medium text-gray-700">{compareList.length} selected</span>
          </div>
          <div className="flex items-center gap-2">
            {compareList.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleCompare(s)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 hover:bg-gray-200"
              >
                {s.nameEn}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompare(true)}
              disabled={compareList.length < 2}
              className="px-3 py-1.5 bg-zictia-blue text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Compare Now
            </button>
            <button
              onClick={() => setCompareList([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {showCompare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Compare Services</h2>
              <button onClick={() => setShowCompare(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-gray-500 font-medium w-40">Feature</th>
                    {compareList.map((s) => (
                      <th key={s.id} className="text-left py-3 px-3 min-w-[180px]">
                        <div className="font-semibold text-gray-900">{s.nameEn}</div>
                        <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${slaColor[s.slaTier] || "bg-gray-100"}`}>
                          {s.slaTier}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { label: "Category", key: "category" },
                    { label: "Monthly Price", key: "pricingMonthly", format: (v: number) => `TZS ${Number(v).toLocaleString()}` },
                    { label: "Setup Fee", key: "setupFee", format: (v: number) => `TZS ${Number(v).toLocaleString()}` },
                    { label: "SLA Tier", key: "slaTier" },
                    { label: "Contract Period", key: "contractPeriodMonths", format: (v: number) => `${v} months` },
                  ].map((row) => (
                    <tr key={row.key}>
                      <td className="py-3 px-3 text-gray-600 font-medium">{row.label}</td>
                      {compareList.map((s) => (
                        <td key={s.id} className="py-3 px-3 text-gray-900">
                          {row.format ? row.format(s[row.key]) : s[row.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 px-3 text-gray-600 font-medium align-top">Features</td>
                    {compareList.map((s) => (
                      <td key={s.id} className="py-3 px-3 text-gray-900 align-top">
                        <ul className="space-y-1">
                          {(s.featuresEn || []).slice(0, 5).map((f: string) => (
                            <li key={f} className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-green-600 shrink-0" />
                              <span className="text-xs">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3"></td>
                    {compareList.map((s) => (
                      <td key={s.id} className="py-3 px-3">
                        <Link
                          to={`/catalog/${s.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-zictia-blue text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Order Now <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
