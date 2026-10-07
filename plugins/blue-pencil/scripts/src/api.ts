// The Blue Pencil review route, `POST /api/review`, which does all the judging: the script only reads
// files, sends their text and saves the answer (D54: script the transport, never the judgment). The
// route answers the review as YAML when asked with `Accept: application/yaml`, the MCP `review` tool's
// shape; its errors are JSON, `{error: {code, message, ...}}`.

/** The production site, the one the plugin's `.mcp.json` names too. */
export const PRODUCTION_URL = 'https://slop-or-not.ai';

/** Where the route is, and the headers every request carries besides the key's. */
export type ApiConfig = { url: string; headers: Record<string, string> };

/**
 * The route from the environment: `BLUE_PENCIL_URL` for a local or preview site (production by
 * default), and `BLUE_PENCIL_BYPASS`, a preview deployment's protection-bypass secret, sent as
 * `x-vercel-protection-bypass` when set.
 */
export function apiConfig(env: Record<string, string | undefined>): ApiConfig {
  const base = env.BLUE_PENCIL_URL?.trim() || PRODUCTION_URL;
  const bypass = env.BLUE_PENCIL_BYPASS?.trim();
  return {
    url: `${base.replace(/\/+$/, '')}/api/review`,
    headers: bypass ? { 'x-vercel-protection-bypass': bypass } : {},
  };
}

/** What the request sends: the route's body, which takes no other key. */
export type ReviewBody = { document: string; format: 'markdown'; spec?: unknown };

/** A review's answer: its YAML, or an error with its code and a message to show. */
export type Answer = { yaml: string } | { code: string; message: string };

/** One review can take a while on a long document. */
const TIMEOUT_MS = 5 * 60 * 1000;

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Why a request did not get an answer: the cause's message when fetch gives one. */
function reason(e: unknown): string {
  if (e instanceof Error) {
    const cause = e.cause instanceof Error ? e.cause.message : undefined;
    return cause ? `${e.message} (${cause})` : e.message;
  }
  return String(e);
}

/** The route's error from a failed response: its code and message, or the status when it sent none. */
async function errorOf(res: Response): Promise<Answer> {
  const text = await res.text().catch(() => '');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  const error = isRecord(body) ? body.error : undefined;
  if (isRecord(error) && typeof error.code === 'string')
    return {
      code: error.code,
      message: typeof error.message === 'string' ? error.message : error.code,
    };
  return {
    code: `http_${res.status}`,
    message: `The Blue Pencil server answered ${res.status}${res.statusText ? ` ${res.statusText}` : ''}, without an error code.`,
  };
}

/** One review asked of the route, with the key as a bearer token. Never throws. */
export async function askReview(
  fetch: Fetch,
  config: ApiConfig,
  key: string,
  body: ReviewBody,
): Promise<Answer> {
  let res: Response;
  try {
    res = await fetch(config.url, {
      method: 'POST',
      headers: {
        ...config.headers,
        authorization: `Bearer ${key}`,
        accept: 'application/yaml',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return {
      code: 'no_answer',
      message: `The Blue Pencil server did not answer: ${reason(e)}`,
    };
  }
  if (!res.ok) return errorOf(res);
  const type = res.headers.get('content-type') ?? '';
  if (/yaml/i.test(type)) return { yaml: await res.text() };
  await res.body?.cancel().catch(() => undefined);
  if (/json/i.test(type))
    return {
      code: 'old_server',
      message:
        'The server does not answer YAML yet: it is an older deployment. Review with the review MCP tool instead.',
    };
  return {
    code: 'unexpected_answer',
    message: `The server answered ${type || 'without a content type'}, not YAML.`,
  };
}
