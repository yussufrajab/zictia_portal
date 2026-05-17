import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function seed() {
  console.log("Seeding database...");

  // ─── Sample Services ───
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
        ...(svc as any),
      },
    });
  }

  // ─── System Settings ───
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

  // ─── Seed Users with Zanzibari / Swahili Names ───
  const defaultPassword = await hash("Zanzibar2025!");

  // 1. GOVERNMENT account — ACCOUNT_ADMIN (Mzee wa Serikali)
  const govAccount = await prisma.customerAccount.upsert({
    where: { id: "acc-gov-zanzibar" },
    update: {},
    create: {
      id: "acc-gov-zanzibar",
      accountType: "GOVERNMENT",
      status: "ACTIVE",
      organisationName: "Wizara ya Teknolojia ya Habari na Mawasiliano Zanzibar",
      physicalAddress: "Maktaba Kuu, Malindi, Zanzibar",
      ministry: "Wizara ya TEHAMA",
      governmentRegNo: "GOV/ZNZ/2012/0042",
      tin: "1122334455",
    },
  });

  await prisma.user.upsert({
    where: { email: "juma.mwinyi@zanzibar.go.tz" },
    update: {},
    create: {
      accountId: govAccount.id,
      email: "juma.mwinyi@zanzibar.go.tz",
      passwordHash: defaultPassword,
      fullName: "Juma Mwinyi Hamad",
      mobile: "+255773112233",
      role: "ACCOUNT_ADMIN",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "asha.suleiman@zanzibar.go.tz" },
    update: {},
    create: {
      accountId: govAccount.id,
      email: "asha.suleiman@zanzibar.go.tz",
      passwordHash: defaultPassword,
      fullName: "Asha Suleiman Makame",
      mobile: "+255774223344",
      role: "TECHNICAL_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "haji.ally@zanzibar.go.tz" },
    update: {},
    create: {
      accountId: govAccount.id,
      email: "haji.ally@zanzibar.go.tz",
      passwordHash: defaultPassword,
      fullName: "Haji Ally Juma",
      mobile: "+255775334455",
      role: "BILLING_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "mzee.kombo@zanzibar.go.tz" },
    update: {},
    create: {
      accountId: govAccount.id,
      email: "mzee.kombo@zanzibar.go.tz",
      passwordHash: defaultPassword,
      fullName: "Mzee Kombo Bakari",
      mobile: "+255776445566",
      role: "READ_ONLY",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // 2. CORPORATE account — ACCOUNT_ADMIN (Biashara kubwa)
  const corpAccount = await prisma.customerAccount.upsert({
    where: { id: "acc-corp-zanzibar" },
    update: {},
    create: {
      id: "acc-corp-zanzibar",
      accountType: "CORPORATE",
      status: "ACTIVE",
      organisationName: "Zanzibar Seacliff Hotels Ltd",
      physicalAddress: "Kiembe Samaki, Zanzibar",
      tin: "2233445566",
      creditLimit: 5000000,
    },
  });

  await prisma.user.upsert({
    where: { email: "fatuma.abdalla@seacliff.co.tz" },
    update: {},
    create: {
      accountId: corpAccount.id,
      email: "fatuma.abdalla@seacliff.co.tz",
      passwordHash: defaultPassword,
      fullName: "Fatuma Abdalla Omar",
      mobile: "+255777556677",
      role: "ACCOUNT_ADMIN",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "omar.nassor@seacliff.co.tz" },
    update: {},
    create: {
      accountId: corpAccount.id,
      email: "omar.nassor@seacliff.co.tz",
      passwordHash: defaultPassword,
      fullName: "Omar Nassor Hemed",
      mobile: "+255778667788",
      role: "TECHNICAL_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "mariam.rajabu@seacliff.co.tz" },
    update: {},
    create: {
      accountId: corpAccount.id,
      email: "mariam.rajabu@seacliff.co.tz",
      passwordHash: defaultPassword,
      fullName: "Mariam Rajabu Faki",
      mobile: "+255779778899",
      role: "BILLING_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "abdi.hussein@seacliff.co.tz" },
    update: {},
    create: {
      accountId: corpAccount.id,
      email: "abdi.hussein@seacliff.co.tz",
      passwordHash: defaultPassword,
      fullName: "Abdi Hussein Khamis",
      mobile: "+255780889900",
      role: "READ_ONLY",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // 3. SME account — ACCOUNT_ADMIN
  const smeAccount = await prisma.customerAccount.upsert({
    where: { id: "acc-sme-zanzibar" },
    update: {},
    create: {
      id: "acc-sme-zanzibar",
      accountType: "SME",
      status: "ACTIVE",
      organisationName: "Stone Town Digital Solutions",
      physicalAddress: "Gizenga Street, Stone Town, Zanzibar",
      tin: "3344556677",
      creditLimit: 2000000,
    },
  });

  await prisma.user.upsert({
    where: { email: "suleiman.mussa@stonedigital.co.tz" },
    update: {},
    create: {
      accountId: smeAccount.id,
      email: "suleiman.mussa@stonedigital.co.tz",
      passwordHash: defaultPassword,
      fullName: "Suleiman Mussa Khamis",
      mobile: "+255771223344",
      role: "ACCOUNT_ADMIN",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "khadija.said@stonedigital.co.tz" },
    update: {},
    create: {
      accountId: smeAccount.id,
      email: "khadija.said@stonedigital.co.tz",
      passwordHash: defaultPassword,
      fullName: "Khadija Said Mbarouk",
      mobile: "+255772334455",
      role: "TECHNICAL_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "yusuf.hamad@stonedigital.co.tz" },
    update: {},
    create: {
      accountId: smeAccount.id,
      email: "yusuf.hamad@stonedigital.co.tz",
      passwordHash: defaultPassword,
      fullName: "Yusuf Hamad Seif",
      mobile: "+255773445566",
      role: "BILLING_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "zuhura.mohamed@stonedigital.co.tz" },
    update: {},
    create: {
      accountId: smeAccount.id,
      email: "zuhura.mohamed@stonedigital.co.tz",
      passwordHash: defaultPassword,
      fullName: "Zuhura Mohamed Thabit",
      mobile: "+255774556677",
      role: "READ_ONLY",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // 4. INDIVIDUAL account — ACCOUNT_ADMIN
  const indAccount = await prisma.customerAccount.upsert({
    where: { id: "acc-ind-zanzibar" },
    update: {},
    create: {
      id: "acc-ind-zanzibar",
      accountType: "INDIVIDUAL",
      status: "ACTIVE",
      physicalAddress: "Mbuyuni, Chukwani, Zanzibar",
      tin: "4455667788",
    },
  });

  await prisma.user.upsert({
    where: { email: "ali.hamza.znz@gmail.com" },
    update: {},
    create: {
      accountId: indAccount.id,
      email: "ali.hamza.znz@gmail.com",
      passwordHash: defaultPassword,
      fullName: "Ali Hamza Khamis",
      mobile: "+255775667788",
      role: "ACCOUNT_ADMIN",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "latifa.salim.znz@gmail.com" },
    update: {},
    create: {
      accountId: indAccount.id,
      email: "latifa.salim.znz@gmail.com",
      passwordHash: defaultPassword,
      fullName: "Latifa Salim Abdalla",
      mobile: "+255776778899",
      role: "READ_ONLY",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // 5. ISP account — ACCOUNT_ADMIN
  const ispAccount = await prisma.customerAccount.upsert({
    where: { id: "acc-isp-zanzibar" },
    update: {},
    create: {
      id: "acc-isp-zanzibar",
      accountType: "ISP",
      status: "ACTIVE",
      organisationName: "ZanzibarNet Solutions Ltd",
      physicalAddress: "Mlandege, Zanzibar",
      tin: "5566778899",
      creditLimit: 10000000,
    },
  });

  await prisma.user.upsert({
    where: { email: "idriss.makame@zanzibarnet.co.tz" },
    update: {},
    create: {
      accountId: ispAccount.id,
      email: "idriss.makame@zanzibarnet.co.tz",
      passwordHash: defaultPassword,
      fullName: "Idriss Makame Rashid",
      mobile: "+255777889900",
      role: "ACCOUNT_ADMIN",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "swabra.issa@zanzibarnet.co.tz" },
    update: {},
    create: {
      accountId: ispAccount.id,
      email: "swabra.issa@zanzibarnet.co.tz",
      passwordHash: defaultPassword,
      fullName: "Swabra Issa Khamis",
      mobile: "+255778990011",
      role: "TECHNICAL_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "nassor.omar@zanzibarnet.co.tz" },
    update: {},
    create: {
      accountId: ispAccount.id,
      email: "nassor.omar@zanzibarnet.co.tz",
      passwordHash: defaultPassword,
      fullName: "Nassor Omar Juma",
      mobile: "+255779001122",
      role: "BILLING_USER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // ─── ZICTIA Staff Accounts ───
  // All staff belong to a single internal ZICTIA account
  const staffAccount = await prisma.customerAccount.upsert({
    where: { id: "acc-zictia-staff" },
    update: {},
    create: {
      id: "acc-zictia-staff",
      accountType: "CORPORATE",
      status: "ACTIVE",
      organisationName: "Zanzibar ICT Infrastructure Agency (ZICTIA)",
      physicalAddress: "Mazizini Data Center, Zanzibar",
      tin: "9998887776",
    },
  });

  await prisma.user.upsert({
    where: { email: "halima.rajabu@zictia.go.tz" },
    update: {},
    create: {
      accountId: staffAccount.id,
      email: "halima.rajabu@zictia.go.tz",
      passwordHash: defaultPassword,
      fullName: "Halima Rajabu Mwinyi",
      mobile: "+255771334455",
      role: "STAFF_CSR",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "khamis.abdalla@zictia.go.tz" },
    update: {},
    create: {
      accountId: staffAccount.id,
      email: "khamis.abdalla@zictia.go.tz",
      passwordHash: defaultPassword,
      fullName: "Khamis Abdalla Nassor",
      mobile: "+255772445566",
      role: "STAFF_TECHNICIAN",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "mwanahawa.said@zictia.go.tz" },
    update: {},
    create: {
      accountId: staffAccount.id,
      email: "mwanahawa.said@zictia.go.tz",
      passwordHash: defaultPassword,
      fullName: "Mwanahawa Said Bakari",
      mobile: "+255773556677",
      role: "STAFF_MANAGER",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "admin.zictia@zictia.go.tz" },
    update: {},
    create: {
      accountId: staffAccount.id,
      email: "admin.zictia@zictia.go.tz",
      passwordHash: defaultPassword,
      fullName: "Ramadhani Juma Khamis",
      mobile: "+255774667788",
      role: "ADMIN",
      emailVerified: true,
      mobileVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // ─── Knowledge Base Articles ───
  const kbArticles = [
    {
      titleEn: "How to Apply for Government Internet Service",
      titleSw: "Jinsi ya Kuomba Huduma ya Interneti ya Serikali",
      contentEn: `Government ministries and agencies in Zanzibar can apply for dedicated internet connectivity through the ZICTIA Customer Portal.

**Steps:**
1. Register an account and select "Government" as the account type.
2. Provide your institution name, ministry, and ICT officer details.
3. Submit your application and await approval from ZICTIA management.
4. Once approved, a service order will be created and provisioning will begin.

**Required Documents:**
- Official letter from the Permanent Secretary or equivalent
- TIN certificate
- Physical address verification

**Support:**
For assistance, contact the ZICTIA Government Desk at +255 24 2235784 or email info@zictia.go.tz.`,
      contentSw: `Wizara na idara za serikali Zanzibar zinaweza kuomba uunganisho wa interneti kupitia ZICTIA Customer Portal.

**Hatua:**
1. Jisajili na uchague "Serikali" kama aina ya akaunti.
2. Toa jina la taasisi, wizara, na maelezo ya afisa TEHAMA.
3. Wasilisha maombi yako na usubiri idhini kutoka ZICTIA.
4. Baada ya kuidhinishwa, agizo la huduma litaundwa na usanidi utaanza.

**Nyaraka Zinazohitajika:**
- Barua rasmi kutoka Katibu Mkuu au mwenye cheo sawa
- Cheti cha TIN
- Uthibitisho wa anwani ya anuani

**Msaada:**
Wasiliana na ZICTIA Government Desk kupitia +255 24 2235784 au barua pepe info@zictia.go.tz.`,
      category: "Government Services",
      tags: ["internet", "government", "registration"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "Understanding Your Monthly Invoice",
      titleSw: "Kuelewa Ankara yako ya Mwezi",
      contentEn: `Your ZICTIA invoice is generated monthly and includes the following components:

**Line Items**
- Recurring service charges (e.g., Internet Capacity, VM hosting)
- One-time fees (e.g., setup fees, cross-connects)
- Usage-based charges (if applicable)

**Taxes**
- VAT (Value Added Tax) at 18% is applied to all taxable services.

**Payment Terms**
- Invoices are due within 30 days of issuance.
- Late payments may result in service suspension after 60 days overdue.

**How to Pay**
- Use the "Pay Now" button on the Billing page.
- Supported methods: M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Card, and Bank Transfer.

**Need Help?**
Open a billing ticket via the Support page or call +255 24 2235784.`,
      contentSw: `Ankara yako ya ZICTIA inaundwa kila mwezi na inajumuisha vipengele vifuatavyo:

**Vipengele vya Ankara**
- Malipo ya huduma zinazojirudia (mfano, Uwezo wa Interneti, ukaribishaji wa VM)
- Ada za mara moja (mfano, ada za usanidi)
- Malipo kulingana na matumizi (ikiwa inatumika)

**Kodi**
- VAT (Kodi ya Ongezeko la Thamani) kwa 18% inatumika kwa huduma zote zinazokodiwa.

**Masharti ya Malipo**
- Ankara zinalipwa ndani ya siku 30 tangu kutolewa.
- Malipo ya kuchelewa yanaweza kusababisha kusimamishwa kwa huduma baada ya siku 60.

**Jinsi ya Kulipa**
- Tumia kitufe cha "Lipa Sasa" kwenye ukurasa wa Malipo.
- Njia zinazokubaliwa: M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Kadi, na Uhamisho wa Benki.

**Unahitaji Msaada?**
Fungua tiketi ya malipo kupitia ukurasa wa Msaada au piga +255 24 2235784.`,
      category: "Billing",
      tags: ["invoice", "payment", "vat"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "Getting Started with Cloud Virtual Machines",
      titleSw: "Kuanza na Mashine za Virtuali za Wingu",
      contentEn: `ZICTIA offers scalable Cloud Virtual Machines (VMs) hosted in the Mazizini Data Center.

**Available Operating Systems**
- Ubuntu Server 22.04 LTS
- Windows Server 2022
- Rocky Linux 9

**Specifications**
- vCPU: 1 to 32 cores
- RAM: 1 GB to 64 GB
- Storage: SSD-backed, expandable up to 2 TB

**How to Order**
1. Browse the Service Catalog and select "Cloud Virtual Machine".
2. Choose your desired configuration and contract duration.
3. Submit the order. A ZICTIA technician will provision your VM within 24 hours.

**Accessing Your VM**
- SSH key-based access is recommended for Linux VMs.
- Windows VMs are accessed via RDP. Credentials will be emailed upon provisioning.

**Support**
For technical issues, open a ticket with priority "High" and select your VM subscription.`,
      contentSw: `ZICTIA inatoa Mashine za Virtuali za Wingu (VM) zinazoweza kuongezeka zilizohifadhiwa katika Data Center ya Mazizini.

**Mifumo ya Uendeshaji Inayopatikana**
- Ubuntu Server 22.04 LTS
- Windows Server 2022
- Rocky Linux 9

**Vigezo**
- vCPU: 1 hadi 32 cores
- RAM: 1 GB hadi 64 GB
- Hifadhi: SSD, inayoweza kuongezeka hadi TB 2

**Jinsi ya Kuagiza**
1. Vinjari Katalogi ya Huduma na uchague "Mashine ya Virtuali ya Wingu".
2. Chagua usanidi unaotaka na muda wa mkataba.
3. Wasilisha agizo. Mtaalamu wa ZICTIA atasimamia VM yako ndani ya masaa 24.

**Kufikia VM yako**
- Ufikiaji wa SSH kwa ufunguo unapendekezwa kwa VM za Linux.
- VM za Windows zinafikiwa kupitia RDP. Maelezo ya kuingia zitatumwa kwa barua pepe baada ya usanidi.

**Msaada**
Kwa matatizo ya kiufundi, fungua tiketi na kipaumbele cha "High" na chagua usajili wa VM yako.`,
      category: "Cloud Services",
      tags: ["vm", "cloud", "provisioning"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "Data Center Co-location Guidelines",
      titleSw: "Miongozo ya Uwekaji wa Data Center",
      contentEn: `ZICTIA's Mazizini Data Center provides world-class co-location services for businesses and government institutions in Zanzibar.

**Facilities**
- 24/7 physical security with biometric access control
- Redundant power: UPS + diesel generator
- Precision cooling (N+1 redundancy)
- Fire suppression system (FM-200)
- Remote Hands service during business hours

**Rack Options**
- Shared rack (1U to 10U)
- Half rack (21U)
- Full rack (42U)
- Custom cage configurations available

**Network**
- Cross-connects to ZICTIA IP-MPLS backbone
- Internet access via multiple upstream providers
- DDoS mitigation included

**Onboarding Process**
1. Submit an order via the portal.
2. Schedule a site visit with our facilities team.
3. Sign the Co-location Agreement and SLA.
4. Deploy your hardware with assistance from ZICTIA technicians.

**Contact**
Facilities Manager: +255 24 2235784 ext. 3`,
      contentSw: `Data Center ya ZICTIA Mazizini inatoa huduma za uwekaji wa kiwango cha kimataifa kwa biashara na taasisi za serikali Zanzibar.

**Viwango**
- Usalama wa kimwili wa masaa 24/7 na udhibiti wa biometriki
- Umeme wa akiba: UPS + jenereta ya dizeli
- Baridi sahihi (N+1 redundancy)
- Mfumo wa kuzima moto (FM-200)
- Huduma ya Remote Hands katika masaa ya kazi

**Chaguo za Rack**
- Rack la pamoja (1U hadi 10U)
- Rack la nusu (21U)
- Rack kamili (42U)
- Usanidi maalum wa cage unapatikana

**Mtandao**
- Cross-connects kwenye backbone ya IP-MPLS ya ZICTIA
- Ufikiaji wa interneti kupitia watoa huduma wengi
- Ulinzi wa DDoS umejumuishwa

**Mchakato wa Kujiunga**
1. Wasilisha agizo kupitia portal.
2. Panga ziara ya eneo na timu yetu ya viwango.
3. Saini Mkataba wa Uwekaji na SLA.
4. Sakinisha vifaa vyako kwa usaidizi wa mafundi wa ZICTIA.

**Mawasiliano**
Msimamizi wa Viwango: +255 24 2235784 ext. 3`,
      category: "Infrastructure",
      tags: ["co-location", "data-center", "mazizini"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "Resetting Your Portal Password",
      titleSw: "Kurejesha Nenosiri la Portal yako",
      contentEn: `If you have forgotten your ZICTIA Customer Portal password, you can reset it in a few steps.

**Steps:**
1. Click "Forgot password?" on the login page.
2. Enter your registered email address.
3. Check your inbox (and spam folder) for the reset link.
4. Click the link and enter a new password that meets the policy:
   - Minimum 10 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one digit
   - At least one special character (!@#$%^&* etc.)
5. Submit and log in with your new password.

**Account Security Tips**
- Do not share your password with colleagues.
- Enable MFA when available.
- Change your password every 90 days.

**Troubleshooting**
If you do not receive the reset email within 10 minutes, contact ZICTIA Support.`,
      contentSw: `Ikiwa umesahau nenosiri lako la ZICTIA Customer Portal, unaweza kulirejesha kwa hatua chache.

**Hatua:**
1. Bofya "Umesahau nenosiri?" kwenye ukurasa wa kuingia.
2. Ingiza anwani yako ya barua pepe iliyosajiliwa.
3. Angalia kikasha chako (na folda ya spam) kwa kiungo cha kurejesha.
4. Bofya kiungo na uingize nenosiri jipya linalokidhi siasa:
   - Herufi 10 za chini
   - Angalau herufi moja kubwa
   - Angalau herufi moja ndogo
   - Angalau namba moja
   - Angalau alama moja maalum (!@#$%^&* n.k.)
5. Wasilisha na ingia kwa nenosiri jipya.

**Vidokezo vya Usalama wa Akaunti**
- Usigawize nenosiri lako na wenzako.
- Wezesha MFA inapotolewa.
- Badilisha nenosiri lako kila siku 90.

**Kutatua Shida**
Ikiwa hupokei barua pepe ya kurejesha ndani ya dakika 10, wasiliana na Msaada wa ZICTIA.`,
      category: "Account Management",
      tags: ["password", "security", "login"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "SLA and Support Response Times",
      titleSw: "SLA na Muda wa Majibu ya Msaada",
      contentEn: `ZICTIA provides tiered Service Level Agreements (SLAs) based on your service subscription.

**SLA Tiers**
| Tier | Response Time | Resolution Time | Uptime Guarantee |
|------|---------------|-----------------|------------------|
| PLATINUM | 1 hour | 4 hours | 99.9% |
| GOLD | 2 hours | 8 hours | 99.5% |
| SILVER | 4 hours | 24 hours | 99.0% |
| STANDARD | 8 hours | 48 hours | 98.5% |

**Priority Levels**
- CRITICAL: Service completely down. Immediate escalation.
- HIGH: Major degradation. Affects business operations.
- MEDIUM: Partial impact. Standard queue.
- LOW: Minor issue or general enquiry.

**How to Escalate**
If your ticket has not received a first response within the SLA window, click the "Escalate" button on the ticket detail page. This will notify the Duty Manager automatically.

**Exclusions**
Scheduled maintenance, force majeure, and issues caused by customer-side equipment are excluded from SLA calculations.`,
      contentSw: `ZICTIA inatoa Makubaliano ya Kiwango cha Huduma (SLA) kwa kiwango kulingana na usajili wako wa huduma.

**Viwango vya SLA**
| Kiwango | Muda wa Majibu | Muda wa Kutatua | Uptime Guarantee |
|---------|----------------|-----------------|------------------|
| PLATINUM | Saa 1 | Saa 4 | 99.9% |
| GOLD | Saa 2 | Saa 8 | 99.5% |
| SILVER | Saa 4 | Saa 24 | 99.0% |
| STANDARD | Saa 8 | Saa 48 | 98.5% |

**Viwango vya Kipaumbele**
- CRITICAL: Huduma imekwama kabisa. Kupelelezwa mara moja.
- HIGH: Kudumaa kwa kiwango kikubwa. Kinaathiri shughuli za biashara.
- MEDIUM: Athari ya kiasi. Foleni ya kawaida.
- LOW: Tatizo dogo au swala la jumla.

**Jinsi ya Kupeleleza**
Ikiwa tiketi yako haijapokea jibu la kwanza ndani ya dirisha la SLA, bofya kitufe cha "Kupeleleza" kwenye ukurasa wa maelezo ya tiketi. Hii itaarifu Msimamizi wa Zamu kiotomatiki.

**Isiyo Na Shughuli**
Matengenezo yaliyopangwa, majanga ya asili, na matatizo yaliosababishwa na vifaa vya upande wa mteja hayajumuishwi katika mahesabu ya SLA.`,
      category: "Support",
      tags: ["sla", "support", "escalation"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "Managing Sub-Users in Your Account",
      titleSw: "Usimamizi wa Watumiaji Wadogo katika Akaunti Yako",
      contentEn: `Account Admins can create sub-users to delegate access within their organization.

**Available Roles for Sub-Users**
- Technical User: Can create tickets and view service details.
- Billing User: Can view invoices, make payments, and update billing contacts.
- Read-Only: Can view dashboard and reports but cannot make changes.

**How to Add a Sub-User**
1. Go to Dashboard → Account Settings.
2. Click "Add Sub-User".
3. Enter the full name, email, mobile number, and select a role.
4. The sub-user will receive an invitation email to set their password.

**Security**
- Sub-users cannot change the account type or approve orders.
- All actions by sub-users are logged in the Audit Log.
- You can deactivate or remove a sub-user at any time.

**Best Practices**
- Assign the least-privilege role needed for the user's duties.
- Review sub-user access quarterly.`,
      contentSw: `Wasimamizi wa Akaunti wanaweza kuunda watumiaji wadogo kwa ajili ya kugawia ufikiaji ndani ya shirika lao.

**Majukumu Yanayopatikana kwa Watumiaji Wadogo**
- Mtumiaji wa Kiufundi: Anaweza kuunda tiketi na kuangalia maelezo ya huduma.
- Mtumiaji wa Malipo: Anaweza kuangalia ankara, kulipa, na kusasisha mawasiliano ya malipo.
- Soma Tu: Anaweza kuangalia dashibodi na ripoti lakini hawezi kufanya mabadiliko.

**Jinsi ya Kuongeza Mtumiaji Mdogo**
1. Nenda kwa Dashibodi → Mipangilio ya Akaunti.
2. Bofya "Ongeza Mtumiaji Mdogo".
3. Ingiza jina kamili, barua pepe, namba ya simu, na chagua jukumu.
4. Mtumiaji mdogo atapokea barua pepe ya mwaliko kuweka nenosiri lake.

**Usalama**
- Watumiaji wadogo hawawezi kubadilisha aina ya akaunti au kuidhinisha maagizo.
- Vitendo vyote vya watumiaji wadogo vinahesabiwa katika Kumbukumbu ya Ukaguzi.
- Unaweza kuzima au kuondoa mtumiaji mdogo wakati wowote.

**Mazoea Bora**
- Gawia jukumu lenye ruhusa ndogo zinazohitajika kwa majukumu ya mtumiaji.
- Pitia ufikiaji wa watumiaji wadogo kila robo mwaka.`,
      category: "Account Management",
      tags: ["sub-users", "roles", "security"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "Connecting to IP-MPLS Private Networks",
      titleSw: "Kuunganisha na Mitandao ya Kibinafsi ya IP-MPLS",
      contentEn: `ZICTIA's IP-MPLS service provides secure, managed private networking between your Zanzibar offices and mainland Tanzania.

**Topologies Supported**
- Hub-and-Spoke: Central site (hub) connects to branch offices (spokes).
- Mesh: Every site connects directly to every other site.

**QoS Classes**
- Premium: Voice and video traffic (guaranteed bandwidth, low latency).
- Business: Critical application traffic.
- Standard: General data traffic.

**Equipment**
- ZICTIA provides managed CPE (Customer Premises Equipment) for all sites.
- Remote monitoring and firmware updates are included.

**Implementation Timeline**
- Site survey: 3-5 business days
- CPE delivery and installation: 7-10 business days
- Service activation and testing: 2-3 business days

**Support**
Open a "Service Request" ticket and select "IP-MPLS" as the affected service.`,
      contentSw: `Huduma ya IP-MPLS ya ZICTIA inatoa mtandao wa kibinafsi salama unaosimamiwa kati ya ofisi zako Zanzibar na Tanzania Bara.

**Miundo Inayoungwa Mkono**
- Hub-and-Spoke: Tovuti kuu (hub) inaunganisha na ofisi za matawi (spokes).
- Mesh: Kila tovuti inaunganisha moja kwa moja na nyingine.

**Vikosi vya QoS**
- Premium: Kasi ya sauti na video (uwezo wa kuhakikishiwa, ucheleweshaji mdogo).
- Business: Kasi ya programu muhimu.
- Standard: Kasi ya data ya jumla.

**Vifaa**
- ZICTIA inatoa CPE zinazosimamiwa (Customer Premises Equipment) kwa tovuti zote.
- Ufuatiliaji wa mbali na visasisho vya firmware vimejumuishwa.

**Ratiba ya Utekelezaji**
- Ukaguzi wa tovuti: siku 3-5 za kazi
- Utoaji na usakinishaji wa CPE: siku 7-10 za kazi
- Uamilisho wa huduma na majaribio: siku 2-3 za kazi

**Msaada**
Fungua tiketi ya "Service Request" na uchague "IP-MPLS" kama huduma iliyoathirika.`,
      category: "Networking",
      tags: ["ip-mpls", "vpn", "private-network"],
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      titleEn: "Frequently Asked Questions (FAQ)",
      titleSw: "Maswali Yanayoulizwa Mara kwa Mara (FAQ)",
      contentEn: `**Q: How long does account approval take?**
A: Government accounts are reviewed within 3 business days. Corporate and ISP accounts within 2 business days. SME and Individual accounts within 1 business day.

**Q: Can I change my service plan after ordering?**
A: Yes, submit a "Service Request" ticket with your desired changes. Upgrades are typically processed within 24 hours.

**Q: What happens if I miss a payment?**
A: You will receive reminders at 7 days, 3 days, and 1 day before the due date. If unpaid after 60 days, the service may be suspended.

**Q: Is my data backed up?**
A: For Co-location and VM services, ZICTIA provides snapshot backups weekly. You are responsible for backing up application data inside your VMs.

**Q: How do I report a security incident?**
A: Create a ticket with priority "CRITICAL" and type "Technical Issue". Include all relevant logs and timestamps.`,
      contentSw: `**Swali: Uidhinishaji wa akaunti unachukua muda gani?**
A: Akaunti za serikali zinaangaliwa ndani ya siku 3 za kazi. Akaunti za biashara na ISP ndani ya siku 2 za kazi. Akaunti za SME na mtu binafsi ndani ya siku 1 ya kazi.

**Swali: Ninaweza kubadilisha mpango wangu wa huduma baada ya kuagiza?**
A: Ndiyo, wasilisha tiketi ya "Service Request" na mabadiliko unayotaka. Ongezeko la huduma kawaida linashughulikiwa ndani ya masaa 24.

**Swali: Nini kinatokea nikikosa kulipa?**
A: Utapokea maburudisho siku 7, 3, na 1 kabla ya tarehe ya malipo. Ikiwa hujalipa baada ya siku 60, huduma inaweza kusimamishwa.

**Swali: Data yangu inahifadhiwa nakala?**
A: Kwa huduma za Uwekaji na VM, ZICTIA inatoa snapshots za kila wiki. Wewe una jukumu la kuhifadhi nakala ya data ya programu ndani ya VM zako.

**Swali: Ninawezaje kuripoti tukio la usalama?**
A: Unda tiketi na kipaumbele cha "CRITICAL" na aina ya "Technical Issue". Jumuisha kumbukumbu zote muhimu na timestamps.`,
      category: "General",
      tags: ["faq", "general", "help"],
      isPublished: true,
      publishedAt: new Date(),
    },
  ];

  for (const article of kbArticles) {
    await prisma.knowledgeBaseArticle.upsert({
      where: { id: article.titleEn.replace(/\s+/g, "-").toLowerCase().substring(0, 60) },
      update: {},
      create: {
        id: article.titleEn.replace(/\s+/g, "-").toLowerCase().substring(0, 60),
        ...article,
      },
    });
  }

  console.log("Seed completed successfully.");
  console.log("Created/updated:");
  console.log(`  - ${services.length} services`);
  console.log(`  - ${settings.length} system settings`);
  console.log(`  - 5 customer accounts (Gov, Corp, SME, Individual, ISP)`);
  console.log(`  - 1 ZICTIA staff account`);
  console.log(`  - 21 users total (all roles seeded)`);
  console.log(`  - ${kbArticles.length} knowledge base articles`);
  console.log("\nDefault password for all seeded users: Zanzibar2025!");
}

seed()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
