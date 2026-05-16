import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { Wifi, Server, Shield, Cloud, ArrowRight, Building2, Globe } from "lucide-react";

const highlights = [
  { icon: Wifi, title: "Internet Capacity", desc: "Wholesale and government internet with platinum SLAs." },
  { icon: Server, title: "Virtual Machines", desc: "Scalable compute with Ubuntu, Windows, and Rocky Linux." },
  { icon: Shield, title: "IP-MPLS & VPN", desc: "Secure private connectivity across all your sites." },
  { icon: Cloud, title: "Co-Location", desc: "Rack space with power, cooling, and remote hands." },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  return (
    <div>
      <section className="bg-gradient-to-br from-zictia-navy to-blue-900 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{t("app.name")}</h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8">{t("app.tagline")}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-5 py-3 bg-zictia-accent text-white rounded-lg font-medium hover:bg-sky-500 transition"
              >
                {t("nav.catalog")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition"
                >
                  {t("nav.register")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((h) => (
              <Link
                key={h.title}
                to="/catalog"
                className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
                  <h.icon className="w-5 h-5 text-zictia-blue" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{h.title}</h3>
                <p className="text-sm text-gray-600">{h.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-zictia-navy mb-4">Built for Zanzibar</h2>
            <p className="text-gray-600 mb-6">
              The ZICTIA Customer Portal is designed to serve government institutions, ISPs, SMEs, and individual subscribers across Zanzibar and Tanzania. Browse services, manage subscriptions, pay invoices, and get support — all in one place.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Building2 className="w-4 h-4 text-zictia-blue" />
                Government-ready
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Globe className="w-4 h-4 text-zictia-blue" />
                English &amp; Kiswahili
              </div>
            </div>
          </div>
          <div className="bg-zictia-light rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold mb-3">Customer Segments</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><span className="font-medium">Government:</span> MDAs, ministries, and agencies</li>
              <li><span className="font-medium">ISPs:</span> TCRA-licensed wholesale capacity buyers</li>
              <li><span className="font-medium">Corporate &amp; SME:</span> VMs, co-location, IP-MPLS, VPN</li>
              <li><span className="font-medium">Individuals:</span> Personal VM and VPN subscriptions</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
