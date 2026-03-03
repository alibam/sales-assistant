# Milestone 3 测试规划（BDD）

## 目标
验证 M3「长周期状态机与多轮对话」三大闭环：

1. 增量记忆上下文：existing profile 必须参与下一轮分析与合并，不能每轮从零开始。
2. XState 状态机接管：画像变化后由状态机评估并驱动 A/B/C/D 转换。
3. 持久化历史快照：状态变更即时写入 `SalesStateHistory`，记录 `fromState/toState/reason`。

## 测试范围
- 测试文件：`tests/milestone-3-state-machine.spec.ts`
- 关键模块：
  - `lib/ai/gap-analysis.ts`（`mergeProfiles`）
  - `lib/xstate/sales-machine.ts`（状态机评估与持久化调用）
  - `lib/xstate/state-evaluator.ts`（A/B/C/D 规则与 momentum）
  - `lib/db/state-history.ts`（事务写入与去重）

## BDD 用例列表

### TC-M3-01 增量画像合并（existing profile 不丢失）
Given
- 已有客户画像（第一轮沉淀）包含 `scene/preference/budget_payment` 字段。

When
- 第二轮对话提取到增量字段（如 `competitor.main_conflict`、`preference.color_and_inventory`）并执行 `mergeProfiles`。

Then
- 原有字段必须保留。
- 新字段必须写入合并结果。
- 同 section 冲突字段按“新值覆盖旧值”处理。
- 验证结论：后端具备“非从零分析”的增量能力（依赖 existing profile）。

### TC-M3-02 状态机多轮流转与持久化闭环（D -> C -> B -> C -> B -> A）
Given
- 测试租户+客户已创建，`SalesStateHistory` 初始为空。

When
- 第 1 轮输入画像（客户初次进店，信任阻塞强）触发评估。
- 第 2 轮补充建联后降阻信息触发评估。
- 第 3 轮补充预算+阻塞信息触发评估。
- 第 4 轮出现价格分歧降温信息触发评估。
- 第 5 轮补充优惠方案拉回信息触发评估。
- 第 6 轮补充首付确认+提车时间触发评估。

Then
- 状态序列应为：`D -> C -> B -> C -> B -> A`。
- `SalesStateHistory` 应产生 6 条记录：
  - `null -> D`
  - `D -> C`
  - `C -> B`
  - `B -> C`
  - `C -> B`
  - `B -> A`
- 每条记录均应包含非空 `reason`（AI/规则总结原因）。
- `momentum` 方向应满足：
  - `D -> C = up`
  - `C -> B = up`
  - `B -> C = down`
  - `C -> B = up`
  - `B -> A = up`

### TC-M3-03 状态不变去重（不重复写历史）
Given
- 客户当前最新状态已经是 `B`。

When
- 再次输入画像，评估结果仍为 `B`。

Then
- `SalesStateHistory` 记录数不增加。
- 验证 `saveStateTransitionWithTransaction` 的“状态未变化不插入”逻辑。

## 测试数据设计

### 测试实体
- Tenant：动态 UUID（每次运行隔离）
- Customer：动态 UUID（挂载到测试 Tenant）

### 多轮画像样本
- Round-1（目标 D：客户初次进店）
  - `blockers.main_blocker = 信任`
  - `blockers.intensity = 高`
- Round-2（目标 C：建联后升级）
  - `timing.delivery_timeline = 本月`
  - `decision_unit.decision_maker_involved = false`
  - `blockers.main_blocker = 无`
  - `blockers.intensity = 低`
- Round-3（目标 B：产生购买意向）
  - `budget_payment.budget_limit = 30万以内`
  - `competitor.main_conflict = 价格`
  - `blockers.main_blocker = 价格`
  - `blockers.intensity = 中`
- Round-4（目标 C：因价格分歧降温）
  - `timing.delivery_timeline = 不急`
  - `competitor.main_conflict = 无`
  - `blockers.main_blocker = 无`
  - `blockers.intensity = 低`
- Round-5（目标 B：优惠方案拉回）
  - `competitor.main_conflict = 配置`
  - `blockers.main_blocker = 价格`
  - `blockers.intensity = 中`
- Round-6（目标 A：确认首付和提车时间）
  - `timing.delivery_timeline = 1周`
  - `decision_unit.decision_maker_involved = true`
  - `decision_unit.payer = 本人`
  - `blockers.main_blocker = 无`
  - `blockers.intensity = 低`

## 预期行为
- 增量更新：merge 后画像包含跨轮累计信息。
- 状态接管：每轮评估都由 XState 状态机执行，不绕过状态机。
- 历史快照：仅状态发生变化时写库，且保留变化原因。
- 长周期稳定性：在多轮对话中支持“升级 + 降级 + 稳态不重复写入”。

## 执行方式
```bash
npx playwright test tests/milestone-3-state-machine.spec.ts
```

## 验收标准
- 三个 BDD 用例全部通过。
- `D -> C -> B -> C -> B -> A` 序列和数据库快照记录与预期一致。
- 稳态评估不新增历史记录。
