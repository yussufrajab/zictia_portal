import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation } from "react-query";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Server, Wifi, Shield, Cloud, ArrowRight, Loader } from "lucide-react";

const iconMap: Record<string, any> = {
  INTERNET_CAPACITY: Wifi,
  INTERNET_GOVERNMENT: Wifi,
  VIRTUAL_MACHINE: Server,
  COLOCATION: Cloud,
  IP_MPLS: Shield,
  VPN: Shield,
};

export default function OrderPage() {
  const { serviceId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    contractDuration: "monthly",
    autoRenew: false,
    configuration: {} as Record<string, string>,
  });

  const { data: service, isLoading } = useQuery(["service", serviceId], () =>
    api.get(`/catalog/${serviceId}`).then((r) => r.data.data)
  );

  const createOrder = useMutation(
    (payload: any) => api.post("/orders", payload),
    {
      onSuccess: () => {
        toast.success("Order submitted successfully");
        setStep(4);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || "Failed to submit order");
      },
    }
  );

  const updateConfig = (key: string, value: string) => {
    setForm((p) => ({
      ...p,
      configuration: { ...p.configuration, [key]: value },
    }));
  };

  const handleSubmit = () => {
    if (!service) return;
    createOrder.mutate({
      serviceId,
      serviceType: service.serviceType,
      configuration: form.configuration,
      contractDuration: form.contractDuration,
      autoRenew: form.autoRenew,
    });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!service) return <div className="p-8">Service not found.</div>;

  const ServiceIcon = iconMap[service.serviceType] || Server;

  const contractLabel = (dur: string) => {
    switch (dur) {
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly (3 months)";
      case "annual": return "Annual (12 months)";
      default: return dur;
    }
  };

  const computeTotal = () => {
    let price = parseFloat(service.pricingMonthly || 0);
    if (form.contractDuration === "quarterly" && service.pricingQuarterly) {
      price = parseFloat(service.pricingQuarterly);
    } else if (form.contractDuration === "annual" && service.pricingAnnual) {
      price = parseFloat(service.pricingAnnual);
    }
    const setup = parseFloat(service.setupFee || 0);
    return price + setup;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={`/catalog/${serviceId}`} className="inline-flex items-center gap-1 text-sm text-zictia-blue hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to service
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <ServiceIcon className="w-5 h-5 text-zictia-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zictia-navy">Order {service.nameEn}</h1>
            <p className="text-sm text-gray-500">Step {step} of 3</p>
          </div>
        </div>

        {step === 4 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Order Submitted</h2>
            <p className="text-gray-600 mb-6">Your order is under review. You will be notified once it is approved.</p>
            <div className="flex justify-center gap-3">
              <Link to="/dashboard" className="px-5 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700">
                Go to Dashboard
              </Link>
              <Link to="/catalog" className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                Browse More Services
              </Link>
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Service Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service</span>
                      <span className="font-medium">{service.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category</span>
                      <span className="font-medium">{service.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SLA Tier</span>
                      <span className="font-medium">{service.slaTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Price</span>
                      <span className="font-medium">TZS {Number(service.pricingMonthly).toLocaleString()}</span>
                    </div>
                    {parseFloat(service.setupFee) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Setup Fee</span>
                        <span className="font-medium">TZS {Number(service.setupFee).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contract Duration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {["monthly", "quarterly", "annual"].map((dur) => {
                      const price = dur === "quarterly" && service.pricingQuarterly
                        ? Number(service.pricingQuarterly)
                        : dur === "annual" && service.pricingAnnual
                        ? Number(service.pricingAnnual)
                        : Number(service.pricingMonthly);
                      return (
                        <button
                          key={dur}
                          onClick={() => setForm((p) => ({ ...p, contractDuration: dur }))}
                          className={`p-4 rounded-lg border text-left transition ${
                            form.contractDuration === dur
                              ? "border-zictia-blue bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <p className="font-medium text-sm">{contractLabel(dur)}</p>
                          <p className="text-xs text-gray-500 mt-1">TZS {price.toLocaleString()}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoRenew"
                    checked={form.autoRenew}
                    onChange={(e) => setForm((p) => ({ ...p, autoRenew: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="autoRenew" className="text-sm text-gray-700">
                    Auto-renew at the end of the contract period
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service</span>
                      <span className="font-medium">{service.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contract</span>
                      <span className="font-medium">{contractLabel(form.contractDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Auto-renew</span>
                      <span className="font-medium">{form.autoRenew ? "Yes" : "No"}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-semibold">
                      <span>Total Due</span>
                      <span>TZS {computeTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  <p className="font-medium mb-1">Important</p>
                  <p>By submitting this order, you agree to ZICTIA's Terms and Conditions. Your order will be reviewed by our team before activation.</p>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={createOrder.isLoading}
                    className="px-5 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {createOrder.isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>Submit Order <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
