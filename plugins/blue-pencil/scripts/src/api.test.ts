import { expect, test } from 'bun:test';
import { apiConfig, askReview, PRODUCTION_URL } from './api';

test('the route is production unless the environment names another, with the bypass header when set', () => {
  expect(apiConfig({})).toEqual({ url: `${PRODUCTION_URL}/api/review`, headers: {} });
  expect(
    apiConfig({ BLUE_PENCIL_URL: 'https://preview.example/', BLUE_PENCIL_BYPASS: 'secret' }),
  ).toEqual({
    url: 'https://preview.example/api/review',
    headers: { 'x-vercel-protection-bypass': 'secret' },
  });
  expect(apiConfig({ BLUE_PENCIL_URL: ' ', BLUE_PENCIL_BYPASS: '' })).toEqual({
    url: `${PRODUCTION_URL}/api/review`,
    headers: {},
  });
});

const config = apiConfig({ BLUE_PENCIL_BYPASS: 'bypass' });
const body = { document: '# A\n', format: 'markdown' as const };

test('sends the key as a bearer token, asks for YAML, and sends the body as JSON', async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  const answer = await askReview(
    async (url, init) => {
      seen.push({ url, init });
      return new Response('review: {}\n', {
        headers: { 'content-type': 'application/yaml; charset=utf-8' },
      });
    },
    config,
    'ak_test',
    body,
  );
  expect(answer).toEqual({ yaml: 'review: {}\n' });
  expect(seen[0]?.url).toBe(`${PRODUCTION_URL}/api/review`);
  expect(seen[0]?.init.method).toBe('POST');
  expect(seen[0]?.init.headers).toEqual({
    'x-vercel-protection-bypass': 'bypass',
    authorization: 'Bearer ak_test',
    accept: 'application/yaml',
    'content-type': 'application/json',
  });
  expect(JSON.parse(String(seen[0]?.init.body))).toEqual(body);
});

test("a JSON 200 is an older server's answer, an error", async () => {
  const answer = await askReview(
    async () => Response.json({ summary: {} }),
    config,
    'ak_test',
    body,
  );
  expect(answer).toMatchObject({ code: 'old_server' });
});

test("an error is the route's code and message, or the status when it sent none", async () => {
  const coded = await askReview(
    async () =>
      Response.json(
        { error: { code: 'document_too_large', message: 'Too long.', limit: 100 } },
        { status: 413 },
      ),
    config,
    'ak_test',
    body,
  );
  expect(coded).toEqual({ code: 'document_too_large', message: 'Too long.' });
  const bare = await askReview(
    async () => new Response('<html>Authentication Required</html>', { status: 401, statusText: 'Unauthorized' }),
    config,
    'ak_test',
    body,
  );
  expect(bare).toMatchObject({ code: 'http_401' });
});

test('a server that does not answer is no_answer, with the reason', async () => {
  const answer = await askReview(
    async () => {
      throw new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND') });
    },
    config,
    'ak_test',
    body,
  );
  expect(answer).toEqual({
    code: 'no_answer',
    message: 'The Blue Pencil server did not answer: fetch failed (getaddrinfo ENOTFOUND)',
  });
});
