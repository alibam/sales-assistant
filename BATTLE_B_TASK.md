# 战役 B - Claude Code 前端 UI/UX 重构任务

## 🎯 任务目标
将 sales-assistant 项目的前端 UI 从功能性骨架升级为 2026 年最前沿的 B2B SaaS 审美标准。

## 🚨 绝对红线（架构师锁定）
1. ❌ **绝对不允许修改任何 Server Actions** (actions.ts / actions/stats.ts)
2. ❌ **绝对不允许修改 useStreamableValue 的状态接收逻辑**
3. ❌ **绝对不允许动底层 Prisma 查询和 XState 状态机流转**
4. ✅ **只许动皮，不许动骨！**

## 📐 设计规范 (2026 B2B SaaS 审美)

### 核心设计原则
- **极简主义**：抛弃边框感，使用微渐变和细腻阴影
- **Glassmorphism**：毛玻璃效果 (backdrop-blur)
- **Bento Box 布局**：便当盒式卡片布局
- **Subtle Gradients**：微渐变背景
- **Smooth Animations**：平滑过渡动画

### Tailwind CSS 配置
使用 Tailwind 实现以下效果：

**背景渐变**：
```
bg-gradient-to-br from-slate-50 to-white
bg-gradient-to-br from-blue-50 to-white
bg-gradient-to-br from-emerald-50 to-white
```

**阴影系统**：
```
shadow-sm: 细腻的卡片阴影
shadow-md: 悬停时的阴影
shadow-lg: 重要元素的阴影
```

**圆角系统**：
```
rounded-xl: 12px (卡片)
rounded-2xl: 16px (大卡片)
rounded-full: 完全圆角 (按钮、头像)
```

**动画**：
```
transition-all duration-500 ease-in-out
hover:scale-105 hover:shadow-lg
```

## 🎨 具体重构任务

### 任务 1: Super Dashboard (超级看板) 重塑

**目标文件**：
- `app/(dashboard)/components/SalesRepDashboard.tsx`
- `app/(dashboard)/components/ManagerDashboard.tsx`
- `app/(dashboard)/components/AdminDashboard.tsx`

**设计要求**：

1. **整体布局**：
   - 使用 Bento Box 网格布局
   - 卡片间距：gap-6
   - 响应式：移动端单列，桌面端 2-3 列

2. **A/B/C/D 漏斗统计卡片**：
   - 背景：微渐变 (bg-gradient-to-br from-slate-50 to-white)
   - 阴影：shadow-sm hover:shadow-md
   - 圆角：rounded-2xl
   - 内边距：p-6
   - 边框：border border-slate-100
   - 悬停效果：hover:scale-[1.02] transition-all duration-300

3. **数字展示**：
   - 大号字体：text-4xl font-bold
   - 渐变文字：bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent
   - 标签：text-sm text-slate-500

4. **图标**：
   - A 级：🎯 (蓝色渐变背景)
   - B 级：🚗 (绿色渐变背景)
   - C 级：💰 (黄色渐变背景)
   - D 级：🤔 (红色渐变背景)

### 任务 2: Customer Demo (双轨探需工作台) 华丽变身

**目标文件**：
- `app/(dashboard)/customer-demo/client.tsx`

**设计要求**：

#### 2.1 客户画像 A/B/C/D 区域
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* A: 需求与场景 */}
  <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-2xl">
        🎯
      </div>
      <h3 className="text-lg font-semibold text-slate-800">A - 需求与场景</h3>
    </div>
    {/* 内容 */}
  </div>
  {/* B, C, D 类似 */}
</div>
```

#### 2.2 画像完成度进度条
```tsx
<div className="relative">
  {/* 进度条容器 */}
  <div className="h-10 bg-slate-100 rounded-full overflow-hidden shadow-inner">
    {/* 进度条 */}
    <div 
      className={`h-full transition-all duration-500 ease-out flex items-center justify-end px-4 ${
        completionRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
        completionRate >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
        completionRate >= 30 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
        'bg-gradient-to-r from-red-500 to-red-400'
      }`}
      style={{ width: `${completionRate}%` }}
    >
      <span className="text-white font-bold text-sm">
        {completionRate}%
      </span>
    </div>
  </div>
  
  {/* 光影呼吸动画 */}
  <style jsx>{`
    @keyframes breathe {
      0%, 100% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
      50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
    }
    .h-10 {
      animation: breathe 2s ease-in-out infinite;
    }
  `}</style>
