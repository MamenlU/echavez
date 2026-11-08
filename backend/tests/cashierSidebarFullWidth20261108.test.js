import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../project/src/pages/CashierWorkspace.tsx', import.meta.url), 'utf8');

test('Cashier Workspace uses the full available width instead of a centered max-width shell', () => {
  assert.match(source, /<div className="flex w-full min-w-0">/);
  assert.doesNotMatch(source, /mx-auto flex max-w-\[1640px\]/);
});

test('Full-width shell preserves adjustable navigation and expanding POS content', () => {
  assert.match(source, /lg:w-\[var\(--cashier-sidebar-width\)\]/);
  assert.match(source, /sidebarCollapsed \? 64 : sidebarWidth/);
  assert.match(source, /cashier-workspace-content min-w-0 flex-1/);
});
