# Premise Studio - Workflow Engine

## 核心概念

整个系统围绕：

Session + Card Tree

展开。

## Card Types

- material
- premise
- angle
- draft
- rewrite

## Workflow 主链路

输入素材
→ 输入理解
→ 提炼前提
→ 选择前提
→ 找角度
→ 选择角度
→ 生成草稿
→ 改稿
→ 保存历史
→ 刷新恢复

## Node Action System

### material
- 提炼前提
- 提取情绪
- 提取冲突

### premise
- 找角度
- 加强攻击性
- 更荒诞
- 更真实

### angle
- 生成草稿
- 增加细节
- 增强情绪

### draft
- 改稿
- 缩短
- callback
- 更口语化

### rewrite
- 再改稿
- 比较版本
- 分支创作

## Tree Structure

素材
 ├── 前提 A
 │     ├── 角度 A1
 │     │      ├── 草稿 v1
 │     │      └── 草稿 v2
 │
 │     └── 角度 A2
 │
 └── 前提 B
