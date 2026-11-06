import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeMessage,
    normalizeSubject,
    MessagingError,
    messagingLimits,
} from '../lib/messageService.js';

test('Message text is trimmed and blank messages are rejected', () => {
    assert.equal(normalizeMessage('  Hello Rayjin  '), 'Hello Rayjin');
    assert.throws(() => normalizeMessage('   '), MessagingError);
});

test('Message length is bounded for predictable business messaging', () => {
    assert.equal(normalizeMessage('x'.repeat(messagingLimits.maxMessageLength)).length, 1000);
    assert.throws(
        () => normalizeMessage('x'.repeat(messagingLimits.maxMessageLength + 1)),
        /cannot exceed 1000/
    );
});

test('General inquiry subjects are normalized and bounded', () => {
    assert.equal(normalizeSubject('  PVC   availability  '), 'PVC availability');
    assert.throws(() => normalizeSubject('a'), /at least 3/);
    assert.throws(
        () => normalizeSubject('x'.repeat(messagingLimits.maxSubjectLength + 1)),
        /cannot exceed 150/
    );
});
