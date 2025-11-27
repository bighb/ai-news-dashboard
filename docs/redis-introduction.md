# Redis 入门指南

> 面向从未接触过 Redis 的全栈工程师的完整教程

## 目录

- [什么是 Redis？](#什么是-redis)
- [为什么需要 Redis？](#为什么需要-redis)
- [Redis 核心数据结构](#redis-核心数据结构)
- [本地安装和配置](#本地安装和配置)
- [最小可运行示例](#最小可运行示例)
- [常见问题](#常见问题)
- [下一步学习](#下一步学习)

---

## 什么是 Redis？

### 基础定义

**Redis** (Remote Dictionary Server) 是一个**内存数据库**，你可以把它理解为：

- 一个运行在服务器上的**超快速键值存储**
- 就像 JavaScript 的 `Map` 对象，但它是持久化的、可以跨进程共享的
- 数据存储在内存中，因此读写速度极快

### 与传统数据库的对比

```
┌─────────────────────────────────────────────────────────┐
│              存储位置        读写速度      典型用途        │
├─────────────────────────────────────────────────────────┤
│ MySQL/PostgreSQL  磁盘      较慢(毫秒级)  主数据存储      │
│ Redis             内存      极快(微秒级)  缓存/队列/会话  │
└─────────────────────────────────────────────────────────┘
```

**类比理解**：

- **MySQL** = 图书馆的书架（数据永久存储，但查找需要时间）
- **Redis** = 你的书桌（正在用的书放桌上，拿起来很快）

### 核心特性

1. **极高的性能**
   - 读写速度：>100,000 操作/秒
   - 单个操作延迟：微秒级

2. **丰富的数据结构**
   - 不仅仅是键值对，支持列表、集合、有序集合等

3. **持久化支持**
   - 虽然是内存数据库，但可以定期保存到磁盘
   - 重启后数据不会丢失

4. **原子操作**
   - 所有操作都是原子性的，非常适合实现分布式锁

---

## 为什么需要 Redis？

### 使用场景

#### 场景 1：数据库查询缓存

**问题**：频繁查询数据库，增加负载

```typescript
// ❌ 没有 Redis 的问题
async function getUserProfile(userId: string) {
  // 每次都查询数据库
  const user = await mysql.query(
    "SELECT * FROM users WHERE id = ?",
    userId
  );
  return user;
}

// 假设这个接口每秒被调用 1000 次
// → 数据库每秒要处理 1000 次查询
// → 数据库压力巨大，响应变慢
```

**解决方案**：使用 Redis 缓存

```typescript
// ✅ 使用 Redis 优化
async function getUserProfile(userId: string) {
  const cacheKey = `user:${userId}`;

  // 1. 先查 Redis（极快，微秒级）
  let user = await redis.get(cacheKey);

  if (user) {
    return JSON.parse(user); // 缓存命中
  }

  // 2. Redis 没有，才查数据库
  user = await mysql.query(
    "SELECT * FROM users WHERE id = ?",
    userId
  );

  // 3. 存入 Redis，设置 5 分钟过期
  await redis.set(
    cacheKey,
    JSON.stringify(user),
    'EX',
    300
  );

  return user;
}

// 效果：
// 第 1 次：查数据库 (10ms)
// 第 2-1000 次：查 Redis (0.1ms)
// 性能提升：100 倍！
```

#### 场景 2：会话存储

**问题**：用户登录状态需要跨服务器共享

```typescript
// ❌ 使用内存存储（单机）
const sessions = new Map(); // 服务器 A 的会话
sessions.set('session-123', { userId: 'user-1' });

// 问题：用户下次请求可能被负载均衡到服务器 B
// 服务器 B 没有这个会话数据 → 用户被踢下线
```

```typescript
// ✅ 使用 Redis（共享）
// 服务器 A
await redis.set('session:session-123', JSON.stringify({
  userId: 'user-1',
  loginTime: Date.now()
}), 'EX', 3600); // 1 小时过期

// 服务器 B 也能读取
const session = await redis.get('session:session-123');
// ✓ 用户保持登录状态
```

#### 场景 3：实时计数器

**问题**：高并发下的点赞、浏览量统计

```typescript
// ❌ 直接写数据库
async function incrementLikes(postId: string) {
  await mysql.query(
    "UPDATE posts SET likes = likes + 1 WHERE id = ?",
    postId
  );
}

// 问题：
// 1. 每次点赞都要写磁盘（慢）
// 2. 高并发下可能导致数据库锁争用
// 3. 1000 个人同时点赞 = 1000 次磁盘写入
```

```typescript
// ✅ 使用 Redis
async function incrementLikes(postId: string) {
  // 原子操作，超快，无锁
  await redis.incr(`post:${postId}:likes`);
}

// 定期同步到数据库（例如每分钟）
setInterval(async () => {
  const keys = await redis.keys('post:*:likes');
  for (const key of keys) {
    const postId = key.split(':')[1];
    const likes = await redis.get(key);
    await mysql.query(
      "UPDATE posts SET likes = ? WHERE id = ?",
      [likes, postId]
    );
  }
}, 60000);

// 效果：
// Redis：1000 次点赞 = 1000 次内存操作（毫秒级）
// 数据库：1 分钟只需 1 次更新
```

### 性能对比

| 操作类型 | MySQL | Redis | 性能提升 |
|---------|-------|-------|---------|
| 简单查询 | 10ms | 0.1ms | **100倍** |
| 计数器自增 | 5ms | 0.05ms | **100倍** |
| 会话读取 | 15ms | 0.1ms | **150倍** |
| 写入操作 | 20ms | 0.2ms | **100倍** |

---

## Redis 核心数据结构

### 1. String（字符串）

**类似于**：JavaScript 的 `let x = "value"`

**使用场景**：
- 缓存 API 响应
- 存储配置信息
- 计数器

**示例**：

```typescript
// 设置值
await redis.set('user:1000:name', 'Alice');

// 获取值
const name = await redis.get('user:1000:name'); // 'Alice'

// 设置带过期时间的值（5 分钟）
await redis.set('cache:api-response', jsonData, 'EX', 300);

// 计数器自增
await redis.incr('page:views'); // 原子操作
await redis.incrby('page:views', 10); // 增加 10
```

### 2. Hash（哈希表）

**类似于**：JavaScript 的 `{ user: { name: "Alice", age: 30 } }`

**使用场景**：
- 存储对象
- 用户配置
- 商品信息

**示例**：

```typescript
// 存储用户对象
await redis.hset('user:1000', {
  name: 'Alice',
  email: 'alice@example.com',
  age: '30'
});

// 获取单个字段
const name = await redis.hget('user:1000', 'name'); // 'Alice'

// 获取整个对象
const user = await redis.hgetall('user:1000');
// { name: 'Alice', email: 'alice@example.com', age: '30' }

// 只更新一个字段
await redis.hset('user:1000', 'age', '31');
```

### 3. List（列表）

**类似于**：JavaScript 的 `['item1', 'item2', 'item3']`

**使用场景**：
- 消息队列
- 最新动态列表
- 时间线

**示例**：

```typescript
// 从左边推入（最新的在前面）
await redis.lpush('notifications', 'New message from Bob');
await redis.lpush('notifications', 'New like on your post');

// 获取最新的 10 条通知
const latest = await redis.lrange('notifications', 0, 9);
// ['New like on your post', 'New message from Bob']

// 从右边弹出（FIFO 队列）
const oldest = await redis.rpop('notifications');

// 获取列表长度
const count = await redis.llen('notifications');
```

### 4. Set（集合）

**类似于**：JavaScript 的 `new Set([1, 2, 3])`

**使用场景**：
- 去重
- 标签系统
- 共同好友

**示例**：

```typescript
// 添加标签
await redis.sadd('article:100:tags', 'redis', 'database', 'cache');

// 检查是否存在
const hasTag = await redis.sismember('article:100:tags', 'redis'); // 1 (true)

// 获取所有标签
const tags = await redis.smembers('article:100:tags');
// ['redis', 'database', 'cache']

// 集合运算
await redis.sadd('user:alice:following', 'bob', 'charlie');
await redis.sadd('user:bob:following', 'charlie', 'david');

// 共同关注的人
const common = await redis.sinter(
  'user:alice:following',
  'user:bob:following'
); // ['charlie']
```

### 5. Sorted Set（有序集合）

**类似于**：带权重的 Set

**使用场景**：
- 排行榜
- 优先级队列
- 延迟任务

**示例**：

```typescript
// 添加分数（游戏排行榜）
await redis.zadd('leaderboard', 100, 'Alice');
await redis.zadd('leaderboard', 200, 'Bob');
await redis.zadd('leaderboard', 150, 'Charlie');

// 获取排行（从高到低）
const topPlayers = await redis.zrevrange('leaderboard', 0, 2, 'WITHSCORES');
// ['Bob', '200', 'Charlie', '150', 'Alice', '100']

// 获取某人的排名
const rank = await redis.zrevrank('leaderboard', 'Alice'); // 2（第三名）

// 获取分数在 100-200 之间的玩家
const players = await redis.zrangebyscore('leaderboard', 100, 200);
```

### 数据结构选择指南

```
需要存储什么？              → 选择什么数据结构
─────────────────────────────────────────────────
单个值（字符串/数字）        → String
对象（多个字段）            → Hash
有序列表（时间线/队列）      → List
唯一值集合（标签/去重）      → Set
需要排序的集合（排行榜）     → Sorted Set
```

---

## 本地安装和配置

### macOS 安装步骤

#### 1. 使用 Homebrew 安装

```bash
# 安装 Redis
brew install redis

# 查看安装信息
brew info redis
```

#### 2. 启动 Redis 服务

```bash
# 方式 1：作为后台服务启动（推荐）
brew services start redis

# 方式 2：前台启动（可以看到日志）
redis-server

# 方式 3：使用配置文件启动
redis-server /usr/local/etc/redis.conf
```

#### 3. 验证安装

```bash
# 使用 Redis CLI 测试
redis-cli ping
# 应该返回：PONG

# 进入交互模式
redis-cli
# 127.0.0.1:6379>

# 尝试基本命令
127.0.0.1:6379> SET test "Hello Redis"
# OK
127.0.0.1:6379> GET test
# "Hello Redis"
127.0.0.1:6379> EXIT
```

#### 4. 停止 Redis 服务

```bash
# 如果是用 brew services 启动的
brew services stop redis

# 如果是前台启动的，按 Ctrl+C

# 或者通过 CLI 关闭
redis-cli shutdown
```

### 基础配置

Redis 的配置文件位于 `/usr/local/etc/redis.conf`

**常用配置**：

```bash
# 查看配置文件
cat /usr/local/etc/redis.conf

# 重要配置项
port 6379                # 端口号
bind 127.0.0.1          # 绑定的 IP（本地开发）
maxmemory 256mb         # 最大内存使用
maxmemory-policy allkeys-lru  # 内存满时的淘汰策略

# 持久化配置
save 900 1              # 900 秒内至少 1 个键改变时保存
save 300 10             # 300 秒内至少 10 个键改变时保存
appendonly yes          # 开启 AOF 持久化
```

**修改配置后重启**：

```bash
brew services restart redis
```

---

## 最小可运行示例

### 安装 Node.js 依赖

```bash
pnpm add ioredis
pnpm add -D @types/node
```

### 示例代码

创建文件 `test-redis.ts`：

```typescript
import Redis from 'ioredis';

// 1. 创建 Redis 客户端
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  // password: 'your-password', // 如果设置了密码
});

// 2. 测试连接
redis.on('connect', () => {
  console.log('✅ 已连接到 Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis 连接错误:', err);
});

// 3. 基础操作示例
async function testRedis() {
  try {
    // String 操作
    console.log('\n--- String 操作 ---');
    await redis.set('greeting', 'Hello Redis!');
    const greeting = await redis.get('greeting');
    console.log('读取值:', greeting);

    // 带过期时间的设置（10 秒后过期）
    await redis.set('temp-key', 'temporary value', 'EX', 10);
    console.log('设置临时键，10 秒后过期');

    // 计数器
    await redis.set('counter', 0);
    await redis.incr('counter');
    await redis.incr('counter');
    const counter = await redis.get('counter');
    console.log('计数器值:', counter); // 2

    // Hash 操作
    console.log('\n--- Hash 操作 ---');
    await redis.hset('user:1000', {
      name: 'Alice',
      email: 'alice@example.com',
      age: '30',
    });
    const user = await redis.hgetall('user:1000');
    console.log('用户对象:', user);

    // List 操作
    console.log('\n--- List 操作 ---');
    await redis.del('notifications'); // 清空旧数据
    await redis.lpush('notifications', '消息 1', '消息 2', '消息 3');
    const notifications = await redis.lrange('notifications', 0, -1);
    console.log('通知列表:', notifications);

    // Set 操作
    console.log('\n--- Set 操作 ---');
    await redis.sadd('tags', 'redis', 'database', 'cache', 'redis'); // redis 重复
    const tags = await redis.smembers('tags');
    console.log('标签集合:', tags); // 自动去重

    // Sorted Set 操作
    console.log('\n--- Sorted Set 操作 ---');
    await redis.zadd('scores', 100, 'Alice', 200, 'Bob', 150, 'Charlie');
    const topScores = await redis.zrevrange('scores', 0, 2, 'WITHSCORES');
    console.log('排行榜 Top 3:', topScores);

    // 查看所有键
    console.log('\n--- 查看所有键 ---');
    const keys = await redis.keys('*');
    console.log('所有键:', keys);

    // 清空测试数据
    await redis.flushall();
    console.log('\n✅ 测试完成，已清空数据');

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    // 关闭连接
    await redis.quit();
    console.log('已断开连接');
  }
}

// 运行测试
testRedis();
```

### 运行示例

```bash
# 使用 tsx 直接运行 TypeScript
npx tsx test-redis.ts
```

### 期望输出

```
✅ 已连接到 Redis

--- String 操作 ---
读取值: Hello Redis!
设置临时键,10 秒后过期
计数器值: 2

--- Hash 操作 ---
用户对象: { name: 'Alice', email: 'alice@example.com', age: '30' }

--- List 操作 ---
通知列表: [ '消息 3', '消息 2', '消息 1' ]

--- Set 操作 ---
标签集合: [ 'redis', 'database', 'cache' ]

--- Sorted Set 操作 ---
排行榜 Top 3: [ 'Bob', '200', 'Charlie', '150', 'Alice', '100' ]

--- 查看所有键 ---
所有键: [ 'greeting', 'counter', 'user:1000', 'notifications', 'tags', 'scores' ]

✅ 测试完成，已清空数据
已断开连接
```

---

## 常见问题

### Q1: Redis 数据会丢失吗？

**A**: Redis 提供两种持久化机制：

1. **RDB（快照）**：
   - 定期保存内存数据到磁盘
   - 适合做备份，恢复快
   - 缺点：可能丢失最后几分钟的数据

2. **AOF（追加文件）**：
   - 记录每个写操作
   - 数据更安全（最多丢失 1 秒）
   - 缺点：文件更大，恢复更慢

**建议**：开发环境用 RDB，生产环境同时开启 RDB + AOF

### Q2: Redis 内存满了怎么办？

**A**: Redis 有多种淘汰策略：

- `noeviction`：内存满时拒绝写入（默认）
- `allkeys-lru`：删除最少使用的键（推荐）
- `volatile-ttl`：删除快过期的键
- `allkeys-random`：随机删除

**配置方式**：

```bash
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Q3: Redis 适合存储大数据吗？

**A**: 不适合。Redis 主要用于：

- ✅ 热数据缓存（频繁访问的数据）
- ✅ 临时数据（会话、验证码）
- ✅ 实时计数（点赞、浏览量）
- ❌ 海量历史数据（用 MySQL/MongoDB）
- ❌ 大文件（用对象存储 S3/OSS）

**经验法则**：如果数据总量 > 服务器内存的 50%，考虑用传统数据库

### Q4: 如何查看 Redis 的内存使用情况？

```bash
# 进入 Redis CLI
redis-cli

# 查看内存使用
127.0.0.1:6379> INFO memory

# 查看所有键的数量
127.0.0.1:6379> DBSIZE

# 查看特定键的大小（字节）
127.0.0.1:6379> MEMORY USAGE user:1000
```

### Q5: Redis 支持事务吗？

**A**: 支持，但与传统数据库不同：

```typescript
// Redis 事务（MULTI/EXEC）
const multi = redis.multi();
multi.set('key1', 'value1');
multi.incr('counter');
multi.get('key1');
const results = await multi.exec();

// 注意：Redis 事务不支持回滚！
// 如果某个命令失败，其他命令仍会执行
```

---

## 下一步学习

### 进阶主题

1. **Redis 集群**
   - 主从复制（Master-Slave）
   - 哨兵模式（Sentinel）
   - Redis Cluster

2. **性能优化**
   - Pipeline（批量操作）
   - Lua 脚本（原子操作）
   - 连接池管理

3. **高级应用**
   - 分布式锁
   - 限流算法（令牌桶、滑动窗口）
   - 布隆过滤器

4. **监控和调试**
   - Redis Insight（可视化工具）
   - 慢查询日志
   - 性能监控

### 推荐资源

- **官方文档**：https://redis.io/documentation
- **ioredis 文档**：https://github.com/redis/ioredis
- **Redis 命令参考**：https://redis.io/commands

### 结合你的项目

在你的 AI 资讯聚合项目中，Redis 将用于：

1. **任务队列存储**（配合 BullMQ）
   - 存储待处理的 AI 翻译任务
   - 管理任务状态和优先级

2. **状态缓存**
   - 缓存 AI 任务的处理进度
   - 减少数据库查询压力

3. **分布式锁**
   - 防止同一条新闻被多个 Worker 重复处理

**下一步**：学习 [BullMQ 入门指南](./bullmq-introduction.md)，了解如何使用 Redis 构建强大的任务队列系统！

---

**总结**：Redis 是一个强大的内存数据库，通过提供极快的读写速度和丰富的数据结构，它在缓存、会话存储、计数器、队列等场景中都有广泛应用。理解 Redis 的核心概念和数据结构，是构建高性能应用的重要基础。
