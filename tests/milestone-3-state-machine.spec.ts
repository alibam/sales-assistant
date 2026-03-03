import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createActor, waitFor } from 'xstate';
import { prisma, CustomerStatus } from '../lib/db/client';
import { mergeProfiles } from '../lib/ai/gap-analysis';
import { createSalesMachine } from '../lib/xstate/sales-machine';
import { detectMomentum } from '../lib/xstate/state-evaluator';
import type { CustomerProfile } from '../lib/ai/types';

const TEST_TIMEOUT_MS = 30_000;

function profileRoundD(): CustomerProfile {
  return {
    blockers: {
      main_blocker: '信任',
      intensity: '高',
      needs_manager: true,
    },
  };
}

function profileRoundC(): CustomerProfile {
  return {
    scene: {
      usage_scenario: '家庭用车',
      key_motives: ['空间'],
    },
    preference: {
      intent_model: 'SUV',
    },
    timing: {
      delivery_timeline: '本月',
    },
    decision_unit: {
      decision_maker_involved: false,
    },
    blockers: {
      main_blocker: '无',
      intensity: '低',
      needs_manager: false,
    },
  };
}

function profileRoundB(): CustomerProfile {
  return {
    budget_payment: {
      budget_limit: '30万以内',
      payment_method: '贷款',
    },
    competitor: {
      main_conflict: '价格',
      has_quote: true,
    },
    blockers: {
      main_blocker: '价格',
      intensity: '中',
    },
  };
}

function profileRoundCoolToC(): CustomerProfile {
  return {
    timing: {
      delivery_timeline: '不急',
    },
    competitor: {
      main_conflict: '无',
      has_quote: true,
    },
    blockers: {
      main_blocker: '无',
      intensity: '低',
    },
  };
}

function profileRoundFinalA(): CustomerProfile {
  return {
    timing: {
      delivery_timeline: '1周',
    },
    decision_unit: {
      decision_maker_involved: true,
      payer: '本人',
    },
    blockers: {
      main_blocker: '无',
      intensity: '低',
    },
  };
}

function profileRoundBackToB(): CustomerProfile {
  return {
    timing: {
      delivery_timeline: '不急',
    },
    competitor: {
      main_conflict: '配置',
      has_quote: true,
    },
    blockers: {
      main_blocker: '价格',
      intensity: '中',
    },
  };
}

async function evaluateWithMachine(
  tenantId: string,
  customerId: string,
  profile: CustomerProfile,
) {
  const machine = createSalesMachine(tenantId, customerId, profile);
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'EVALUATE_PROFILE', profile });

  const snapshot = await waitFor(
    actor,
    (s) => s.status === 'done' || s.matches('error'),
    { timeout: TEST_TIMEOUT_MS },
  );

  actor.stop();
  return snapshot;
}

