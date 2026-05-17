import { Outlet, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { Globe, Menu, X, Bell, AlertTriangle, X as XIcon } from "lucide-react";
import { useState } from "react";
import { useQuery } from "react-query";
import { api } from "@/lib/api";
import NotificationPanel from "./NotificationPanel";

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const location = useLocation();

  const { data: unreadData } = useQuery(
    "notification-unread-count",
    () => api.get("/notifications/unread-count").then((r) => r.data.data.count as number),
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );
  const unreadCount = unreadData || 0;

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { data: bannerData } = useQuery(
    "maintenance-banner",
    () => api.get("/orders/maintenance-banner").then((r) => r.data.data),
    { refetchInterval: 300000 } // 5 minutes
  );

  const isAdmin = user?.role?.startsWith("STAFF_") || user?.role === "ADMIN";

  const toggleLang = () => {
    const next = i18n.language === "en" ? "sw" : "en";
    i18n.changeLanguage(next);
  };

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive(to)
          ? "bg-zictia-blue text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
      onClick={() => setMobileOpen(false)}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full bg-white">
        <img
          src="/zictia_top_bar.png"
          alt="ZICTIA Banner"
          className="w-full h-auto max-h-[70px] sm:max-h-[85px] object-contain object-center"
        />
      </div>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="hidden md:block">
              <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Customer Portal</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navLink("/", t("nav.home"))}
              {navLink("/catalog", t("nav.catalog"))}
              {navLink("/kb", t("nav.kb"))}
              {isAuthenticated && navLink("/dashboard", t("nav.dashboard"))}
              {isAuthenticated && navLink("/orders", t("nav.orders"))}
              {isAuthenticated && navLink("/billing", t("nav.billing"))}
              {isAuthenticated && navLink("/tickets", t("nav.tickets"))}
              {isAdmin && navLink("/admin", t("nav.admin"))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                title="Toggle language"
              >
                <Globe className="w-5 h-5" />
                <span className="sr-only">{t("common.language")}</span>
              </button>

              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setPanelOpen((v) => !v)}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
                </div>
              )}

              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm text-gray-700">{user?.fullName}</span>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link to="/login" className="px-3 py-1.5 text-sm text-zictia-blue hover:bg-blue-50 rounded-md">
                    {t("nav.login")}
                  </Link>
                  <Link to="/register" className="px-3 py-1.5 text-sm bg-zictia-blue text-white rounded-md hover:bg-blue-700">
                    {t("nav.register")}
                  </Link>
                </div>
              )}

              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
            {navLink("/", t("nav.home"))}
            {navLink("/catalog", t("nav.catalog"))}
            {navLink("/kb", t("nav.kb"))}
            {isAuthenticated && navLink("/dashboard", t("nav.dashboard"))}
            {isAuthenticated && navLink("/orders", t("nav.orders"))}
            {isAuthenticated && navLink("/billing", t("nav.billing"))}
            {isAuthenticated && navLink("/tickets", t("nav.tickets"))}
            {isAdmin && navLink("/admin", t("nav.admin"))}
            {!isAuthenticated && (
              <>
                {navLink("/login", t("nav.login"))}
                {navLink("/register", t("nav.register"))}
              </>
            )}
            {isAuthenticated && (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                {t("nav.logout")}
              </button>
            )}
          </div>
        )}
      </header>

      {bannerData && !bannerDismissed && (
        <div className={`px-4 py-2 ${bannerData.isUpcoming ? "bg-blue-50 border-b border-blue-200" : "bg-amber-50 border-b border-amber-200"}`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className={`w-4 h-4 ${bannerData.isUpcoming ? "text-blue-600" : "text-amber-600"}`} />
              <span className={bannerData.isUpcoming ? "text-blue-800" : "text-amber-800"}>
                {bannerData.isUpcoming
                  ? `Scheduled maintenance in ${bannerData.hoursUntil}h — ${bannerData.messageEn}`
                  : `Scheduled maintenance: ${bannerData.messageEn} (${new Date(bannerData.start).toLocaleString()} – ${new Date(bannerData.end).toLocaleString()})`
                }
              </span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className={`p-1 rounded hover:bg-opacity-20 ${bannerData.isUpcoming ? "hover:bg-blue-200 text-blue-600" : "hover:bg-amber-200 text-amber-600"}`}
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-zictia-navy text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-2">{t("app.name")}</h3>
            <p className="text-sm text-gray-300">
              Zanzibar Communication Corporation (ZICTIA) — powering Zanzibar's digital future.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Contact</h4>
            <p className="text-sm text-gray-300">info@zictia.go.tz</p>
            <p className="text-sm text-gray-300">+255 24 2235784</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Links</h4>
            <div className="flex flex-col gap-1 text-sm text-gray-300">
              <Link to="/catalog" className="hover:text-white">{t("nav.catalog")}</Link>
              <Link to="/login" className="hover:text-white">{t("nav.login")}</Link>
              <a href="https://zictia.go.tz" target="_blank" rel="noreferrer" className="hover:text-white">zictia.go.tz</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-6 pt-4 border-t border-gray-700 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} ZICTIA. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
