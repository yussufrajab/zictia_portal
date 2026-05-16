import { useParams, Link } from "react-router-dom";
import { useQuery } from "react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Shield, Clock, ChevronRight } from "lucide-react";

const slaDetails: Record<string, string> = {
  PLATINUM: "99.9% uptime (≤ 8.7 hrs/year)",
  GOLD: "99.5% uptime (≤ 43.8 hrs/year)",
  SILVER: "99.0% uptime (≤ 87.6 hrs/year)",
  STANDARD: "98.0% uptime (≤ 175.2 hrs/year)",
};

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading } = useQuery(["service", id], () =>
    api.get(`/catalog/${id}`).then((r) => r.data.data)
  );

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Service not found.</div>;

  const s = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/catalog" className="inline-flex items-center gap-1 text-sm text-zictia-blue hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" /> {t("catalog.title")}
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zictia-navy mb-2">{s.nameEn}</h1>
            <p className="text-gray-600">{s.descriptionEn}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-3xl font-bold text-zictia-navy">
              TZS {Number(s.pricingMonthly).toLocaleString()}
              <span className="text-base font-normal text-gray-500">/{t("catalog.pricing")?.toLowerCase()}</span>
            </div>
            {isAuthenticated ? (
              <Link
                to={`/order/${id}`}
                className="px-6 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700"
              >
                {t("catalog.orderNow")}
              </Link>
            ) : (
              <Link
                to="/register"
                className="px-6 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700"
              >
                {t("catalog.registerToOrder")}
              </Link>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-zictia-blue" />
              <span className="text-sm font-medium text-gray-700">SLA Tier</span>
            </div>
            <p className="text-sm font-semibold text-zictia-navy">{s.slaTier}</p>
            <p className="text-xs text-gray-600">{slaDetails[s.slaTier]}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{t("catalog.contract")}</span>
            </div>
            <p className="text-sm font-semibold text-zictia-navy">{s.minimumContractMonths} month(s)</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <ChevronRight className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{t("catalog.setupFee")}</span>
            </div>
            <p className="text-sm font-semibold text-zictia-navy">{s.setupFee > 0 ? `TZS ${Number(s.setupFee).toLocaleString()}` : "Free"}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Features</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {s.featuresEn?.map((f: string) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
