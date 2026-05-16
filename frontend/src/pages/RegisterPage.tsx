import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Eye, EyeOff, User, Mail, Phone, Building, MapPin, Hash, Lock } from "lucide-react";

const accountTypes = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "SME", label: "SME" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "ISP", label: "ISP / Wholesale" },
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    accountType: "INDIVIDUAL",
    organisationName: "",
    physicalAddress: "",
    tin: "",
    termsAccepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        fullName: form.fullName,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        accountType: form.accountType,
        physicalAddress: form.physicalAddress,
        termsAccepted: true,
      };
      if (form.organisationName) payload.organisationName = form.organisationName;
      if (form.tin) payload.tin = form.tin;

      await api.post("/auth/register", payload);
      toast.success("Registration submitted. Pending approval.");
      setStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-zictia-navy mb-6 text-center">{t("auth.registerTitle")}</h1>

        {step === 3 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Application Submitted</h2>
            <p className="text-gray-600 mb-4">Your account is pending approval by ZICTIA staff. You will be notified via email once approved.</p>
            <Link to="/login" className="text-zictia-blue font-medium hover:underline">Go to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.accountType")}</label>
                  <select
                    value={form.accountType}
                    onChange={(e) => update("accountType", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {accountTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.fullName")}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.email")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.mobile")}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      required
                      value={form.mobile}
                      onChange={(e) => update("mobile", e.target.value)}
                      placeholder="+255xxxxxxxxx"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {(form.accountType === "SME" || form.accountType === "CORPORATE" || form.accountType === "GOVERNMENT" || form.accountType === "ISP") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.organisationName")}</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        required
                        value={form.organisationName}
                        onChange={(e) => update("organisationName", e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.physicalAddress")}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      required
                      value={form.physicalAddress}
                      onChange={(e) => update("physicalAddress", e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.tin")} (optional)</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      value={form.tin}
                      onChange={(e) => update("tin", e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.password")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t("auth.passwordHint")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    required
                    checked={form.termsAccepted}
                    onChange={(e) => update("termsAccepted", e.target.checked)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">{t("auth.terms")}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? t("common.loading") : t("auth.submitRegister")}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="text-zictia-blue font-medium hover:underline">{t("nav.login")}</Link>
        </p>
      </div>
    </div>
  );
}
