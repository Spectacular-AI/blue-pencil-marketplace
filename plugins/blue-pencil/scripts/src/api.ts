import { parse } from 'yaml';

// The Blue Pencil review route, `POST /api/review`, which does all the judging: the script only reads
// files, sends their text and saves the answer (D54: script the transport, never the judgment). The
// route answers in the encoding `Accept` asks for, YAML (the MCP `review` tool's text) or JSON, the
// same data; its query parameters `detail`, `outcomes` and `echo_spec` shape what the answer holds.
// Its errors follow `Accept` too, `{error: {code, message, ...}}` in either encoding.

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

/** The encodings the route answers in. */
export type Output = 'yaml' | 'json';

/**
 * How the answer is asked for: its encoding, and the route's query parameters, each sent only when
 * given (`detail`, `outcomes`, `echo_spec`), their values already checked.
 */
export type AskOptions = { output: Output; query: Record<string, string> };

/** A review's answer: its text, in the encoding asked for, or an error with its code and a message. */
export type Answer = { text: string } | { code: string; message: string };

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

/**
 * The route's error from a failed response: its code and message, read as YAML, which reads JSON
 * too, or the status when it sent none.
 */
async function errorOf(res: Response): Promise<Answer> {
  const text = await res.text().catch(() => '');
  let body: unknown;
  try {
    body = parse(text);
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

/** The `Accept` value, the content type's test and the name of each encoding. */
const MEDIA: Record<Output, { type: string; test: RegExp; name: string }> = {
  yaml: { type: 'application/yaml', test: /yaml/i, name: 'YAML' },
  json: { type: 'application/json', test: /json/i, name: 'JSON' },
};

/** The route's URL with the query parameters given, in the order given. */
export function urlWith(url: string, query: Record<string, string>): string {
  const pairs = Object.entries(query).map(
    // The values are checked words and commas; a comma is left as it is, so the URL reads plainly.
    ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%2C/gi, ',')}`,
  );
  return pairs.length ? `${url}?${pairs.join('&')}` : url;
}

/** One review asked of the route, with the key as a bearer token. Never throws. */
export async function askReview(
  fetch: Fetch,
  config: ApiConfig,
  key: string,
  body: ReviewBody,
  options: AskOptions = { output: 'yaml', query: {} },
): Promise<Answer> {
  const wanted = MEDIA[options.output];
  let res: Response;
  try {
    res = await fetch(urlWith(config.url, options.query), {
      method: 'POST',
      headers: {
        ...config.headers,
        authorization: `Bearer ${key}`,
        accept: wanted.type,
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
  if (wanted.test.test(type)) return { text: await res.text() };
  await res.body?.cancel().catch(() => undefined);
  // The other encoding: a deployment from before the route answered in the one asked for.
  if (Object.values(MEDIA).some((m) => m.test.test(type)))
    return {
      code: 'old_server',
      message: `The server does not answer ${wanted.name} yet: it is an older deployment. Review with the review MCP tool instead.`,
    };
  return {
    code: 'unexpected_answer',
    message: `The server answered ${type || 'without a content type'}, not ${wanted.name}.`,
  };
}
