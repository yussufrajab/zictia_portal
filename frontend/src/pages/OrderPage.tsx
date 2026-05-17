import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation } from "react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Check,
  Server,
  Wifi,
  Shield,
  Cloud,
  Loader,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Smartphone,
  Building,
  CheckCircle,
} from "lucide-react";

const iconMap: Record<string, any> = {
  INTERNET_CAPACITY: Wifi,
  INTERNET_GOVERNMENT: Wifi,
  VIRTUAL_MACHINE: Server,
  COLOCATION: Cloud,
  IP_MPLS: Shield,
  VPN: Shield,
};

const osOptions = ["Ubuntu", "CentOS", "Windows"];
const networkOptions = ["Shared", "Dedicated"];

export default function OrderPage() {
  const { serviceId } = useParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    contractDuration: "monthly",
    autoRenew: false,
    paymentMethod: "M_PESA",
    termsAccepted: false,
    configuration: {} as Record<string, any>,
  });

  const { data: service, isLoading } = useQuery(["service", serviceId], () =>
    api.get(`/catalog/${serviceId}`).then((r) => r.data.data)
  );

  const createOrder = useMutation(
    (payload: any) => api.post("/orders", payload),
    {
      onSuccess: () => {
        toast.success("Order submitted successfully");
        setStep(5);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || "Failed to submit order");
      },
    }
  );

  const updateConfig = (key: string, value: any) => {
    setForm((p) => ({
      ...p,
      configuration: { ...p.configuration, [key]: value },
    }));
  };

  const handleSubmit = () => {
    if (!service) return;
    if (!form.termsAccepted) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    createOrder.mutate({
      serviceId,
      serviceType: service.serviceType,
      configuration: form.configuration,
      contractDuration: form.contractDuration,
      autoRenew: form.autoRenew,
    });
  };

  const computeTotal = () => {
    if (!service) return 0;
    let price = parseFloat(service.pricingMonthly || 0);
    if (form.contractDuration === "quarterly" && service.pricingQuarterly) {
      price = parseFloat(service.pricingQuarterly);
    } else if (form.contractDuration === "annual" && service.pricingAnnual) {
      price = parseFloat(service.pricingAnnual);
    }
    const setup = parseFloat(service.setupFee || 0);

    // VM-specific pricing
    if (service.serviceType === "VIRTUAL_MACHINE") {
      const cpu = parseInt(form.configuration.cpu || "1", 10);
      const ram = parseInt(form.configuration.ramGB || "2", 10);
      const disk = parseInt(form.configuration.diskGB || "50", 10);
      price += (cpu - 1) * 15000 + (ram - 2) * 8000 + (disk - 50) * 500;
      if (form.configuration.os === "Windows") price += 25000;
      if (form.configuration.networkType === "Dedicated") price += 50000;
    }

    return price + setup;
  };

  const computeProrata = () => {
    if (service?.serviceType !== "INTERNET_CAPACITY" && service?.serviceType !== "INTERNET_GOVERNMENT") return null;
    const newBw = parseInt(form.configuration.bandwidthMbps || "0", 10);
    if (!newBw || !service.pricingMonthly) return null;
    // Assume current is half of new for demo, or 10 Mbps base
    const currentBw = 10;
    const currentPrice = parseFloat(service.pricingMonthly);
    const newMonthly = (currentPrice / currentBw) * newBw;
    const diff = newMonthly - currentPrice;
    if (diff <= 0) return null;
    const today = new Date();
    const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRem = dim - today.getDate() + 1;
    return Math.round(diff * (daysRem / dim));
  };

  const total = computeTotal();
  const prorata = computeProrata();
  const vat = Math.round(total * 0.18);
  const grandTotal = total + vat + (prorata || 0);

  const maxSteps = service?.serviceType === "VIRTUAL_MACHINE" ? 5 : service?.serviceType === "VPN" ? 5 : 4;

  const nextStep = () => setStep((s) => Math.min(s + 1, maxSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

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

  const renderStepContent = () => {
    // Step 1: Configuration (service-specific)
    if (step === 1) {
      return (
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

          {/* VM Configuration */}
          {service.serviceType === "VIRTUAL_MACHINE" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">VM Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPU Cores</label>
                  <select
                    value={form.configuration.cpu || "2"}
                    onChange={(e) => updateConfig("cpu", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} vCPU{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RAM (GB)</label>
                  <select
                    value={form.configuration.ramGB || "4"}
                    onChange={(e) => updateConfig("ramGB", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[2, 4, 8, 16, 32, 64, 128].map((n) => (
                      <option key={n} value={n}>{n} GB</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disk (GB)</label>
                  <select
                    value={form.configuration.diskGB || "100"}
                    onChange={(e) => updateConfig("diskGB", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[50, 100, 250, 500, 1000, 2000].map((n) => (
                      <option key={n} value={n}>{n} GB SSD</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operating System</label>
                  <select
                    value={form.configuration.os || "Ubuntu"}
                    onChange={(e) => updateConfig("os", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {osOptions.map((os) => (
                      <option key={os} value={os}>{os}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Network Type</label>
                  <div className="flex gap-3">
                    {networkOptions.map((net) => (
                      <button
                        key={net}
                        onClick={() => updateConfig("networkType", net)}
                        className={`flex-1 p-3 rounded-lg border text-left transition ${
                          form.configuration.networkType === net
                            ? "border-zictia-blue bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-medium text-sm">{net}</p>
                        <p className="text-xs text-gray-500">
                          {net === "Dedicated" ? "Private VLAN (+TZS 50,000/mo)" : "Shared infrastructure"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VPN Technical Questionnaire */}
          {service.serviceType === "VPN" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Technical Assessment</h3>
              <p className="text-sm text-gray-600">Please provide details for each site to be connected.</p>
              {(form.configuration.sites || [{ address: "", subnet: "" }]).map((site: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Site {idx + 1}</span>
                    {idx > 0 && (
                      <button
                        onClick={() => {
                          const sites = [...(form.configuration.sites || [])];
                          sites.splice(idx, 1);
                          updateConfig("sites", sites);
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Site Address</label>
                      <input
                        value={site.address || ""}
                        onChange={(e) => {
                          const sites = [...(form.configuration.sites || [])];
                          sites[idx] = { ...site, address: e.target.value };
                          updateConfig("sites", sites);
                        }}
                        placeholder="Building address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Subnet (CIDR)</label>
                      <input
                        value={site.subnet || ""}
                        onChange={(e) => {
                          const sites = [...(form.configuration.sites || [])];
                          sites[idx] = { ...site, subnet: e.target.value };
                          updateConfig("sites", sites);
                        }}
                        placeholder="192.168.1.0/24"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ASN (optional)</label>
                      <input
                        value={site.asn || ""}
                        onChange={(e) => {
                          const sites = [...(form.configuration.sites || [])];
                          sites[idx] = { ...site, asn: e.target.value };
                          updateConfig("sites", sites);
                        }}
                        placeholder="65001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const sites = [...(form.configuration.sites || [])];
                  sites.push({ address: "", subnet: "" });
                  updateConfig("sites", sites);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                + Add Site
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="encryption"
                  checked={form.configuration.encryptionRequired !== false}
                  onChange={(e) => updateConfig("encryptionRequired", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="encryption" className="text-sm text-gray-700">
                  Encryption required (IPsec)
                </label>
              </div>
            </div>
          )}

          {/* Bandwidth Upgrade */}
          {(service.serviceType === "INTERNET_CAPACITY" || service.serviceType === "INTERNET_GOVERNMENT") && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Bandwidth Selection</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Bandwidth (Mbps)</label>
                <select
                  value={form.configuration.bandwidthMbps || "10"}
                  onChange={(e) => updateConfig("bandwidthMbps", parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {[10, 20, 50, 100, 200, 500, 1000].map((n) => (
                    <option key={n} value={n}>{n} Mbps</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Current: 10 Mbps</p>
              </div>
            </div>
          )}

          {/* Contract Duration */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Contract Duration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {["monthly", "quarterly", "annual"].map((dur) => {
                const price =
                  dur === "quarterly" && service.pricingQuarterly
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
        </div>
      );
    }

    // Step 2: Summary
    if (step === 2) {
      return (
        <div className="space-y-6">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Service</span>
              <span className="font-medium">{service.nameEn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contract</span>
              <span className="font-medium">{contractLabel(form.contractDuration)}</span>
            </div>
            {service.serviceType === "VIRTUAL_MACHINE" && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">CPU</span>
                  <span className="font-medium">{form.configuration.cpu || 2} vCPUs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RAM</span>
                  <span className="font-medium">{form.configuration.ramGB || 4} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Disk</span>
                  <span className="font-medium">{form.configuration.diskGB || 100} GB SSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">OS</span>
                  <span className="font-medium">{form.configuration.os || "Ubuntu"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network</span>
                  <span className="font-medium">{form.configuration.networkType || "Shared"}</span>
                </div>
              </>
            )}
            {(service.serviceType === "INTERNET_CAPACITY" || service.serviceType === "INTERNET_GOVERNMENT") && (
              <div className="flex justify-between">
                <span className="text-gray-600">Bandwidth</span>
                <span className="font-medium">{form.configuration.bandwidthMbps || 10} Mbps</span>
              </div>
            )}
            {service.serviceType === "VPN" && (
              <div className="flex justify-between">
                <span className="text-gray-600">Sites</span>
                <span className="font-medium">{(form.configuration.sites || []).length} sites</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Auto-renew</span>
              <span className="font-medium">{form.autoRenew ? "Yes" : "No"}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">TZS {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">VAT (18%)</span>
              <span className="font-medium">TZS {vat.toLocaleString()}</span>
            </div>
            {prorata !== null && (
              <div className="flex justify-between text-amber-700">
                <span className="font-medium">Prorata charge (remaining days)</span>
                <span className="font-medium">TZS {prorata.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-semibold">
              <span>Total Due</span>
              <span>TZS {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }

    // Step 3: Terms
    if (step === 3) {
      return (
        <div className="space-y-6">
          <h3 className="font-semibold text-gray-900">Terms & Conditions</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-3 max-h-64 overflow-y-auto">
            <p>By placing this order, you agree to the following terms:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Service fees are billed in advance according to the selected contract duration.</li>
              <li>Cancellations after approval may incur early termination fees.</li>
              <li>You are responsible for ensuring accurate technical details provided.</li>
              <li>ZICTIA SLA commitments apply as per the selected tier.</li>
              <li>Bandwidth upgrades are prorated for the remaining days in the current billing cycle.</li>
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={form.termsAccepted}
              onChange={(e) => setForm((p) => ({ ...p, termsAccepted: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I accept the Terms and Conditions
            </label>
          </div>
        </div>
      );
    }

    // Step 4: Payment Method
    if (step === 4) {
      return (
        <div className="space-y-6">
          <h3 className="font-semibold text-gray-900">Payment Method</h3>
          <p className="text-sm text-gray-600">Select your preferred payment method. You will be directed to complete payment after order submission.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "M_PESA", label: "M-Pesa", icon: Smartphone },
              { key: "TIGO_PESA", label: "Tigo Pesa", icon: Smartphone },
              { key: "AIRTEL_MONEY", label: "Airtel Money", icon: Smartphone },
              { key: "HALO_PESA", label: "HaloPesa", icon: Smartphone },
              { key: "CARD", label: "Credit/Debit Card", icon: CreditCard },
              { key: "BANK_TRANSFER", label: "Bank Transfer", icon: Building },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setForm((p) => ({ ...p, paymentMethod: key }))}
                className={`flex items-center gap-3 p-4 rounded-lg border transition ${
                  form.paymentMethod === key
                    ? "border-zictia-blue bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Amount to Pay</span>
              <span>TZS {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
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
            <p className="text-sm text-gray-500">Step {Math.min(step, maxSteps)} of {maxSteps}</p>
          </div>
        </div>

        {/* Stepper */}
        {step <= maxSteps && (
          <div className="flex items-center gap-1 mb-8">
            {Array.from({ length: maxSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s < step
                      ? "bg-green-500 text-white"
                      : s === step
                      ? "bg-zictia-blue text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < maxSteps && (
                  <div className={`flex-1 h-1 mx-1 ${s < step ? "bg-green-500" : "bg-gray-100"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {step === 5 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Order Submitted</h2>
            <p className="text-gray-600 mb-6">
              Your order is under review. You will be notified once it is approved.
              {service.serviceType === "COLOCATION" && " Your quote request has been sent to our team."}
            </p>
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
            {renderStepContent()}

            <div className="flex justify-between mt-8">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-40 flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step < maxSteps - 1 ? (
                <button
                  onClick={nextStep}
                  className="px-5 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={createOrder.isLoading || !form.termsAccepted}
                  className="px-5 py-2.5 bg-zictia-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {createOrder.isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Submit Order <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
