/**
 * TypeScript 类型声明：global-agent
 *
 * global-agent 是一个用于配置全局 HTTP/HTTPS 代理的 Node.js 库
 * 它通过修改 Node.js 原生的 http/https 模块来拦截所有请求并添加代理支持
 *
 * 主要用途：
 * - 开发环境：解决网络访问限制问题（如防火墙、公司代理等）
 * - 统一代理配置：无需为每个 HTTP 请求单独配置代理
 *
 * 注意：生产环境通常不需要启用，应通过环境变量控制
 */

declare module "global-agent" {
  /**
   * 全局代理配置接口
   */
  export interface ProxyAgentConfigurationInput {
    /**
     * 环境变量命名空间前缀
     * @default 'GLOBAL_AGENT_'
     * 例如：GLOBAL_AGENT_HTTP_PROXY, GLOBAL_AGENT_HTTPS_PROXY
     */
    environmentVariableNamespace?: string;

    /**
     * 是否强制使用全局代理（即使没有设置环境变量）
     * @default false
     */
    forceGlobalAgent?: boolean;

    /**
     * Socket 连接超时时间（毫秒）
     * @default 60000
     */
    socketConnectionTimeout?: number;
  }

  /**
   * 全局代理配置对象
   */
  export interface ProxyAgentConfiguration {
    readonly environmentVariableNamespace: string;
    readonly forceGlobalAgent: boolean;
    readonly socketConnectionTimeout: number;
    HTTP_PROXY: string | null;
    HTTPS_PROXY: string | null;
    NO_PROXY: string | null;
  }

  /**
   * 启动全局代理代理
   *
   * 该函数会：
   * 1. 读取代理相关的环境变量（HTTP_PROXY, HTTPS_PROXY, NO_PROXY 等）
   * 2. 修改 Node.js 原生的 http 和 https 模块
   * 3. 拦截所有 HTTP/HTTPS 请求并自动添加代理配置
   *
   * 环境变量支持：
   * - GLOBAL_AGENT_HTTP_PROXY: HTTP 代理地址
   * - GLOBAL_AGENT_HTTPS_PROXY: HTTPS 代理地址
   * - GLOBAL_AGENT_NO_PROXY: 不使用代理的域名列表（逗号分隔）
   *
   * @example
   * ```typescript
   * import { bootstrap } from 'global-agent';
   *
   * // 设置代理环境变量
   * process.env.GLOBAL_AGENT_HTTP_PROXY = 'http://127.0.0.1:7890';
   * process.env.GLOBAL_AGENT_HTTPS_PROXY = 'http://127.0.0.1:7890';
   *
   * // 启动全局代理
   * bootstrap();
   *
   * // 之后所有的 HTTP/HTTPS 请求都会自动使用代理
   * ```
   */
  export function bootstrap(
    configurationInput?: ProxyAgentConfigurationInput
  ): void;

  /**
   * 创建全局代理代理（高级 API）
   *
   * 与 bootstrap() 类似，但提供更多配置选项
   * 通常情况下使用 bootstrap() 即可
   *
   * @param configurationInput 代理配置选项
   * @returns 全局代理配置对象
   */
  export function createGlobalProxyAgent(
    configurationInput?: ProxyAgentConfigurationInput
  ): ProxyAgentConfiguration;

  /**
   * 创建代理控制器（用于动态控制代理行为）
   */
  export namespace global {
    let GLOBAL_AGENT: ProxyAgentConfiguration | undefined;
  }
}
