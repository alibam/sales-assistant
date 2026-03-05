# 战役 B - 极致 UI/UX 审美重构任务

## 🎯 核心目标
将 Customer Demo 页面从功能性骨架升级为 2026 年最前沿的 B2B SaaS 审美标准。

## 🚨 绝对红线（不可触碰）
1. ❌ 不许修改任何 Server Actions (actions.ts / actions/stats.ts)
2. ❌ 不许修改 useStreamableValue 的状态接收逻辑
3. ❌ 不许动底层 Prisma 查询和 XState 状态机流转
4. ✅ 只许动皮，不许动骨！

## 📐 设计规范 (2026 B2B SaaS 审美)

### 色彩系统
- **主色调**: 极简白/灰底色 (#ffffff, #f8fafc, #f1f5f9)
- **微渐变**: Subtle Gradients (linear-gradient 角度 135deg, 透明度 0.05-0.1)
- **毛玻璃效果**: Glassmorphism (backdrop-filter: blur(12px), background: rgba(255,255,255,0.7))
- **状态色**:
  - 成功/完成: #10b981 (emerald-500)
  - 警告/进行中: #f59e0b (amber-500)
  - 危险/缺失: #ef4444 (red-500)
  - 信息/中性: #3b82f6 (blue-500)

### 布局系统
- **Bento Box 卡片**: 便当盒式卡片布局，圆角 16px，阴影 0 4px 6px rgba(0,0,0,0.05)
- **间距**: 统一使用 8px 基准网格 (8, 16, 24, 32, 48)
- **响应式**: 移动端单列，桌面端 2-3 列网格

### 动画效果
- **光影呼吸**: 进度条使用 box-shadow 动画，0-4px 模糊半径，500ms ease-in-out
- **数字滚动**: 完成度百分比使用 CSS counter 或 JS 平滑过渡
- **悬停效果**: 卡片 hover 时轻微上浮 (translateY(-2px))，阴影加深

### Typography (排版)
- **标题**: Inter/SF Pro Display, 字重 600-700
- **正文**: Inter/SF Pro Text, 字重 400-500
- **代码/数据**: JetBrains Mono/SF Mono, 字重 400

## 🎨 具体重构任务

### 任务 1: 客户画像 A/B/C/D 区域
**当前状态**: 简单的 2x2 网格，灰色背景卡片
**目标效果**:
- 使用 Bento Box 布局，每个卡片带微渐变背景
- 添加图标 (A: 🎯, B: 🚗, C: 💰, D: 🤔)
- 字段值使用更大字号和粗体，标签使用小号灰色文字
- 当前状态卡片使用毛玻璃效果，悬浮在底部

### 任务 2: 画像完成度进度条
**当前状态**: 简单的彩色进度条，百分比显示在右侧
**目标效果**:
- 添加光影呼吸动画 (box-shadow 脉动)
- 百分比数字使用平滑滚动动画 (CSS counter-increment 或 JS)
- 进度条高度增加到 40px，圆角 20px
- 添加渐变色 (不同阶段使用不同渐变)
- 待补充字段使用更精致的标签样式 (圆角胶囊，带图标)

### 任务 3: 跟进记录输入区
**当前状态**: 简单的 textarea 和按钮
**目标效果**:
- Textarea 使用毛玻璃边框，focus 时发光效果
- 按钮使用渐变背景 + 悬停动画
- 模式切换 checkbox 改为精致的 toggle switch
- 添加字符计数器和输入提示

### 任务 4: 对话历史区域
**当前状态**: 简单的蓝/绿背景卡片
**目标效果**:
- 改造成 Apple Messages 风格气泡流
- 用户消息: 右对齐，蓝色渐变气泡，圆角 18px
- AI 消息: 左对齐，绿色渐变气泡，圆角 18px
- 添加头像 (👤 用户, 🤖 AI)
- 时间戳显示在气泡下方 (小号灰色文字)
- 气泡之间添加微妙的连接线

### 任务 5: AI 策略建议卡片
**当前状态**: 简单的白色卡片，文字堆叠
**目标效果**:
- 使用高级内训卡样式，带精美排版
- 标题使用大号粗体 + 图标
- 话术建议使用引用块样式 (左侧竖线，斜体)
- 行动计划使用 checklist 样式 (带 checkbox 图标)
- 添加悬浮"一键复制"按钮 (右上角，毛玻璃效果)
- 整体使用微渐变背景

### 任务 6: 骨架屏
**当前状态**: 简单的灰色矩形
**目标效果**:
- 使用 shimmer 动画 (从左到右的光泽扫过)
- 圆角和间距与实际内容一致
- 添加微妙的脉动效果

## 📦 技术实现要求

### CSS-in-JS 风格
- 继续使用 inline styles (保持与现有代码一致)
- 可以添加 `<style jsx>` 块来实现复杂动画

### 动画实现
```css
/* 光影呼吸 */
@keyframes breathe {
  0%, 100% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
}

/* Shimmer 扫光 */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

/* 数字滚动 */
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 响应式断点
- 移动端: < 768px
- 平板: 768px - 1024px
- 桌面: > 1024px

## 🎬 执行步骤

1. **阅读当前代码**: `app/(dashboard)/customer-demo/client.tsx`
2. **保留所有逻辑**: 不修改任何 state、handler、useStreamableValue
3. **重构 JSX 结构**: 只修改 return 语句中的 JSX 和 inline styles
4. **添加动画**: 使用 `<style jsx>` 或 CSS modules
5. **测试验证**: 确保所有功能正常，无 TypeScript 错误
6. **截图对比**: 使用无头浏览器截图验证效果

## 📝 注意事项

- 保持所有 `data-testid` 属性不变 (用于测试)
- 保持所有 `aria-*` 属性不变 (用于无障碍)
- 不要修改任何 async 函数调用
- 不要修改任何 props 接口
- 不要添加新的依赖包

## 🎯 成功标准

1. ✅ 视觉效果达到 2026 B2B SaaS 审美标准
2. ✅ 所有动画流畅 (60fps)
3. ✅ 响应式布局完美适配移动端和桌面端
4. ✅ 无 TypeScript 错误
5. ✅ 所有功能正常 (跟进、生成、重置)
6. ✅ 无头浏览器截图验证通过

---

**开始重构！记住：只许动皮，不许动骨！**
