# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

RSSHub 是一个开源、易于使用、可扩展的 RSS 生成器。它能够从几乎所有内容生成 RSS 订阅源。这个项目使用 TypeScript 编写，基于 Hono 框架构建。

## 开发命令

### 基础开发
- `npm run dev` - 开发模式启动服务，支持热重载
- `npm run dev:cache` - 生产模式但带缓存监听启动
- `npm start` - 生产模式启动服务

### 构建相关
- `npm run build` - 构建路由（执行 `scripts/workflow/build-routes.ts`）
- `npm run build:docs` - 构建文档

### 代码质量
- `npm run format` - 格式化代码和修复 ESLint 问题
- `npm run format:check` - 检查代码格式和 ESLint 问题
- `npm run lint` - 仅运行 ESLint 检查

### 测试
- `npm test` - 运行格式检查和测试覆盖率
- `npm run vitest` - 运行测试
- `npm run vitest:watch` - 监视模式运行测试
- `npm run vitest:coverage` - 运行测试并生成覆盖率报告
- `npm run vitest:fullroutes` - 对所有路由进行完整测试

### 性能分析
- `npm run profiling` - 启动性能分析模式

## 架构设计

### 核心架构
1. **应用入口**：`lib/index.ts` 启动服务器，`lib/app.tsx` 配置 Hono 应用和中间件
2. **路由系统**：`lib/registry.ts` 负责动态路由注册，支持开发时自动发现和生产时预构建
3. **配置管理**：`lib/config.ts` 集中管理所有配置，包括环境变量和第三方服务配置

### 路由结构
- 路由存放在 `lib/routes/` 目录下，按命名空间组织
- 每个命名空间目录包含 `namespace.ts`（定义命名空间）和多个路由文件
- 路由文件导出包含 `path`、`handler` 等属性的对象
- 生产环境使用预构建的 `assets/build/routes.json`

### 中间件系统
应用使用了多个中间件（按顺序）：
- 压缩中间件
- 日志中间件
- Sentry 错误监控
- 访问控制
- 调试中间件
- 模板中间件
- 响应头中间件
- 防盗链中间件
- 参数处理中间件
- 缓存中间件

### 配置系统
- 配置通过环境变量管理，支持本地 `.env` 文件
- 包含大量第三方服务的 API 配置（如 Twitter、YouTube、Bilibili 等）
- 支持远程配置加载（`REMOTE_CONFIG` 环境变量）

## 开发注意事项

### 路由开发
- 新路由应该添加到适当的命名空间目录下
- 路由文件需要导出 `Route` 类型的对象
- 支持多路径路由（`path` 可以是数组）
- 可以添加 `categories`、`maintainers`、`radar` 等元数据

### 环境配置
- 开发时创建 `.env` 文件配置必要的环境变量
- 生产环境配置通过环境变量或远程配置
- 关键配置包括：端口、缓存类型、代理设置、第三方服务密钥等

### 构建部署
- 生产环境需要先运行 `npm run build` 构建路由
- 支持 Docker 部署（参考 `docker-compose.yml`）
- 集群模式通过 `ENABLE_CLUSTER` 环境变量启用

### 测试
- 使用 Vitest 进行测试
- 新功能应该包含相应的测试
- 支持对路由进行完整测试（`vitest:fullroutes`）