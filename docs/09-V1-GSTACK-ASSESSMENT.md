# Premise Studio V1 — GStack 全栈评估报告

> 评估日期：2026-05-08
> 执行：gstack /health + /qa + /review
> 项目：premise-studio (Next.js 16.2 + Zustand + DeepSeek API)
> 部署：https://standup.alwayshaha.art

---

## 一、综合得分

| 维度 | 工具 | 得分 | 说明 |
|------|------|------|------|
| 代码健康 | /health | 7.3/10 | TypeScript 0 错误，eslint 10 err/7 warn，无测试 |
| 线上 QA | /qa | 83/100 | 核心流程正常，0 console 错误，2 个 P0 遗留 |
| 代码审查 | /review | 17 发现 | 2 HIGH, 9 MEDIUM, 6 LOW |

---

## 二、健康检查 (/health)

### 仪表盘

| 分类 | 工具 | 得分 | 状态 | 详情 |
|------|------|------|------|------|
| 类型检查 | tsc --noEmit | 10/10 | CLEAN | 0 errors |
| Lint | eslint | 4/10 | NEEDS WORK | 10 errors, 7 warnings |
| 测试 | — | SKIPPED | — | 无 test script |
| 死代码 | — | SKIPPED | — | knip 未安装 |
| Shell | — | SKIPPED | — | 无项目脚本 |

**综合得分：7.3/10**（权重重分配：typecheck 55% + lint 45%）

### Lint 错误明细

| 文件 | 行号 | 规则 | 问题 |
|------|------|------|------|
| Editor.tsx | 57 | react-hooks/set-state-in-effect | useEffect 内调 setState |
| CardTree.tsx | 28 | react-hooks/set-state-in-effect | useEffect 内调 setState |
| session/[id]/page.tsx | 55,185 | react-hooks/set-state-in-effect | useEffect 内调 setState (2处) |
| session/[id]/page.tsx | 61,71 | @next/next/no-html-link-for-pages | `<a>` 应改为 `<Link>` |
| useStreaming.ts | 98 | no-explicit-any | any 类型 |
| ai.ts | 8,43 | no-explicit-any | any 类型 (2处) |

7 个 Warning：4× exhaustive-deps, 3× unused-vars

---

## 三、线上 QA (/qa)

### 测试覆盖

| 页面 | 状态 | Console |
|------|------|---------|
| 首页 (/) | 正常 | 0 errors |
| Session 页 (/session/[id]) | 正常 | 0 errors |
| 移动端 (375×812) | 正常 | 0 errors |
| Demo 流程 | 正常 | 0 errors |

### 已验证功能

- 快速捕获：输入启用按钮，Enter 发送
- Demo：material → premise → angle → draft 完整流程
- 三栏布局 + 面板切换
- Card Tree：点击切换节点，AI Action 联动
- Editor：内容编辑、自动保存、"已自动保存"时间戳
- ActionPanel：按 card type 显示不同 action
- Session 菜单：重命名 + 删除 + 确认
- Card 三点菜单：重命名 + 删除 + 子节点警告
- 移动端：drawer 系统 + 汉堡按钮 + 遮罩
- HTTP 200 全页面，0 console errors

### 遗留问题

| ID | 严重度 | 描述 | 位置 |
|----|--------|------|------|
| QA-001 | HIGH | 行标注 select 在移动端不可见（opacity-0 依赖 hover） | Editor.tsx:127 |
| QA-002 | HIGH | AI 返回 JSON 不解析，树标题显示 raw JSON | useStreaming.ts:88-89, CardTree.tsx:108 |
| QA-003 | MEDIUM | Session.rootCardId 指向不存在卡片 | sessionStore.ts:27, page.tsx:17-18 |
| QA-004 | MEDIUM | 无测试套件 | package.json |

### P0 遗留（来自 UI Review，未在本次 QA 复现验证）

- AI 返回 JSON 直接展示（依赖 DeepSeek API 调用才能复现）
- 行标注移动端不可用（opacity-0 + group-hover 在触摸屏无效）

---

## 四、代码审查 (/review)

### 按严重度分类

#### HIGH (2项)

| ID | 分类 | 描述 | 文件:行号 |
|----|------|------|-----------|
| R-01 | LLM边界 | 客户端 SSE 缺少行缓冲，网络分片导致 token 丢失 | useStreaming.ts:77-93 |
| R-07 | 安全 | 服务端错误消息直接注入 SSE，可泄露内部信息或注入事件 | ai.ts:44 |

#### MEDIUM (9项)

| ID | 分类 | 描述 | 文件:行号 |
|----|------|------|-----------|
| R-02 | 状态 | session ↔ card 跨 store 无完整性校验 | sessionStore.ts + cardTreeStore.ts |
| R-03 | 状态 | restoreFromJSON 取任意 key 作为 currentNodeId | cardTreeStore.ts:141-143 |
| R-04 | LLM边界 | AI JSON 无 schema 校验，解析失败静默丢弃 | useStreaming.ts:84-92 |
| R-05 | 错误处理 | input-understanding API 不读取请求体，功能无效 | route.ts:3-5 |
| R-06 | 竞态 | 闭包中的 streamingState 可能过时，允许并发流 | useStreaming.ts:55-56 |
| R-08 | 错误处理 | 无 ErrorBoundary，运行时错误导致白屏 | 所有组件 |
| R-09 | 错误处理 | 网络中断时部分内容被错误写入父卡片 | useStreaming.ts:98-103 |
| R-10 | 状态 | 所有 session 共享一个 card 池，无隔离 | cardTreeStore.ts |

