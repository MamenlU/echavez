// HTTP/auth contract tests for the new Messages API.
// These use an in-memory service stub and do not claim to test MariaDB.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'rayjin-messages-fixture-secret';

const { createMessagesRouter } = await import('../routes/messages.js');
const { MessagingError } = await import('../lib/messageService.js');

function token(id, role = 'customer') {
    return jwt.sign({ id, role }, process.env.JWT_SECRET);
}

function createServiceFixture() {
    const calls = [];
    const conversations = new Map([
        [1, { conversationId: 1, customerId: 2, conversationType: 'order', orderId: 'ORD-A' }],
        [2, { conversationId: 2, customerId: 3, conversationType: 'general', orderId: null }],
    ]);

    function assertAccess(actor, id) {
        const conversation = conversations.get(Number(id));
        if (!conversation || (actor.role === 'customer' && conversation.customerId !== actor.id)) {
            throw new MessagingError(404, 'Conversation not found.', 'CONVERSATION_NOT_FOUND');
        }
        return conversation;
    }

    const service = {
        async listConversations(actor, options) {
            calls.push(['list', actor, options]);
            return [...conversations.values()].filter(
                c => actor.role === 'admin' || c.customerId === actor.id
            );
        },
        async unreadCount(actor) {
            calls.push(['unread', actor]);
            return actor.role === 'admin' ? 2 : 1;
        },
        async createConversation(actor, body) {
            calls.push(['create', actor, body]);
            if (actor.role !== 'customer') {
                throw new MessagingError(403, 'Customers create conversations from the customer account.');
            }
            return { conversation: { conversationId: 3, customerId: actor.id }, messages: [] };
        },
        async getConversation(actor, id) {
            calls.push(['get', actor, id]);
            return { conversation: assertAccess(actor, id), messages: [] };
        },
        async sendMessage(actor, id, message) {
            calls.push(['send', actor, id, message]);
            assertAccess(actor, id);
            return { conversationId: Number(id), senderType: actor.role, message };
        },
        async markRead(actor, id) {
            calls.push(['read', actor, id]);
            assertAccess(actor, id);
            return { conversationId: Number(id), markedRead: 1 };
        },
    };

    return { service, calls };
}

async function fixture(t) {
    const { service, calls } = createServiceFixture();
    const app = express();
    app.use(express.json());
    app.use('/api/messages', createMessagesRouter({ service, database: { query: async (_sql, [id]) => [[{ id, username: `user${id}`, role: Number(id) === 1 ? 'admin' : 'customer', status: 'active' }]] } }));

    const server = await new Promise(resolve => {
        const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });

    t.after(() => new Promise(resolve => server.close(resolve)));

    async function request(method, path, { auth = token(2), body } = {}) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/messages${path}`, {
            method,
            headers: {
                ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });

        return { status: response.status, body: await response.json() };
    }

    return { request, calls };
}

test('Messages API rejects missing authentication before service access', async t => {
    const f = await fixture(t);
    const response = await f.request('GET', '/conversations', { auth: null });
    assert.equal(response.status, 401);
    assert.equal(f.calls.length, 0);
});

test('Customer conversation list is scoped through the authenticated actor', async t => {
    const f = await fixture(t);
    const response = await f.request('GET', '/conversations?type=order');
    assert.equal(response.status, 200);
    assert.equal(response.body.conversations.length, 1);
    assert.equal(f.calls[0][1].id, 2);
    assert.equal(f.calls[0][1].role, 'customer');
    assert.equal(f.calls[0][2].conversationType, 'order');
});

test('Customer may create a conversation but Admin creation is rejected', async t => {
    const f = await fixture(t);
    const customer = await f.request('POST', '/conversations', {
        body: { conversationType: 'general', subject: 'PVC inquiry', message: 'Is this available?' },
    });
    assert.equal(customer.status, 201);

    const admin = await f.request('POST', '/conversations', {
        auth: token(1, 'admin'),
        body: { conversationType: 'general', subject: 'Test', message: 'Hello' },
    });
    assert.equal(admin.status, 403);
});

test('Another customer cannot open another customer conversation', async t => {
    const f = await fixture(t);
    const response = await f.request('GET', '/conversations/2');
    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'CONVERSATION_NOT_FOUND');
});

test('Admin may open any customer conversation', async t => {
    const f = await fixture(t);
    const response = await f.request('GET', '/conversations/2', { auth: token(1, 'admin') });
    assert.equal(response.status, 200);
    assert.equal(response.body.conversation.customerId, 3);
});

test('Authenticated participant can send a reply', async t => {
    const f = await fixture(t);
    const response = await f.request('POST', '/conversations/1/messages', {
        body: { message: 'Thank you.' },
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.senderType, 'customer');
    assert.equal(response.body.message, 'Thank you.');
});

test('Unread count and mark-read endpoints preserve actor identity', async t => {
    const f = await fixture(t);
    const count = await f.request('GET', '/unread-count', { auth: token(1, 'admin') });
    assert.equal(count.status, 200);
    assert.equal(count.body.unreadCount, 2);

    const marked = await f.request('PUT', '/conversations/1/read');
    assert.equal(marked.status, 200);
    assert.equal(marked.body.markedRead, 1);
});
