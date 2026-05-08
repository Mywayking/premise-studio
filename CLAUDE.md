@AGENTS.md

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## 持续迭代策略

每次用户说"继续迭代"或类似指令时，自动执行以下闭环：

### 循环流程
1. `/health` — 跑 typecheck + lint，记录分数，阻止劣化
2. `/qa https://standup.alwayshaha.art --quick` — 浏览器跑关键流程，检查 console errors
3. 汇总发现 → 自行分类：
   - **lint/type 回归**：直接修，不确认
   - **P0/P1 bug**：直接修，commit
   - **P2 优化**：EnterPlanMode 确认后再修
   - **性能/架构**：提出建议，不自动重构
4. 修复后 `git push && build && pm2 restart` 上线
5. 汇报本轮：修了什么、为什么、lint 趋势、QA 得分

### 约束
- 单轮不打开超过 5 个文件
- 遇到 `set-state-in-effect` 不深入重构（已知技术债，独立处理）
- 不破坏现有功能
- 零 lint 回归
