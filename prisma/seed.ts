/**
 * Database seed script for OpenClaw multi-tenant SaaS.
 * Creates a sample tenant (AutoMax 4S Shop) with customers across all A/B/C/D states
 * and corresponding state history records.
 *
 * Usage: npx tsx prisma/seed.ts
 */
import { PrismaClient, CustomerStatus } from "../generated/prisma";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Seeding database...");

  // --- Tenant ---
  const tenant = await prisma.tenant.create({
    data: {
      name: "AutoMax 4S Shop",
      settings: {
        locale: "zh-CN",
        industry: "automotive_4s",
        profileSchemaVersion: "1.0.0",
        features: {
          aiGapAnalysis: true,
          voiceTranscription: true,
        },
      },
    },
  });
  console.log(`  Created tenant: ${tenant.name} (${tenant.id})`);

  // --- Customers with diverse A/B/C/D states ---
  const customersData = [
    {
      name: "张伟",
      email: "zhang.wei@example.com",
      phone: "13800001111",
      status: CustomerStatus.A,
      profileData: {
        budget: { range: "300k-500k", confirmed: true, financing_needed: false },
        decision_maker: { role: "self", identified: true },
        timeframe: { urgency: "immediate", trigger_event: "Current lease expires next week" },
        vehicle_model: { brand: "BMW", model: "X5 xDrive40Li", configuration: "M Sport", color_preference: "Carbon Black" },
        trade_in_info: { has_trade_in: true, current_vehicle: "2019 Audi Q5L", estimated_value: 180000 },
        contact_preferences: { preferred_channel: "wechat", best_time: "weekday evenings" },
      },
    },
    {
      name: "李娜",
      email: "li.na@example.com",
      phone: "13900002222",
      status: CustomerStatus.B,
      profileData: {
        budget: { range: "200k-300k", confirmed: false, financing_needed: true },
        decision_maker: { role: "spouse", identified: false, influencers: ["husband"] },
        timeframe: { urgency: "within_1_month" },
        vehicle_model: { brand: "Mercedes-Benz", model: "GLC 260L" },
        competitors: { brands_considered: ["BMW X3", "Audi Q5L"], main_objection: "Price too high compared to competitors" },
        contact_preferences: { preferred_channel: "phone", best_time: "Saturday mornings" },
      },
    },
    {
      name: "王强",
      email: "wang.qiang@example.com",
      phone: "13700003333",
      status: CustomerStatus.C,
      profileData: {
        budget: { range: "500k-800k" },
        decision_maker: { role: "family_joint" },
        timeframe: { urgency: "3_6_months" },
        vehicle_model: { brand: "Tesla", model: "Model Y" },
        usage_scenario: { primary_use: "family_travel", annual_mileage: "10k-20k", passengers: 4 },
      },
    },
    {
      name: "赵敏",
      email: "zhao.min@example.com",
      phone: "13600004444",
      status: CustomerStatus.D,
      profileData: {
        budget: { range: "<200k" },
        decision_maker: { role: "self", identified: true },
        timeframe: { urgency: "exploring" },
        vehicle_model: { brand: "BYD" },
        competitors: { brands_considered: ["BYD", "NIO"], main_objection: "Budget does not match our inventory" },
      },
    },
    {
      name: "陈磊",
      email: "chen.lei@example.com",
      phone: "13500005555",
      status: CustomerStatus.B,
      profileData: {
        budget: { range: "300k-500k", confirmed: true, financing_needed: true },
        decision_maker: { role: "company_fleet", identified: true },
        timeframe: { urgency: "1_3_months", trigger_event: "Company fleet renewal Q2" },
        vehicle_model: { brand: "BMW", model: "5 Series", must_have_features: ["adaptive cruise control", "HUD"] },
        trade_in_info: { has_trade_in: true, current_vehicle: "2018 BMW 3 Series x3", estimated_value: 120000, outstanding_loan: false },
      },
    },
  ];

  const customers = [];
  for (const data of customersData) {
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        profileData: data.profileData,
      },
    });
    customers.push(customer);
    console.log(`  Created customer: ${customer.name} (${customer.status})`);
  }

  // --- Sales State History ---
  const historyData = [
    // 张伟: C -> B -> A (progressive warming)
    { customerIdx: 0, fromState: CustomerStatus.C, toState: CustomerStatus.B, reason: "Customer confirmed budget range after second visit. Showed strong interest in X5." },
    { customerIdx: 0, fromState: CustomerStatus.B, toState: CustomerStatus.A, reason: "Lease expiring next week. Decision maker confirmed. Ready to sign." },
    // 李娜: C -> B (still comparing)
    { customerIdx: 1, fromState: CustomerStatus.C, toState: CustomerStatus.B, reason: "Visited showroom twice. Interested but comparing with BMW X3 pricing." },
    // 王强: initial entry as C
    { customerIdx: 2, fromState: null, toState: CustomerStatus.C, reason: "Initial inquiry via website. Family considering upgrade in 3-6 months." },
    // 赵敏: C -> D (disqualified)
    { customerIdx: 3, fromState: CustomerStatus.C, toState: CustomerStatus.D, reason: "Budget under 200k. Does not match any available inventory. Referred to used car department." },
    // 陈磊: C -> B (fleet deal warming up)
    { customerIdx: 4, fromState: CustomerStatus.C, toState: CustomerStatus.B, reason: "Company fleet renewal confirmed for Q2. Budget approved by procurement." },
  ];

  for (const h of historyData) {
    await prisma.salesStateHistory.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[h.customerIdx].id,
        fromState: h.fromState,
        toState: h.toState,
        reason: h.reason,
      },
    });
  }
  console.log(`  Created ${historyData.length} state history records`);

  console.log("✅ Seed complete.");
}

main()
  .catch((e: unknown) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
