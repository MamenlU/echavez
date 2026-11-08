import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serviceSource = await readFile(new URL('../lib/messageService.js', import.meta.url), 'utf8');
const customerUi = await readFile(new URL('../../project/src/components/CustomerMessages.tsx', import.meta.url), 'utf8');
const adminUi = await readFile(new URL('../../project/src/components/AdminMessages.tsx', import.meta.url), 'utf8');

test('AI messages reuse conversation_messages system sender and event_key instead of a new schema', () => {
  assert.match(serviceSource, /senderType: 'system'/);
  assert.match(serviceSource, /eventKey: cleanEventKey/);
  assert.match(serviceSource, /sendSystemMessage/);
  assert.match(serviceSource, /startsWith\('ai_'\)/);
});

test('customer and Admin UIs visibly distinguish Rayjin Assistant from ordinary system events', () => {
  assert.match(customerUi, /Rayjin Assistant · AI/);
  assert.match(customerUi, /latestEventKey\?\.startsWith\('ai_'\)/);
  assert.match(adminUi, /Rayjin Assistant · AI/);
  assert.match(adminUi, /latestEventKey\?\.startsWith\('ai_'\)/);
});
