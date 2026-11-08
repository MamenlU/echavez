import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createOrderSystemMessage,
    safeCreateOrderSystemMessage,
} from '../lib/messageService.js';

function createExecutor() {
    const eventKeys = new Set();
    const observed = [];

    return {
        observed,
        async query(sql, params = []) {
            observed.push({ sql: String(sql), params });

            if (sql.includes('INSERT INTO conversations')) {
                return [{ affectedRows: 1 }];
            }

            if (sql.includes('SELECT conversation_id')) {
                return [[{ conversation_id: 42 }]];
            }

            if (sql.includes('INSERT INTO conversation_messages') && sql.includes('ON CONFLICT')) {
                const eventKey = params[5];
                if (eventKeys.has(eventKey)) {
                    return [{ affectedRows: 0, insertId: 0 }];
                }
                eventKeys.add(eventKey);
                return [{ affectedRows: 1, insertId: 99 }];
            }

            if (sql.includes('UPDATE conversations')) {
                return [{ affectedRows: 1 }];
            }

            throw new Error(`Unexpected SQL in test: ${sql}`);
        },
    };
}

test('automatic order system messages use deterministic event-key deduplication', async () => {
    const executor = createExecutor();
    const input = {
        orderId: 'ORD-123',
        customerId: 7,
        message: 'Your order has been approved.',
        eventKey: 'order:ORD-123:status:approved',
    };

    const first = await createOrderSystemMessage(executor, input);
    const second = await createOrderSystemMessage(executor, input);

    assert.equal(first.inserted, true);
    assert.equal(first.conversationId, 42);
    assert.equal(second.inserted, false);

    const messageInsert = executor.observed.find(entry =>
        entry.sql.includes('INSERT INTO conversation_messages') && entry.sql.includes('ON CONFLICT')
    );

    assert.ok(messageInsert);
    assert.equal(messageInsert.params[2], 'system');
    assert.equal(messageInsert.params[5], input.eventKey);
});

test('safe automatic messaging never throws into a protected order/payment workflow', async () => {
    const originalError = console.error;
    console.error = () => {};

    try {
        const result = await safeCreateOrderSystemMessage(
            {
                async query() {
                    throw Object.assign(new Error('temporary messaging failure'), {
                        code: 'TEST_MESSAGE_FAILURE',
                    });
                },
            },
            {
                orderId: 'ORD-456',
                customerId: 8,
                message: 'Payment confirmed.',
                eventKey: 'order:ORD-456:payment:verified',
            },
            { context: 'test' }
        );

        assert.equal(result.inserted, false);
        assert.equal(result.error, true);
    } finally {
        console.error = originalError;
    }
});