#### LOW (6项)

| ID | 分类 | 描述 |
|----|------|------|
| R-11 | 状态 | appendChild 和 branchNode 代码重复 |
| R-12 | 性能 | triggerAction 订阅整个 cards 对象 |
| R-13 | 存储 | localStorage 无配额管理 |
| R-14 | 性能 | CardTree 全量重渲染 |
| R-15 | 性能 | streaming buffer 无 memoization |
| R-16 | 安全 | env.ts 缺少 server-only 保护 |
| R-17 | 安全 | API routes 无鉴权/限流 |

---

## 五、优化建议（按优先级排序）

### P0 — 阻断核心功能

1. **解析 AI 返回 JSON** (QA-002)
   - 在 `useStreaming.ts` 完成流式收集后，对 premise/angle 响应调用 JSON.parse
   - 将数组拆成多张独立子卡片
   - 卡片标题用 statement/description 前 30 字，而非 raw JSON

2. **修复行标注移动端** (QA-001)
   - 移除 `opacity-0 group-hover:opacity-100`，改为始终可见或使用 `focus-within`
   - 或者移动端用 popover/tap-to-select 替代 hover

### P1 — 数据安全与可靠性

3. **客户端 SSE 行缓冲** (R-01) — 大文件，15 分钟，Completeness 10/10
   - `useStreaming.ts:81` 添加缓冲区逻辑，与 `ai.ts:30` 一致
   - 修复后网络环境下的流式输出不再丢失 token

4. **SSE 错误消息消毒** (R-07) — 1 行，2 分钟，Completeness 8/10
   - `ai.ts:44`: `err.message` → JSON.stringify 或固定消息+引用码

5. **添加 ErrorBoundary** (R-08) — 新文件，15 分钟，Completeness 7/10
   - 在 layout.tsx 包装 `children`
   - 在 session page 的 editor/actionPanel 区域单独包裹

6. **修复 input-understanding API** (R-05) — 5 行，5 分钟
   - 添加 `req: NextRequest` 参数，解析 `body.content`，注入 prompt

### P2 — 质量工程

7. **添加测试框架** (QA-004)
   - `npm install -D vitest @testing-library/react`
   - 至少覆盖：cardTreeStore 核心方法、useStreaming 状态转换、Editor 渲染

8. **修复 10 lint errors** (Health)
   - 4× set-state-in-effect → 改用 key 重置或 derived state
   - 3× no-explicit-any → 定义具体类型
   - 2× `<a>` → `<Link>`
   - 7 warnings 顺手修复

9. **并发流保护** (R-06)
   - `useStreaming.ts` guard 内用 `useStreamingStore.getState().state` 替代闭包中的 `st`

### P3 — 产品化

10. **Session-card 隔离** (R-10) — 为 Card 添加 sessionId 字段
11. **API 限流** — 中间件添加 IP-based token bucket
12. **localStorage 配额管理** — persist middleware 捕获 QuotaExceededError
13. **CardTree 性能优化** — React.memo + selector 细化

---

## 六、已完成项确认

以下 P1 中等优化（来自 docs/08-V1-UI-UX-REVIEW.md）已全部实现：

- [x] Session 重命名 + 删除（含确认弹窗）
- [x] Card 重命名 + 删除（含子节点计数警告）
- [x] AI 请求即时视觉反馈（按钮 spinner + 编辑器徽章）
- [x] 保存按钮 → 自动保存 + 时间戳
- [x] 空状态引导 + 试试示例

---

## 七、总体评价

**STATUS: DONE_WITH_CONCERNS**

Premise Studio V1 的核心创作流程完整可用。三栏布局、流式 AI、session/card 管理、移动端适配、持久化均已交付。首页到 session 页的 demo 流程零错误。

当前不阻塞上线的关键风险：
1. 流式输出在网络波动下可能丢 token（R-01）
2. 无测试覆盖，任何改动都是盲飞（QA-004）
3. 运行时 JS 错误会导致全白屏（R-08）
4. 行标注在手机上完全不可用（QA-001，移动端用户受影响）

建议：修复 P0 + P1 后上线，P2/P3 在后续迭代中逐步完成。

---

## 八、交付物清单

| 文件 | 描述 |
|------|------|
| `.gstack/qa-reports/qa-report-standup-alwayshaha-art-2026-05-08.md` | QA 测试报告 |
| `docs/09-V1-GSTACK-ASSESSMENT.md` | 本评估报告 |
| `~/.gstack/projects/*/health-history.jsonl` | 健康检查历史 |
| CLAUDE.md | 已添加 gstack routing rules |

---

*评估由 GStack (/health + /qa + /review) 自动执行，2026-05-08*