test.describe('M3 BDD: 长周期状态机与多轮对话', () => {
  test.describe.configure({ mode: 'serial' });

  const tenantId = randomUUID();
  const customerId = randomUUID();

  let dbReady = true;

  test.beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      await prisma.tenant.create({
        data: {
          id: tenantId,
          name: 'BDD M3 Tenant',
          settings: { source: 'playwright-m3' },
        },
      });

      await prisma.customer.create({
        data: {
          id: customerId,
          tenantId,
          name: 'BDD M3 Customer',
          status: CustomerStatus.C,
          profileData: {},
        },
      });
    } catch (error) {
      dbReady = false;
      console.error('[M3 BDD] DB setup failed:', error);
    }
  });

  test.afterAll(async () => {
    if (!dbReady) return;

    await prisma.salesStateHistory.deleteMany({ where: { tenantId, customerId } });
    await prisma.customer.deleteMany({ where: { id: customerId, tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  test('Given 既有画像, When 新一轮信息进入, Then 画像必须增量合并而不是从零覆盖', async () => {
    test.skip(!dbReady, 'DB not available in this environment');

    const existingProfile: Partial<CustomerProfile> = {
      scene: {
        usage_scenario: '家庭用车',
        must_haves: ['空间大'],
      },
      preference: {
        intent_model: 'SUV',
      },
      budget_payment: {
        budget_limit: '25万以内',
      },
    };

    const extractedRound2: CustomerProfile = {
      preference: {
        color_and_inventory: '白色现车优先',
      },
      competitor: {
        main_conflict: '价格',
      },
    };

    await test.step('Given: 已有历史画像存在（前端点击生成时应携带 existingProfile）', async () => {
      expect(existingProfile.scene?.usage_scenario).toBe('家庭用车');
      expect(existingProfile.budget_payment?.budget_limit).toBe('25万以内');
    });

    let merged: CustomerProfile;

    await test.step('When: 第二轮对话提取到增量字段并执行 mergeProfiles', async () => {
      merged = mergeProfiles(existingProfile, extractedRound2);
    });

    await test.step('Then: 旧字段保留 + 新字段补充 + 同层按增量覆盖', async () => {
      expect(merged!.scene?.usage_scenario).toBe('家庭用车');
      expect(merged!.budget_payment?.budget_limit).toBe('25万以内');
      expect(merged!.preference?.intent_model).toBe('SUV');
      expect(merged!.preference?.color_and_inventory).toBe('白色现车优先');
      expect(merged!.competitor?.main_conflict).toBe('价格');
    });
  });

  test('Given 多轮对话推进, When 状态机接管评估, Then 触发 D->C->B->C->B->A 并写入历史快照', async () => {
    test.skip(!dbReady, 'DB not available in this environment');

    await prisma.salesStateHistory.deleteMany({ where: { tenantId, customerId } });

    let mergedProfile = {} as CustomerProfile;

    await test.step('Given: 客户初始无状态历史', async () => {
      const initialCount = await prisma.salesStateHistory.count({ where: { tenantId, customerId } });
      expect(initialCount).toBe(0);
    });

    await test.step('When: 第 1 轮（客户初次进店，信任阻塞强）进入状态机', async () => {
      mergedProfile = mergeProfiles(mergedProfile, profileRoundD());
      const snapshot = await evaluateWithMachine(tenantId, customerId, mergedProfile);
      expect(snapshot.matches('error')).toBeFalsy();
      expect(snapshot.context.classification?.status).toBe('D');
    });

    await test.step('When: 第 2 轮（建联后降阻，进入普通意向）进入状态机', async () => {
      mergedProfile = mergeProfiles(mergedProfile, profileRoundC());
      const snapshot = await evaluateWithMachine(tenantId, customerId, mergedProfile);
      expect(snapshot.matches('error')).toBeFalsy();
      expect(snapshot.context.classification?.status).toBe('C');
    });

    await test.step('When: 第 3 轮（预算明确+阻塞存在）进入状态机', async () => {
      mergedProfile = mergeProfiles(mergedProfile, profileRoundB());
      const snapshot = await evaluateWithMachine(tenantId, customerId, mergedProfile);
      expect(snapshot.matches('error')).toBeFalsy();
      expect(snapshot.context.classification?.status).toBe('B');
    });

    await test.step('When: 第 4 轮（价格分歧降温，回落到 C）进入状态机', async () => {
      mergedProfile = mergeProfiles(mergedProfile, profileRoundCoolToC());
      const snapshot = await evaluateWithMachine(tenantId, customerId, mergedProfile);
      expect(snapshot.matches('error')).toBeFalsy();
      expect(snapshot.context.classification?.status).toBe('C');
    });

    await test.step('When: 第 5 轮（优惠方案拉回购买意向）进入状态机', async () => {
      mergedProfile = mergeProfiles(mergedProfile, profileRoundBackToB());
      const snapshot = await evaluateWithMachine(tenantId, customerId, mergedProfile);
      expect(snapshot.matches('error')).toBeFalsy();
      expect(snapshot.context.classification?.status).toBe('B');
    });

    await test.step('When: 第 6 轮（确认首付和提车时间）进入状态机', async () => {
      mergedProfile = mergeProfiles(mergedProfile, profileRoundFinalA());
      const snapshot = await evaluateWithMachine(tenantId, customerId, mergedProfile);
      expect(snapshot.matches('error')).toBeFalsy();
      expect(snapshot.context.classification?.status).toBe('A');
    });

    await test.step('Then: SalesStateHistory 必须记录每次变化（含 reason）', async () => {
      const history = await prisma.salesStateHistory.findMany({
        where: { tenantId, customerId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          fromState: true,
          toState: true,
          reason: true,
        },
      });

      expect(history).toHaveLength(6);
      expect(history[0].fromState).toBeNull();
      expect(history[0].toState).toBe('D');
      expect(history[1].fromState).toBe('D');
      expect(history[1].toState).toBe('C');
      expect(history[2].fromState).toBe('C');
      expect(history[2].toState).toBe('B');
      expect(history[3].fromState).toBe('B');
      expect(history[3].toState).toBe('C');
      expect(history[4].fromState).toBe('C');
      expect(history[4].toState).toBe('B');
      expect(history[5].fromState).toBe('B');
      expect(history[5].toState).toBe('A');

      for (const record of history) {
        expect(record.reason).toBeTruthy();
        expect(record.reason?.length ?? 0).toBeGreaterThan(5);
      }
    });

    await test.step('Then: Momentum 方向应符合业务预期（up/up/down/up/up）', async () => {
      expect(detectMomentum('D', 'C')).toBe('up');
      expect(detectMomentum('C', 'B')).toBe('up');
      expect(detectMomentum('B', 'C')).toBe('down');
      expect(detectMomentum('C', 'B')).toBe('up');
      expect(detectMomentum('B', 'A')).toBe('up');
    });
  });

  test('Given 当前状态已是 B, When 再次评估仍为 B, Then 不应重复写入快照', async () => {
    test.skip(!dbReady, 'DB not available in this environment');

    const before = await prisma.salesStateHistory.count({ where: { tenantId, customerId } });

    const stableBProfile = mergeProfiles(
      mergeProfiles(profileRoundD(), profileRoundC()),
      mergeProfiles(profileRoundB(), profileRoundBackToB()),
    );
    const snapshot = await evaluateWithMachine(tenantId, customerId, stableBProfile);

    expect(snapshot.matches('error')).toBeFalsy();
    expect(snapshot.context.classification?.status).toBe('B');

    const after = await prisma.salesStateHistory.count({ where: { tenantId, customerId } });
    expect(after).toBe(before);
  });
});
