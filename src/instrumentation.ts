export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Map standard proxy env vars to global-agent format
    if (process.env.HTTP_PROXY || process.env.http_proxy) {
      process.env.GLOBAL_AGENT_HTTP_PROXY =
        process.env.HTTP_PROXY || process.env.http_proxy;
    }
    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
      process.env.GLOBAL_AGENT_HTTPS_PROXY =
        process.env.HTTPS_PROXY || process.env.https_proxy;
    }

    const { bootstrap } = await import("global-agent");
    bootstrap();
  }
}
