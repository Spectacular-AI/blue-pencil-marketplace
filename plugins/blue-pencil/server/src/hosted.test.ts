import { expect, test } from 'bun:test';
import { hostedConfig, PRODUCTION_MCP_URL } from './hosted';

test('the hosted server is production unless the environment names another, with the bypass header when set', () => {
  expect(hostedConfig({})).toEqual({ url: PRODUCTION_MCP_URL, headers: {} });
  expect(
    hostedConfig({
      BLUE_PENCIL_MCP_URL: 'https://preview.example/api/mcp',
      BLUE_PENCIL_BYPASS: 'secret',
    }),
  ).toEqual({
    url: 'https://preview.example/api/mcp',
    headers: { 'x-vercel-protection-bypass': 'secret' },
  });
  expect(hostedConfig({ BLUE_PENCIL_MCP_URL: ' ', BLUE_PENCIL_BYPASS: '' })).toEqual({
    url: PRODUCTION_MCP_URL,
    headers: {},
  });
});
