import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding database...");

  // Create sample services
  const services = [
    {
      serviceType: "INTERNET_CAPACITY",
      nameEn: "Wholesale Internet Capacity",
      nameSw: "Uwezo wa Interneti wa Jumla",
      descriptionEn: "Dedicated internet capacity for ISPs and telecom operators with guaranteed throughput and SLA-backed uptime.",
      descriptionSw: "Uwezo wa interneti wa kitaalamu kwa ISPs na watoa huduma wa mawasiliano.",
      featuresEn: ["Dedicated bandwidth", "DDoS protection", "99.9% SLA uptime", "24/7 NOC support", "BGP peering available"],
      pricingMonthly: 500000,
      setupFee: 250000,
      minimumContractMonths: 12,
      slaTier: "PLATINUM",
      category: "Internet",
      customerTypes: ["ISP"],
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 1,
    },
    {
      serviceType: "INTERNET_GOVERNMENT",
      nameEn: "Government Internet",
      nameSw: "Interneti ya Serikali",
      descriptionEn: "Secure and reliable internet connectivity for government ministries, departments, and agencies.",
      descriptionSw: "Uunganisho salama na wa kuaminika wa interneti kwa wizara na idara za serikali.",
      featuresEn: ["Filtered content", "Government support desk", "99.5% SLA uptime", "Redundant paths", "Security monitoring"],
      pricingMonthly: 150000,
      setupFee: 100000,
      minimumContractMonths: 12,
      slaTier: "GOLD",
      category: "Internet",
      customerTypes: ["GOVERNMENT"],
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 2,
    },
    {
      serviceType: "VIRTUAL_MACHINE",
      nameEn: "Cloud Virtual Machine",
      nameSw: "Mashine ya Virtuali ya Wingu",
      descriptionEn: "Scalable virtual machines with SSD storage, public IPs, and a choice of operating systems.",
      descriptionSw: "Mashine za virtuali zinazoweza kuongezeka na hifadhi ya SSD na mifumo mbalimbali ya uendeshaji.",
      featuresEn: ["1-32 vCPU", "1-64 GB RAM", "SSD storage", "Public IP included", "Ubuntu, Windows, Rocky Linux"],
      pricingMonthly: 75000,
      setupFee: 0,
      minimumContractMonths: 1,
      slaTier: "GOLD",
      category: "Cloud/VM",
      customerTypes: ["INDIVIDUAL", "SME", "CORPORATE", "GOVERNMENT"],
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 3,
    },
    {
      serviceType: "COLOCATION",
      nameEn: "Data Center Co-location",
      nameSw: "Uwekaji wa Data Center",
      descriptionEn: "Rack space in ZICTIA's Mazizini data center with power, cooling, and remote hands support.",
      descriptionSw: "Nafasi ya rack katika data center ya ZICTIA Mazizini na umeme, baridi, na usaidizi wa mbali.",
      featuresEn: ["1U to full rack", "UPS & generator backup", "24/7 physical security", "Remote hands", "Cross-connect available"],
      pricingMonthly: 300000,
      setupFee: 500000,
      minimumContractMonths: 6,
      slaTier: "GOLD",
      category: "Co-location",
      customerTypes: ["SME", "CORPORATE", "GOVERNMENT", "ISP"],
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 4,
    },
    {
      serviceType: "IP_MPLS",
      nameEn: "IP-MPLS Private Network",
      nameSw: "Mtandao wa Kibinafsi wa IP-MPLS",
      descriptionEn: "Secure multi-site private networking with QoS, hub-and-spoke or mesh topology options.",
      descriptionSw: "Mtandao wa kibinafsi wa multisite na QoS na chaguo za hub-and-spoke au mesh.",
      featuresEn: ["Multi-site connectivity", "QoS for voice/video", "Hub-and-spoke or mesh", "Encrypted paths", "Managed CPE"],
      pricingMonthly: 400000,
      setupFee: 300000,
      minimumContractMonths: 12,
      slaTier: "PLATINUM",
      category: "Networking",
      customerTypes: ["CORPORATE", "GOVERNMENT"],
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 5,
    },
    {
      serviceType: "VPN",
      nameEn: "Enterprise VPN",
      nameSw: "VPN ya Biashara",
      descriptionEn: "Layer 2 and Layer 3 VPN services for secure remote access and site-to-site connectivity.",
      descriptionSw: "Huduma za VPN za Layer 2 na Layer 3 kwa ufikiaji wa mbali salama.",
      featuresEn: ["L2 & L3 options", "Client apps for all OS", "Split tunneling", "MFA support", "Concurrent user licensing"],
      pricingMonthly: 120000,
      setupFee: 50000,
      minimumContractMonths: 3,
      slaTier: "SILVER",
      category: "Security",
      customerTypes: ["INDIVIDUAL", "SME", "CORPORATE", "GOVERNMENT"],
      status: "PUBLISHED",
      publishedAt: new Date(),
      sortOrder: 6,
    },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.nameEn.replace(/\s+/g, "-").toLowerCase() },
      update: {},
      create: {
        id: svc.nameEn.replace(/\s+/g, "-").toLowerCase(),
        ...svc,
      },
    });
  }

  // Create system settings
  const settings = [
    { key: "session_timeout_minutes", value: 60, description: "User session timeout in minutes" },
    { key: "password_min_length", value: 10, description: "Minimum password length" },
    { key: "invoice_due_days", value: 30, description: "Days until invoice is due" },
    { key: "vat_rate", value: 0.18, description: "VAT rate as decimal" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value, description: s.description },
    });
  }

  console.log("Seed completed.");
}

seed()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
