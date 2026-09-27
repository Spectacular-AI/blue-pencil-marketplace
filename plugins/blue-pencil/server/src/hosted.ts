import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

// The hosted Blue Pencil server, which does all the judging: this local server only reads files and
// passes their text to its tools, so every answer is the hosted answer (D54: script the transport,
// never the judgment).

/** The production server's MCP endpoint, the one the plugin's `.mcp.json` also names. */
export const PRODUCTION_MCP_URL = 'https://blue-pencil-nu.vercel.app/api/mcp';

/** A hosted tool's answer: its text, unchanged, and its error flag. */
export type ToolAnswer = { text: string; isError: boolean };

/** The hosted tools this server calls. */
export type HostedTool = 'review' | 'check_spec';

/**
 * Calls one hosted tool with its arguments. Throws only when the server could not be reached or did not
 * answer; a tool's own error (a spec that is wrong, a document too large) is an answer with `isError`.
 */
export type Hosted = (
  tool: HostedTool,
  args: Record<string, string>,
) => Promise<ToolAnswer>;

/** Where the hosted server is, and the headers every request carries. */
export type HostedConfig = { url: string; headers: Record<string, string> };

/**
 * The hosted server from the environment: `BLUE_PENCIL_MCP_URL` for a local or preview server
 * (production by default), and `BLUE_PENCIL_BYPASS`, a preview deployment's protection-bypass secret,
 * sent as `x-vercel-protection-bypass` when set.
 */
export function hostedConfig(
  env: Record<string, string | undefined>,
): HostedConfig {
  const bypass = env.BLUE_PENCIL_BYPASS?.trim();
  return {
    url: env.BLUE_PENCIL_MCP_URL?.trim() || PRODUCTION_MCP_URL,
    headers: bypass ? { 'x-vercel-protection-bypass': bypass } : {},
  };
}

/** One review can take a while on a long document; the SDK's default is 60 seconds. */
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * The hosted server over Streamable HTTP. Each call connects, calls the tool and closes: the hosted
 * server is stateless, so nothing is kept between calls.
 */
export function hostedServer({ url, headers }: HostedConfig): Hosted {
  return async (tool, args) => {
    const client = new Client({ name: 'blue-pencil-files', version: '0.3.0' });
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers },
    });
    try {
      await client.connect(transport, { timeout: TIMEOUT_MS });
      const result = await client.callTool(
        { name: tool, arguments: args },
        { timeout: TIMEOUT_MS },
      );
      const text = result.content
        .flatMap((c) => (c.type === 'text' ? [c.text] : []))
        .join('\n');
      return { text, isError: result.isError === true };
    } finally {
      await client.close().catch(() => undefined);
    }
  };
}
