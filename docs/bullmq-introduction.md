# BullMQ 入门指南

> 基于 Redis 的强大任务队列系统完整教程

## 目录

- [什么是任务队列？](#什么是任务队列)
- [BullMQ 简介](#bullmq-简介)
- [为什么选择 BullMQ？](#为什么选择-bullmq)
- [核心概念](#核心概念)
- [本地安装和配置](#本地安装和配置)
- [最小可运行示例](#最小可运行示例)
- [在 AI 资讯项目中的应用](#在-ai-资讯项目中的应用)
- [常见问题](#常见问题)
- [下一步学习](#下一步学习)

---

## 什么是任务队列？

### 现实世界类比

想象你在一家繁忙的餐厅：

```
顾客点餐（生产者）
    ↓
订单贴在厨房墙上（队列）
    ↓
厨师按顺序做菜（消费者/Worker）
    ↓
完成后撕掉订单（任务完成）

如果厨师忙不过来：
✓ 订单会堆积在墙上（任务排队等待）
✓ 可以增加厨师（增加 Worker 数量）
✓ VIP 订单可以优先做（任务优先级）
✓ 做坏了可以重做（任务重试）
```

### 软件中的任务队列

**任务队列**是一种异步处理模式：

```typescript
// ❌ 同步处理（阻塞）
async function handleUserRequest(req, res) {
  const data = await fetchData();       // 等待 2 秒
  await processData(data);              // 等待 5 秒
  await sendEmail();                    // 等待 3 秒
  res.send('Done');                     // 用户等了 10 秒！
}

// ✅ 异步处理（非阻塞）
async function handleUserRequest(req, res) {
  const data = await fetchData();       // 等待 2 秒

  // 将耗时任务加入队列
  await taskQueue.add('process', { data });
  await taskQueue.add('email', { to: user.email });

  res.send('Processing...');            // 用户只等了 2 秒
  // 后台慢慢处理其他任务
}
```

### 任务队列的核心价值

1. **提升用户体验**
   - 快速响应，不阻塞请求
   - 用户不需要等待耗时操作

2. **解耦系统**
   - API 服务和处理逻辑分离
   - 可以独立扩展和部署

3. **削峰填谷**
   - 处理突发流量
   - 控制资源使用

4. **提高可靠性**
   - 任务失败自动重试
   - 持久化防止数据丢失

---

## BullMQ 简介

### 什么是 BullMQ？

**BullMQ** 是一个基于 Redis 的**企业级任务队列管理系统**，它提供：

- 任务的添加、处理、重试、延迟、优先级等完整生命周期管理
- 强大的监控和可视化能力
- 高性能和可扩展性

**一句话总结**：BullMQ 让你能够轻松地将耗时任务放到后台异步处理。

### BullMQ 与 Redis 的关系

```
┌─────────────────────────────────────────────┐
│              BullMQ (上层框架)               │
│  提供：队列管理、任务调度、重试、优先级...    │
└─────────────────┬───────────────────────────┘
                  │ 使用
┌─────────────────▼───────────────────────────┐
│              Redis (底层存储)                │
│  提供：List、Hash 等数据结构                 │
└─────────────────────────────────────────────┘
```

**类比**：

- **Redis** = 数据库引擎（MySQL）
- **BullMQ** = ORM 框架（Prisma）

你可以直接用 Redis List 做队列，但 BullMQ 帮你处理了所有复杂的逻辑。

### BullMQ 的核心特性

1. **任务管理**
   - 任务添加、暂停、恢复、删除
   - 任务优先级和延迟执行
   - 任务依赖和流程编排

2. **可靠性**
   - 自动重试机制（指数退避）
   - 任务超时检测
   - 失败任务的错误处理

3. **性能**
   - 高并发处理能力
   - 限流控制
   - 批量操作优化

4. **监控**
   - 实时任务状态跟踪
   - 详细的事件系统
   - 与 Bull Board 集成（可视化面板）

---

## 为什么选择 BullMQ？

### 方案对比：数据库轮询 vs BullMQ

#### 方案 A：使用 MySQL 做任务队列（不推荐）

```typescript
// ❌ 数据库轮询方案
// 1. 创建任务表
CREATE TABLE tasks (
  id INT PRIMARY KEY,
  type VARCHAR(50),
  data JSON,
  status ENUM('pending', 'processing', 'completed', 'failed'),
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP
);

// 2. 生产者：添加任务
async function addTask(type: string, data: any) {
  await mysql.query(
    "INSERT INTO tasks (type, data, status) VALUES (?, ?, 'pending')",
    [type, JSON.stringify(data)]
  );
}

// 3. 消费者：轮询处理
setInterval(async () => {
  // 每秒查询一次数据库
  const tasks = await mysql.query(`
    SELECT * FROM tasks
    WHERE status = 'pending'
    LIMIT 10
    FOR UPDATE  -- 锁定行，防止重复处理
  `);

  for (const task of tasks) {
    try {
      // 更新为处理中
      await mysql.query(
        "UPDATE tasks SET status = 'processing' WHERE id = ?",
        task.id
      );

      // 处理任务
      await processTask(task);

      // 更新为完成
      await mysql.query(
        "UPDATE tasks SET status = 'completed' WHERE id = ?",
        task.id
      );
    } catch (error) {
      // 失败处理
      await mysql.query(`
        UPDATE tasks
        SET status = 'failed', retry_count = retry_count + 1
        WHERE id = ?
      `, task.id);
    }
  }
}, 1000); // 每秒轮询

// 问题：
// 1. 频繁查询数据库，增加负载
// 2. 轮询间隔导致延迟（最少 1 秒）
// 3. 分布式环境下需要复杂的锁机制
// 4. 重试逻辑需要自己实现
// 5. 无法优雅地处理任务优先级
// 6. 扩展性差（数据库成为瓶颈）
```

#### 方案 B：使用 BullMQ（推荐）

```typescript
// ✅ BullMQ 方案
import { Queue, Worker } from 'bullmq';

// 1. 创建队列（生产者）
const taskQueue = new Queue('tasks', {
  connection: { host: 'localhost', port: 6379 }
});

// 2. 添加任务（毫秒级响应）
await taskQueue.add('process-ai',
  { newsId: '123', title: 'Breaking news' },
  {
    attempts: 3,        // 失败自动重试 3 次
    backoff: {
      type: 'exponential',
      delay: 2000       // 重试延迟：2s, 4s, 8s
    },
    priority: 1,        // 优先级（数字越小越优先）
    delay: 5000,        // 延迟 5 秒后执行
    removeOnComplete: {
      age: 3600,        // 1 小时后删除已完成任务
      count: 1000       // 最多保留 1000 个
    }
  }
);

// 3. 创建 Worker（消费者）
const worker = new Worker('tasks',
  async (job) => {
    console.log(`处理任务 ${job.id}:`, job.data);

    // 更新进度
    await job.updateProgress(50);

    // 处理任务
    const result = await processTask(job.data);

    await job.updateProgress(100);

    return result; // 自动标记为完成
  },
  {
    connection: { host: 'localhost', port: 6379 },
    concurrency: 5,   // 同时处理 5 个任务
    limiter: {
      max: 100,       // 每 10 秒最多处理 100 个任务
      duration: 10000
    }
  }
);

// 4. 事件监听
worker.on('completed', (job, result) => {
  console.log(`✅ 任务 ${job.id} 完成:`, result);
});

worker.on('failed', (job, error) => {
  console.error(`❌ 任务 ${job?.id} 失败:`, error.message);
});

// 优势：
// 1. 实时响应（毫秒级，无轮询延迟）
// 2. 数据库负载低（只存储最终结果）
// 3. 内置并发控制和分布式锁
// 4. 重试、优先级、延迟开箱即用
// 5. 水平扩展容易（加 Worker 即可）
// 6. Redis 高性能（内存操作）
```

### 性能对比

| 维度 | 数据库轮询 | BullMQ |
|------|-----------|--------|
| **响应速度** | 1000ms (轮询间隔) | <10ms (实时) |
| **数据库负载** | 高（每秒查询 N 次） | 低（只存结果） |
| **并发控制** | 需要手动加锁 | 内置支持 |
| **重试机制** | 手动实现 | 内置支持 |
| **任务优先级** | 复杂（需要额外字段和索引） | 内置支持 |
| **延迟任务** | 需要定时任务 + 复杂查询 | 内置支持 |
| **扩展性** | 难（数据库瓶颈） | 易（加 Worker） |
| **监控** | 需要自己实现 | 丰富的事件和指标 |

### 适用场景

**✅ 适合使用 BullMQ 的场景**：

- 异步任务处理（发邮件、生成报告、**AI 处理**）
- 高并发场景（秒杀、抢票、批量导入）
- 定时任务（定时推送、数据同步）
- 需要重试机制的操作（调用外部 API）
- 需要任务优先级的场景（VIP 用户优先）

**❌ 不适合使用 BullMQ 的场景**：

- 简单的 CRUD 操作（直接用数据库）
- 实时性要求极高的操作（<1ms，用内存队列）
- 不需要持久化的临时任务（用 setTimeout）
- 任务量很小的场景（每天几个，不值得引入复杂度）

---

## 核心概念

### 架构图

```
┌──────────────────────────────────────────────────────────┐
│                    你的应用                                │
│                                                           │
│  ┌─────────┐         ┌──────┐         ┌────────┐        │
│  │ Producer│─add─>   │Queue │  <─fetch│ Worker │        │
│  │ (生产者) │         │(队列) │         │(工作者) │        │
│  └─────────┘         └──┬───┘         └───┬────┘        │
│                         │                  │             │
└─────────────────────────┼──────────────────┼─────────────┘
                          │                  │
                    存储在 Redis             │
                          │                  │
                    ┌─────▼──────────────────▼────┐
                    │      Redis Server           │
                    │  - 队列数据（List）          │
                    │  - 任务数据（Hash）          │
                    │  - 状态数据（String/Set）    │
                    └─────────────────────────────┘
```

### 核心组件

#### 1. Queue（队列）

**作用**：任务的入口，负责接收和管理任务

```typescript
import { Queue } from 'bullmq';

const myQueue = new Queue('my-queue', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

// 添加任务
await myQueue.add('task-name',
  { data: 'task data' },  // 任务数据
  {
    priority: 1,           // 配置选项
    delay: 1000
  }
);
```

**常用操作**：

```typescript
// 获取队列统计
const counts = await myQueue.getJobCounts();
// { waiting: 10, active: 2, completed: 100, failed: 5 }

// 暂停队列
await myQueue.pause();

// 恢复队列
await myQueue.resume();

// 清空队列
await myQueue.drain(); // 删除所有等待的任务
await myQueue.clean(0, 1000, 'completed'); // 清理已完成的任务
```

#### 2. Worker（工作者）

**作用**：从队列中取出任务并处理

```typescript
import { Worker } from 'bullmq';

const worker = new Worker('my-queue',
  async (job) => {
    // 处理任务的逻辑
    console.log('处理任务:', job.data);

    // 更新进度
    await job.updateProgress(50);

    // 执行业务逻辑
    const result = await doSomething(job.data);

    await job.updateProgress(100);

    // 返回结果
    return result;
  },
  {
    connection: { host: 'localhost', port: 6379 },
    concurrency: 5,  // 同时处理 5 个任务
  }
);

// 事件监听
worker.on('completed', (job, result) => {
  console.log(`任务 ${job.id} 完成`);
});

worker.on('failed', (job, error) => {
  console.error(`任务 ${job?.id} 失败:`, error);
});
```

**重要配置**：

```typescript
const worker = new Worker('queue-name', processor, {
  concurrency: 5,        // 并发数（同时处理多少任务）

  limiter: {
    max: 10,            // 限流：每 duration 最多处理 max 个任务
    duration: 1000,     // 时间窗口（毫秒）
  },

  settings: {
    lockDuration: 30000,  // 任务锁定时间（防止重复处理）
    maxStalledCount: 3,   // 最大卡住次数
  },
});
```

#### 3. Job（任务）

**作用**：代表队列中的一个具体任务

```typescript
// 在 Worker 中，job 对象提供了很多有用的方法
const worker = new Worker('queue', async (job) => {
  // 任务信息
  console.log(job.id);          // 任务 ID
  console.log(job.name);        // 任务名称
  console.log(job.data);        // 任务数据
  console.log(job.attemptsMade); // 已重试次数

  // 更新进度（前端可以轮询查询）
  await job.updateProgress(25);
  await doStep1();

  await job.updateProgress(50);
  await doStep2();

  await job.updateProgress(75);
  await doStep3();

  await job.updateProgress(100);

  // 添加日志
  await job.log('完成了某个重要步骤');

  return { success: true };
});
```

**任务状态流转**：

```
pending → active → completed ✓
    │       │
    │       └──> failed → pending (重试)
    │                 │
    └─────────────────└──> failed (最终失败)
```

#### 4. Events（事件）

BullMQ 提供了丰富的事件系统：

```typescript
// Queue 事件
myQueue.on('waiting', (job) => {
  console.log(`任务 ${job.id} 加入队列`);
});

// Worker 事件
worker.on('active', (job) => {
  console.log(`开始处理任务 ${job.id}`);
});

worker.on('completed', (job, result) => {
  console.log(`任务 ${job.id} 完成:`, result);
});

worker.on('failed', (job, error) => {
  console.error(`任务 ${job?.id} 失败:`, error.message);
});

worker.on('progress', (job, progress) => {
  console.log(`任务 ${job.id} 进度: ${progress}%`);
});

worker.on('error', (error) => {
  console.error('Worker 错误:', error);
});
```

---

## 本地安装和配置

### 前置条件

1. **Redis 已安装并运行**

```bash
# 检查 Redis 是否运行
redis-cli ping
# 应该返回：PONG

# 如果没有安装，参考 Redis 入门指南
brew install redis
brew services start redis
```

### 安装 Node.js 依赖

```bash
# 进入项目目录
cd your-project

# 安装 BullMQ 和 Redis 客户端
pnpm add bullmq ioredis

# 安装类型定义
pnpm add -D @types/node
```

### 项目结构建议

```
your-project/
├── src/
│   ├── queues/
│   │   ├── config.ts        # Redis 连接配置
│   │   ├── my-queue.ts      # 队列定义
│   │   └── workers/
│   │       └── my-worker.ts # Worker 实现
│   ├── api/
│   │   └── tasks.ts         # API 路由（添加任务）
│   └── index.ts
└── package.json
```

---

## 最小可运行示例

### 完整示例代码

创建文件 `test-bullmq.ts`：

```typescript
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// 1. 配置 Redis 连接
const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // BullMQ 要求
});

// 2. 创建队列（生产者）
const testQueue = new Queue('test-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,              // 失败重试 3 次
    backoff: {
      type: 'exponential',    // 指数退避
      delay: 2000,            // 初始延迟 2 秒
    },
    removeOnComplete: {
      age: 3600,              // 1 小时后删除
      count: 1000,            // 最多保留 1000 个
    },
  },
});

// 3. 创建 Worker（消费者）
const worker = new Worker(
  'test-queue',
  async (job: Job) => {
    console.log(`\n[Worker] 开始处理任务 ${job.id}`);
    console.log(`[Worker] 任务数据:`, job.data);
    console.log(`[Worker] 重试次数: ${job.attemptsMade}`);

    // 模拟处理步骤
    await job.updateProgress(25);
    console.log(`[Worker] 进度: 25%`);
    await sleep(500);

    await job.updateProgress(50);
    console.log(`[Worker] 进度: 50%`);
    await sleep(500);

    // 模拟随机失败（用于测试重试）
    if (job.data.shouldFail && job.attemptsMade === 0) {
      throw new Error('模拟失败，将自动重试');
    }

    await job.updateProgress(75);
    console.log(`[Worker] 进度: 75%`);
    await sleep(500);

    await job.updateProgress(100);
    console.log(`[Worker] 任务 ${job.id} 完成`);

    return {
      success: true,
      processedAt: new Date().toISOString(),
      data: job.data
    };
  },
  {
    connection,
    concurrency: 2,  // 同时处理 2 个任务
    limiter: {
      max: 5,        // 每 10 秒最多处理 5 个任务
      duration: 10000,
    },
  }
);

// 4. 事件监听
worker.on('active', (job) => {
  console.log(`✨ 任务 ${job.id} 开始处理`);
});

worker.on('completed', (job, result) => {
  console.log(`✅ 任务 ${job.id} 成功完成`);
  console.log(`   结果:`, result);
});

worker.on('failed', (job, error) => {
  console.error(`❌ 任务 ${job?.id} 失败: ${error.message}`);
  if (job && job.attemptsMade < job.opts.attempts!) {
    console.log(`   将在 ${2 ** job.attemptsMade * 2} 秒后重试`);
  }
});

worker.on('progress', (job, progress) => {
  console.log(`📊 任务 ${job.id} 进度: ${progress}%`);
});

worker.on('error', (error) => {
  console.error('❌ Worker 错误:', error);
});

// 5. 添加测试任务
async function addTestJobs() {
  console.log('='.repeat(50));
  console.log('开始添加测试任务');
  console.log('='.repeat(50));

  // 普通任务
  for (let i = 1; i <= 3; i++) {
    const job = await testQueue.add('normal-task', {
      index: i,
      message: `这是第 ${i} 个普通任务`,
      shouldFail: false,
    });
    console.log(`➕ 添加任务 ${job.id} (index: ${i})`);
  }

  // 高优先级任务
  const priorityJob = await testQueue.add(
    'priority-task',
    { message: '这是高优先级任务' },
    { priority: 1 }  // 数字越小优先级越高
  );
  console.log(`⭐ 添加高优先级任务 ${priorityJob.id}`);

  // 延迟任务
  const delayedJob = await testQueue.add(
    'delayed-task',
    { message: '这是延迟任务' },
    { delay: 3000 }  // 3 秒后执行
  );
  console.log(`⏰ 添加延迟任务 ${delayedJob.id} (3 秒后执行)`);

  // 会失败的任务（用于测试重试）
  const failJob = await testQueue.add('fail-task', {
    message: '这是会失败的任务',
    shouldFail: true,
  });
  console.log(`💣 添加会失败的任务 ${failJob.id} (将自动重试)`);

  console.log('\n所有任务已添加，Worker 开始处理...\n');
}

// 6. 查询队列状态
async function printQueueStats() {
  const counts = await testQueue.getJobCounts();
  console.log('\n' + '='.repeat(50));
  console.log('队列统计:');
  console.log(`  等待中: ${counts.waiting}`);
  console.log(`  处理中: ${counts.active}`);
  console.log(`  已完成: ${counts.completed}`);
  console.log(`  已失败: ${counts.failed}`);
  console.log(`  延迟中: ${counts.delayed}`);
  console.log('='.repeat(50));
}

// 7. 工具函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 8. 优雅关闭
async function gracefulShutdown() {
  console.log('\n正在关闭...');

  await printQueueStats();

  await worker.close();
  await testQueue.close();
  await connection.quit();

  console.log('已关闭所有连接');
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// 9. 运行测试
async function main() {
  try {
    // 清空旧数据
    await testQueue.drain();
    await testQueue.clean(0, 1000, 'completed');
    await testQueue.clean(0, 1000, 'failed');

    // 添加任务
    await addTestJobs();

    // 10 秒后打印统计并关闭
    setTimeout(async () => {
      await gracefulShutdown();
    }, 10000);

  } catch (error) {
    console.error('运行失败:', error);
    process.exit(1);
  }
}

main();
```

### 运行示例

```bash
# 确保 Redis 正在运行
redis-cli ping

# 运行测试
npx tsx test-bullmq.ts
```

### 期望输出

```
==================================================
开始添加测试任务
==================================================
➕ 添加任务 1 (index: 1)
➕ 添加任务 2 (index: 2)
➕ 添加任务 3 (index: 3)
⭐ 添加高优先级任务 4
⏰ 添加延迟任务 5 (3 秒后执行)
💣 添加会失败的任务 6 (将自动重试)

所有任务已添加,Worker 开始处理...

✨ 任务 4 开始处理 (高优先级先执行)
[Worker] 开始处理任务 4
[Worker] 任务数据: { message: '这是高优先级任务' }
📊 任务 4 进度: 25%
[Worker] 进度: 25%
📊 任务 4 进度: 50%
[Worker] 进度: 50%
📊 任务 4 进度: 75%
[Worker] 进度: 75%
📊 任务 4 进度: 100%
[Worker] 任务 4 完成
✅ 任务 4 成功完成

✨ 任务 1 开始处理
[Worker] 开始处理任务 1
...
❌ 任务 6 失败: 模拟失败，将自动重试
   将在 2 秒后重试
...
✅ 任务 6 成功完成 (第 2 次尝试成功)

==================================================
队列统计:
  等待中: 0
  处理中: 0
  已完成: 6
  已失败: 0
  延迟中: 0
==================================================
```

---

## 在 AI 资讯项目中的应用

### 业务流程

你的 AI 资讯聚合项目的完整流程：

```
┌─────────────────────────────────────────────────────────┐
│ 1. 用户访问首页                                          │
│    GET /api/aggregate                                   │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. API Route 处理                                        │
│    ├─ 并行获取三个数据源（Reddit、HN、arXiv）            │
│    ├─ 查询 MySQL：获取已有的 AI 缓存                     │
│    ├─ 合并数据                                           │
│    ├─ 立即返回给用户（不等 AI）                          │
│    └─ 将未处理的任务加入 BullMQ 队列                     │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. BullMQ 队列 (存储在 Redis)                            │
│    ├─ 任务 1: 翻译新闻 ID-123                            │
│    ├─ 任务 2: 翻译新闻 ID-124                            │
│    ├─ 任务 3: 翻译新闻 ID-125                            │
│    └─ ...                                               │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. BullMQ Worker (后台进程)                              │
│    ├─ 并发处理 2-3 个任务                                │
│    ├─ 调用 Ollama 本地模型                              │
│    ├─ 生成中文标题 + 摘要                                │
│    ├─ 失败自动重试 3 次                                  │
│    └─ 存储到 MySQL                                      │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. 前端轮询/SSE 更新                                     │
│    ├─ 定期查询 AI 任务状态                               │
│    └─ 动态更新页面内容                                   │
└─────────────────────────────────────────────────────────┘
```

### 技术映射

| PRD 中的概念 | 对应技术 | 作用 |
|-------------|---------|------|
| **任务队列** | BullMQ Queue | 管理待处理的新闻条目 |
| **后台 Worker** | BullMQ Worker | 异步调用 Ollama AI |
| **任务状态** | Redis + MySQL | Redis 缓存热数据，MySQL 持久化 |
| **重试机制** | BullMQ 内置 | AI 调用失败自动重试 |
| **并发控制** | Worker concurrency | 同时处理 2-3 个任务 |

### 为什么这个架构适合你的项目？

#### 1. 用户体验优先

```typescript
// 用户请求流程
用户访问首页
  ↓ (立即返回，< 2 秒)
看到原始英文资讯
  ↓ (后台异步处理)
AI 任务在队列中处理
  ↓ (轮询更新，5-10 秒)
看到中文翻译和摘要
```

**关键点**：
- 首屏加载快（不等 AI）
- AI 内容异步加载（用户无感知）
- 降级展示（AI 失败仍能看原文）

#### 2. 资源利用最优

```typescript
// Ollama 本地模型的限制
单个任务处理时间: 5 秒
并发能力: 2-3 个任务（取决于硬件）
CPU/内存占用: 较高

// BullMQ 的解决方案
const worker = new Worker('ai-queue', processor, {
  concurrency: 2,  // 🔥 限制并发，防止 Ollama 过载
  limiter: {
    max: 20,       // 每分钟最多 20 个（保护资源）
    duration: 60000,
  },
});
```

#### 3. 成本控制

```typescript
// 数据库缓存避免重复调用
async function processNews(newsId: string) {
  // 1. 检查 MySQL 缓存
  const cached = await prisma.aiEnhancedContent.findUnique({
    where: { id: newsId }
  });

  if (cached?.status === 'completed') {
    return cached; // 命中缓存，不调用 AI
  }

  // 2. 没有缓存才加入队列
  await aiQueue.add('translate', { newsId });
}

// 效果：
// 热门新闻被查看 1000 次 → AI 只处理 1 次
// 节省算力 99.9%
```

#### 4. 容错性

```typescript
// 多层容错机制
{
  attempts: 3,              // 失败重试 3 次
  backoff: {
    type: 'exponential',    // 指数退避（2s, 4s, 8s）
    delay: 2000
  },
  timeout: 120000,          // 120 秒超时
  removeOnFail: {
    age: 86400              // 失败任务保留 24 小时（便于排查）
  }
}

// 前端降级展示
if (aiStatus === 'failed') {
  // 仍然显示原始英文内容
  return <NewsCard title={originalTitle} />;
}
```

### 实际配置示例

#### 队列配置（src/lib/ai/queue.ts）

```typescript
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

export const aiQueue = new Queue('ai-translation-queue', {
  connection,
  defaultJobOptions: {
    attempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3'),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.AI_RETRY_DELAY || '2000'),
    },
    timeout: parseInt(process.env.AI_JOB_TIMEOUT || '120000'),
    removeOnComplete: {
      age: 3600,  // 1 小时后删除
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // 24 小时后删除失败任务
    },
  },
});
```

#### Worker 配置（src/lib/ai/worker.ts）

```typescript
import { Worker } from 'bullmq';
import { ollama } from './ollama-client';
import { updateAiContent } from '../db/ai-content';

const worker = new Worker(
  'ai-translation-queue',
  async (job) => {
    const { newsItem } = job.data;

    // 1. 更新状态
    await updateAiContent(newsItem.id, { status: 'processing' });

    // 2. 调用 Ollama
    const response = await ollama.chat({
      model: 'qwen2.5:7b',
      messages: [
        { role: 'system', content: TRANSLATION_PROMPT },
        { role: 'user', content: buildPrompt(newsItem) },
      ],
    });

    // 3. 存储结果
    await updateAiContent(newsItem.id, {
      translatedTitle: result.translatedTitle,
      aiSummary: result.summary,
      status: 'completed',
    });

    return { success: true };
  },
  {
    connection,
    concurrency: parseInt(process.env.AI_WORKER_CONCURRENCY || '2'),
    limiter: {
      max: 10,  // 每分钟最多 10 个
      duration: 60000,
    },
  }
);

export { worker };
```

#### 环境变量配置

```.env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# 任务队列配置
AI_WORKER_CONCURRENCY=2       # Worker 并发数
AI_RETRY_ATTEMPTS=3           # 重试次数
AI_RETRY_DELAY=2000           # 重试延迟 (ms)
AI_JOB_TIMEOUT=120000         # 任务超时 (ms)
```

---

## 常见问题

### Q1: BullMQ 的任务数据存储在哪里？

**A**: 存储在 Redis 中，使用多种数据结构：

- **List**：存储待处理任务的 ID
- **Hash**：存储任务的详细数据
- **Sorted Set**：存储延迟任务和优先级队列

**查看方法**：

```bash
# 进入 Redis CLI
redis-cli

# 查看所有键
127.0.0.1:6379> KEYS *

# 你会看到类似的键
bull:my-queue:wait         # 等待队列
bull:my-queue:active       # 活动任务
bull:my-queue:completed    # 完成的任务
bull:my-queue:failed       # 失败的任务
bull:my-queue:123          # 任务 123 的数据
```

### Q2: 如何监控任务队列的状态？

**A**: 有多种方式：

**方式 1：代码查询**

```typescript
const counts = await queue.getJobCounts();
console.log(counts);
// {
//   waiting: 10,
//   active: 2,
//   completed: 100,
//   failed: 5,
//   delayed: 3
// }
```

**方式 2：使用 Bull Board（推荐）**

```bash
# 安装 Bull Board
pnpm add @bull-board/express @bull-board/api

# 集成到 Express 应用
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(myQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
// 访问 http://localhost:3000/admin/queues
```

### Q3: Worker 进程崩溃了怎么办？

**A**: 使用进程管理工具：

**方式 1：使用 PM2**

```bash
# 安装 PM2
pnpm add -g pm2

# 启动 Worker
pm2 start dist/workers/ai-worker.js --name "ai-worker"

# 查看状态
pm2 status

# 查看日志
pm2 logs ai-worker

# 自动重启（崩溃后）
# PM2 默认会自动重启崩溃的进程
```

**方式 2：Docker**

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN pnpm install
CMD ["node", "dist/workers/ai-worker.js"]

# docker-compose.yml
version: '3.8'
services:
  worker:
    build: .
    restart: always  # 崩溃自动重启
    environment:
      - REDIS_HOST=redis
```

### Q4: 如何处理大量失败的任务？

**A**: 多种策略：

```typescript
// 1. 限制重试次数
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  }
}

// 2. 定期清理失败任务
setInterval(async () => {
  // 清理 24 小时前失败的任务
  await queue.clean(24 * 3600 * 1000, 1000, 'failed');
}, 3600 * 1000); // 每小时清理一次

// 3. 记录失败原因，分析问题
worker.on('failed', async (job, error) => {
  // 记录到日志系统
  logger.error({
    jobId: job?.id,
    jobData: job?.data,
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });

  // 如果是特定错误，标记为不可重试
  if (error.message.includes('Invalid data')) {
    await job?.moveToFailed(error, false); // false = 不重试
  }
});
```

### Q5: BullMQ 和 Bull 的区别？

**A**: BullMQ 是 Bull 的升级版：

| 特性 | Bull (旧) | BullMQ (新) |
|------|----------|------------|
| **性能** | 较慢 | 更快（重写） |
| **TypeScript** | 部分支持 | 完全支持 |
| **API** | 回调 | async/await |
| **维护状态** | 维护模式 | 活跃开发 |
| **推荐** | ❌ 不推荐 | ✅ 推荐 |

**建议**：新项目直接使用 BullMQ。

---

## 下一步学习

### 进阶主题

1. **任务流程编排**
   - 使用 FlowProducer 创建复杂任务流
   - 任务依赖和条件分支

2. **性能优化**
   - 批量添加任务（addBulk）
   - 使用 Lua 脚本优化
   - 连接池管理

3. **高级功能**
   - 延迟任务和定时任务
   - 任务优先级和权重
   - 任务分组和标签

4. **监控和运维**
   - 集成 Prometheus 指标
   - 添加告警机制
   - 性能分析和调优

### 推荐资源

- **官方文档**：https://docs.bullmq.io/
- **GitHub**：https://github.com/taskforcesh/bullmq
- **Bull Board**：https://github.com/felixmosh/bull-board
- **示例项目**：https://github.com/taskforcesh/bullmq/tree/master/examples

### 实践建议

1. **从简单开始**
   - 先实现基础的队列和 Worker
   - 逐步添加重试、优先级等功能

2. **监控先行**
   - 尽早集成 Bull Board
   - 添加日志和错误追踪

3. **测试充分**
   - 测试失败重试逻辑
   - 测试并发和限流
   - 压力测试确定最优并发数

4. **文档完善**
   - 记录队列的用途和配置
   - 记录常见问题和解决方案

---

## 总结

BullMQ 是一个强大的任务队列系统，它：

✅ **简化异步任务处理**：添加任务 → Worker 自动处理，无需手动轮询
✅ **内置企业级功能**：重试、优先级、延迟、并发控制开箱即用
✅ **高性能可扩展**：基于 Redis，支持水平扩展
✅ **可靠性高**：任务持久化，崩溃恢复，详细监控

**在你的 AI 资讯项目中**，BullMQ 将帮助你：
- 异步处理 AI 翻译任务（不阻塞用户请求）
- 精确控制 Ollama 调用并发（避免资源过载）
- 自动重试失败任务（提高成功率）
- 优先处理热门新闻（提升用户体验）

**下一步**：结合 [Redis 入门指南](./redis-introduction.md) 中的知识，开始在你的项目中实践吧！🚀
