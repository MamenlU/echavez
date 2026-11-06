import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyCustomerAiRequest } from '../lib/aiSafety.js';
import { AiUnavailableError, generateAiText, getAiConfiguration } from '../lib/aiProvider.js';

const contextSource = await readFile(new URL('../lib/aiContext.js', import.meta.url), 'utf8');
const routeSource = await readFile(new URL('../routes/ai.js', import.meta.url), 'utf8');
const providerSource = await readFile(new URL('../lib/aiProvider.js', import.meta.url), 'utf8');

test('high-risk customer concerns are classified for human handoff', () => {
  for (const input of [
    'I want a refund for my paid order',
    'I was charged twice',
    'My order is damaged and missing items',
    'Cancel my paid order',
    'Please mark my payment as paid',
  ]) {
    assert.equal(classifyCustomerAiRequest(input).highRisk, true, input);
  }
  assert.equal(classifyCustomerAiRequest('How much is Portland cement?').highRisk, false);
});

test('customer own-order context is authorization-scoped by authenticated user id', () => {
  assert.match(contextSource, /WHERE o\.user_id = \?/);
  assert.match(contextSource, /customerOrderContext\(database, actor\.id, message\)/);
  assert.doesNotMatch(contextSource, /SELECT \*/i);
});

test('AI route exposes only informational customer and Admin assistance endpoints', () => {
  assert.match(routeSource, /\/customer-assistant/);
  assert.match(routeSource, /\/admin\/conversations\/:id\/summary/);
  assert.match(routeSource, /\/admin\/conversations\/:id\/suggest-reply/);
  assert.doesNotMatch(routeSource, /router\.(?:post|put|patch|delete)\([^\n]*(?:approve|reject|refund|inventory|price|payment\/verify)/i);
  assert.match(routeSource, /read-only/i);
});

test('AI provider key stays server-side and missing configuration fails gracefully', async () => {
  const previous = process.env.OPENAI_API_KEY;
  const previousEnabled = process.env.AI_ENABLED;
  try {
    delete process.env.OPENAI_API_KEY;
    process.env.AI_ENABLED = 'true';
    assert.equal(getAiConfiguration().hasApiKey, false);
    await assert.rejects(
      () => generateAiText({ instructions: 'Test', input: 'Test' }),
      (error) => error instanceof AiUnavailableError && error.code === 'AI_UNAVAILABLE'
    );
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
    if (previousEnabled === undefined) delete process.env.AI_ENABLED;
    else process.env.AI_ENABLED = previousEnabled;
  }
  assert.match(providerSource, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(providerSource, /VITE_OPENAI|console\.log\([^\n]*OPENAI_API_KEY/i);
});