</div>
```

#### 2.3 跟进记录输入区
```tsx
<div className="space-y-4">
  {/* 模式切换 - Toggle Switch */}
  <label className="flex items-center gap-3 cursor-pointer">
    <div className="relative">
      <input
        type="checkbox"
        checked={isPostCallMode}
        onChange={(e) => setIsPostCallMode(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600"></div>
    </div>
    <span className="text-sm text-slate-600">
      {isPostCallMode ? '💬 事后复盘模式' : '🎯 实时引导模式'}
    </span>
  </label>

  {/* Textarea */}
  <textarea
    className="w-full min-h-[120px] p-4 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 resize-none backdrop-blur-sm bg-white/80"
    placeholder={isPostCallMode ? '请输入通话录音总结...' : '请输入客户说了什么...'}
    value={followUpText}
    onChange={(e) => setFollowUpText(e.target.value)}
  />

  {/* 按钮 */}
  <button
    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={handleGenerate}
    disabled={isPending || !followUpText.trim()}
  >
    {isPending ? '处理中...' : '提交跟进'}
  </button>
</div>
```

#### 2.4 对话历史 - Apple Messages 风格
```tsx
<div className="space-y-4">
  {conversationHistory.map((msg, idx) => (
    <div
      key={idx}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* 头像 */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
          msg.role === 'user' 
            ? 'bg-gradient-to-br from-blue-500 to-blue-400' 
            : 'bg-gradient-to-br from-emerald-500 to-emerald-400'
        }`}>
          {msg.role === 'user' ? '👤' : '🤖'}
        </div>
        
        {/* 气泡 */}
        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
          msg.role === 'user'
            ? 'bg-gradient-to-br from-blue-500 to-blue-400 text-white rounded-tr-sm'
            : 'bg-gradient-to-br from-slate-100 to-white text-slate-800 rounded-tl-sm border border-slate-200'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {msg.content}
          </p>
        </div>
      </div>
    </div>
  ))}
</div>
```

#### 2.5 AI 策略建议卡片 - 高级内训卡样式
```tsx
<div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50 border border-slate-200 shadow-lg">
  {/* 一键复制按钮 */}
  <button className="absolute top-4 right-4 px-4 py-2 rounded-lg backdrop-blur-md bg-white/70 border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-md transition-all duration-300">
    📋 复制
  </button>

  {/* 标题 */}
  <div className="flex items-center gap-3 mb-6">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-2xl">
      🤖
    </div>
    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
      AI 策略建议
    </h2>
  </div>

  {/* 话术建议 - 引用块样式 */}
  <div className="space-y-4">
    {data.talkTracks?.map((track, idx) => (
      <div key={idx} className="pl-4 border-l-4 border-emerald-400 bg-emerald-50/50 rounded-r-xl p-4">
        <p className="text-sm font-semibold text-emerald-800 mb-2">
          {track.objective}
        </p>
        <p className="text-sm text-slate-700 italic leading-relaxed">
          "{track.script}"
        </p>
        <p className="text-xs text-slate-500 mt-2">
          💡 {track.tone} · ⏰ {track.whenToUse}
        </p>
      </div>
    ))}
  </div>

  {/* 行动计划 - Checklist 样式 */}
  <div className="mt-6 space-y-3">
    <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 行动计划</h3>
    {data.actionPlan?.map((action, idx) => (
      <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:shadow-md transition-all duration-300">
        <div className="w-6 h-6 rounded-md border-2 border-blue-400 flex items-center justify-center text-blue-600 flex-shrink-0">
          ✓
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">{action.step}</p>
          <p className="text-xs text-slate-500 mt-1">
            👤 {action.owner} · 📅 {action.dueWindow}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
```

## 🔄 视觉驱动开发 (VDD) 闭环流程

**重要**：Claude Code 必须在每次修改后执行以下流程：

1. **修改代码**：按照设计规范重构 UI
2. **TypeScript 检查**：运行 `npm run type-check` 确保无错误
3. **重启开发服务器**（如果需要）：`pm2 restart sales-assistant --update-env`
4. **等待服务启动**：等待 3-5 秒
5. **截图验证**：使用无头浏览器访问页面并截图
6. **自我审查**：检查截图中的 UI 效果
   - ✅ 布局是否正确？
   - ✅ 颜色和渐变是否美观？
   - ✅ 动画是否流畅？
   - ✅ 响应式是否正常？
7. **如果发现问题**：立即回滚并重写
8. **如果效果满意**：继续下一个组件

## 📝 执行步骤

### Step 1: 重构 Customer Demo 页面
1. 读取 `app/(dashboard)/customer-demo/client.tsx`
2. 按照设计规范重构 UI
3. 保留所有 state、handler、useStreamableValue 逻辑
4. 只修改 JSX 和样式
5. TypeScript 检查
6. 截图验证

### Step 2: 重构 Super Dashboard
1. 读取三个 Dashboard 组件
2. 按照设计规范重构 UI
3. 使用 Bento Box 布局
4. 添加微渐变和细腻阴影
5. TypeScript 检查
6. 截图验证

### Step 3: 最终验证
1. 访问所有重构的页面
2. 截图对比
3. 确保无 CSS 错位
4. 确保所有功能正常

## 🎯 成功标准

1. ✅ 视觉效果达到 2026 B2B SaaS 审美标准
2. ✅ 所有动画流畅 (60fps)
3. ✅ 响应式布局完美适配移动端和桌面端
4. ✅ 无 TypeScript 错误
5. ✅ 所有功能正常（跟进、生成、重置）
6. ✅ 无头浏览器截图验证通过
7. ✅ 没有修改任何 Server Actions 或业务逻辑

---

**开始执行！记住：只许动皮，不许动骨！每一步都要截图验证！**
