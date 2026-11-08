import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../project/src/components/AdminAuditLogPanel.tsx', import.meta.url)),
  'utf8'
);

// These checks protect the DOM placement and interaction contract.
// They are source-level regression checks, not a substitute for a real browser test.
test('audit details dialog is portaled to body outside the animated dashboard container', () => {
  assert.match(source, /import\s*\{\s*createPortal\s*\}\s*from\s*'react-dom'/);
  assert.match(source, /\{selectedLog\s*&&\s*createPortal\(/);
  assert.match(source, /document\.body\s*\)\}/);
  assert.match(source, /fixed inset-0 z-\[9999\]/);
});

test('audit details dialog is keyboard accessible and returns focus after closing', () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="audit-details-title"/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /detailCloseRef\.current\?\.focus\(\)/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /detailTriggerRef\.current\?\.isConnected/);
});

test('audit details dialog stays inside mobile viewport and scrolls internally', () => {
  assert.match(source, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
  assert.match(source, /min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain/);
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(source, /document\.body\.style\.overflow = previousOverflow/);
});

test('audit data, operator and approver details remain visible in the dialog', () => {
  for (const text of ['Performed By', 'Authorization Result', 'Authorized By', 'Reason / Context', 'Before', 'After']) {
    assert.ok(source.includes(text), `${text} was removed from audit dialog`);
  }
  assert.match(source, /staffIdentity\(selectedLog\.approved_by/);
  assert.match(source, /formatAuditData\(selectedLog\.before_data\)/);
  assert.match(source, /formatAuditData\(selectedLog\.after_data\)/);
});
