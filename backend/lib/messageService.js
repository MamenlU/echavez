const MAX_MESSAGE_LENGTH = 1000;
const MAX_SUBJECT_LENGTH = 150;
const MIN_SUBJECT_LENGTH = 3;

export class MessagingError extends Error {
    constructor(status, message, code = 'MESSAGING_ERROR') {
        super(message);
        this.name = 'MessagingError';
        this.status = status;
        this.code = code;
    }
}

function normalizeActor(actor) {
    const id = Number(actor?.id);
    const role = String(actor?.role || '').trim().toLowerCase();

    if (!Number.isInteger(id) || id <= 0 || !['customer', 'admin'].includes(role)) {
        throw new MessagingError(401, 'Authentication required.', 'INVALID_ACTOR');
    }

    return { id, role };
}

export function normalizeMessage(value) {
    const message = String(value || '').trim();

    if (!message) {
        throw new MessagingError(400, 'Message is required.', 'MESSAGE_REQUIRED');
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
        throw new MessagingError(
            400,
            `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
            'MESSAGE_TOO_LONG'
        );
    }

    return message;
}

export function normalizeSubject(value) {
    const subject = String(value || '').trim().replace(/\s+/g, ' ');

    if (subject.length < MIN_SUBJECT_LENGTH) {
        throw new MessagingError(
            400,
            `Subject must be at least ${MIN_SUBJECT_LENGTH} characters.`,
            'SUBJECT_TOO_SHORT'
        );
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
        throw new MessagingError(
            400,
            `Subject cannot exceed ${MAX_SUBJECT_LENGTH} characters.`,
            'SUBJECT_TOO_LONG'
        );
    }

    return subject;
}

function normalizeConversationType(value) {
    const type = String(value || '').trim().toLowerCase();

    if (!['general', 'order'].includes(type)) {
        throw new MessagingError(
            400,
            'Conversation type must be "general" or "order".',
            'INVALID_CONVERSATION_TYPE'
        );
    }

    return type;
}

function displayName(firstName, lastName, username, fallback) {
    const fullName = [firstName, lastName]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .join(' ');

    return fullName || String(username || '').trim() || fallback;
}

async function ensureOrderConversation(executor, { orderId, customerId, createdAt = null }) {
    const timestamp = createdAt || new Date();

    await executor.query(
        `INSERT INTO conversations
            (customer_id, conversation_type, order_id, subject, created_at, updated_at)
         VALUES (?, 'order', ?, NULL, ?, ?)
         ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id)`,
        [customerId, orderId, timestamp, timestamp]
    );

    const [[conversation]] = await executor.query(
        `SELECT conversation_id
         FROM conversations
         WHERE order_id = ?
         LIMIT 1`,
        [orderId]
    );

    if (!conversation) {
        throw new Error(`Unable to resolve the conversation for order ${orderId}.`);
    }

    return Number(conversation.conversation_id);
}

async function insertMessage(
    executor,
    {
        conversationId,
        senderId,
        senderType,
        message,
        eventKey = null,
        createdAt = null,
        readAt = null,
    }
) {
    const cleanMessage = normalizeMessage(message);
    const timestamp = createdAt || new Date();

    let result;

    if (eventKey) {
        [result] = await executor.query(
            `INSERT IGNORE INTO conversation_messages
                (conversation_id, sender_id, sender_type, message, read_at, event_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                conversationId,
                senderId ?? null,
                senderType,
                cleanMessage,
                readAt,
                eventKey,
                timestamp,
            ]
        );
    } else {
        [result] = await executor.query(
            `INSERT INTO conversation_messages
                (conversation_id, sender_id, sender_type, message, read_at, event_key, created_at)
             VALUES (?, ?, ?, ?, ?, NULL, ?)`,
            [
                conversationId,
                senderId ?? null,
                senderType,
                cleanMessage,
                readAt,
                timestamp,
            ]
        );
    }

    const wasInserted = Number(result?.affectedRows || 0) === 1;

    if (wasInserted) {
        await executor.query(
            `UPDATE conversations
             SET updated_at = GREATEST(updated_at, ?)
             WHERE conversation_id = ?`,
            [timestamp, conversationId]
        );
    }

    return {
        inserted: wasInserted,
        messageId: Number(result?.insertId || 0) || null,
        message: cleanMessage,
        createdAt: timestamp,
    };
}

/**
 * Used by the existing Fulfillment Center Admin message composer.
 * The legacy order history remains intact while the same customer-visible
 * Admin message is also written to the new conversation store exactly once.
 */
export async function createOrderSystemMessage(
    executor,
    { orderId, customerId, message, eventKey, createdAt = null }
) {
    const cleanEventKey = String(eventKey || '').trim();

    if (!cleanEventKey) {
        throw new Error('A deterministic event key is required for automatic order messages.');
    }

    const conversationId = await ensureOrderConversation(executor, {
        orderId,
        customerId,
        createdAt,
    });

    const inserted = await insertMessage(executor, {
        conversationId,
        senderId: null,
        senderType: 'system',
        message,
        eventKey: cleanEventKey,
        createdAt,
    });

    return { ...inserted, conversationId };
}

export async function safeCreateOrderSystemMessage(
    executor,
    input,
    { context = 'order event' } = {}
) {
    try {
        return await createOrderSystemMessage(executor, input);
    } catch (error) {
        // Messaging is an important customer-facing enhancement, but it must
        // never block a payment verification, fulfillment transition, sale,
        // or inventory update. Log only a compact technical identifier.
        console.error(
            `Automatic customer message sync failed (${context}):`,
            error?.code || error?.name || 'Error'
        );

        return {
            inserted: false,
            conversationId: null,
            messageId: null,
            error: true,
        };
    }
}

export async function syncAdminOrderMessageToConversation(
    executor,
    { orderId, customerId, adminId, message, historyId, createdAt = null }
) {
    const cleanMessage = String(message || '').trim();

    if (!cleanMessage) {
        return { inserted: false, conversationId: null, messageId: null };
    }

    const conversationId = await ensureOrderConversation(executor, {
        orderId,
        customerId,
        createdAt,
    });

    const inserted = await insertMessage(executor, {
        conversationId,
        senderId: adminId,
        senderType: 'admin',
        message: cleanMessage,
        eventKey: historyId ? `order-admin-history:${historyId}` : null,
        createdAt,
    });

    return { ...inserted, conversationId };
}

export function createMessageService(database) {
    if (!database || typeof database.query !== 'function' || typeof database.getConnection !== 'function') {
        throw new Error('A MySQL-compatible database pool is required.');
    }

    async function getAccessibleConversation(executor, actorInput, conversationId, { forUpdate = false } = {}) {
        const actor = normalizeActor(actorInput);
        const numericId = Number(conversationId);

        if (!Number.isInteger(numericId) || numericId <= 0) {
            throw new MessagingError(404, 'Conversation not found.', 'CONVERSATION_NOT_FOUND');
        }

        const customerFilter = actor.role === 'customer' ? 'AND c.customer_id = ?' : '';
        const params = actor.role === 'customer' ? [numericId, actor.id] : [numericId];

        const [rows] = await executor.query(
            `SELECT
                c.conversation_id,
                c.customer_id,
                c.conversation_type,
                c.order_id,
                c.subject,
                c.created_at,
                c.updated_at,
                cu.username AS customer_username,
                cu.first_name AS customer_first_name,
                cu.last_name AS customer_last_name,
                cu.email AS customer_email,
                o.status AS order_status,
                o.fulfillment AS order_fulfillment,
                o.payment_status AS order_payment_status,
                o.payment_method AS order_payment_method,
                o.created_at AS order_created_at
             FROM conversations c
             INNER JOIN users cu ON cu.id = c.customer_id
             LEFT JOIN orders o ON o.id = c.order_id
             WHERE c.conversation_id = ?
             ${customerFilter}
             LIMIT 1
             ${forUpdate ? 'FOR UPDATE' : ''}`,
            params
        );

        if (!rows.length) {
            throw new MessagingError(404, 'Conversation not found.', 'CONVERSATION_NOT_FOUND');
        }

        return rows[0];
    }

    function mapConversation(row) {
        return {
            conversationId: Number(row.conversation_id),
            conversationType: row.conversation_type,
            customerId: Number(row.customer_id),
            customerName: displayName(
                row.customer_first_name,
                row.customer_last_name,
                row.customer_username,
                'Customer'
            ),
            customerEmail: row.customer_email || null,
            orderId: row.order_id || null,
            subject: row.subject || null,
            orderStatus: row.order_status || null,
            orderFulfillment: row.order_fulfillment || null,
            orderPaymentStatus: row.order_payment_status || null,
            orderPaymentMethod: row.order_payment_method || null,
            orderCreatedAt: row.order_created_at || null,
            latestMessage: row.latest_message || null,
            latestSenderType: row.latest_sender_type || null,
            latestEventKey: row.latest_event_key || null,
            latestMessageAt: row.latest_message_at || null,
            unreadCount: Number(row.unread_count || 0),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async function listConversations(actorInput, { conversationType = null } = {}) {
        const actor = normalizeActor(actorInput);
        let type = null;

        if (conversationType !== null && conversationType !== undefined && conversationType !== '') {
            type = normalizeConversationType(conversationType);
        }

        const conditions = [];
        const params = [];

        if (actor.role === 'customer') {
            conditions.push('c.customer_id = ?');
            params.push(actor.id);
        }

        if (type) {
            conditions.push('c.conversation_type = ?');
            params.push(type);
        }

        const unreadSenderClause =
            actor.role === 'admin'
                ? `(m.sender_type = 'customer' AND (m.event_key IS NULL OR m.event_key NOT LIKE 'ai_question:%'))`
                : `m.sender_type IN ('admin', 'system')`;

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await database.query(
            `SELECT
                c.conversation_id,
                c.customer_id,
                c.conversation_type,
                c.order_id,
                c.subject,
                c.created_at,
                c.updated_at,
                cu.username AS customer_username,
                cu.first_name AS customer_first_name,
                cu.last_name AS customer_last_name,
                cu.email AS customer_email,
                o.status AS order_status,
                o.fulfillment AS order_fulfillment,
                o.payment_status AS order_payment_status,
                o.payment_method AS order_payment_method,
                o.created_at AS order_created_at,
                (
                    SELECT cm.message
                    FROM conversation_messages cm
                    WHERE cm.conversation_id = c.conversation_id
                    ORDER BY cm.created_at DESC, cm.message_id DESC
                    LIMIT 1
                ) AS latest_message,
                (
                    SELECT cm.sender_type
                    FROM conversation_messages cm
                    WHERE cm.conversation_id = c.conversation_id
                    ORDER BY cm.created_at DESC, cm.message_id DESC
                    LIMIT 1
                ) AS latest_sender_type,
                (
                    SELECT cm.event_key
                    FROM conversation_messages cm
                    WHERE cm.conversation_id = c.conversation_id
                    ORDER BY cm.created_at DESC, cm.message_id DESC
                    LIMIT 1
                ) AS latest_event_key,
                (
                    SELECT cm.created_at
                    FROM conversation_messages cm
                    WHERE cm.conversation_id = c.conversation_id
                    ORDER BY cm.created_at DESC, cm.message_id DESC
                    LIMIT 1
                ) AS latest_message_at,
                (
                    SELECT COUNT(*)
                    FROM conversation_messages m
                    WHERE m.conversation_id = c.conversation_id
                      AND m.read_at IS NULL
                      AND ${unreadSenderClause}
                ) AS unread_count
             FROM conversations c
             INNER JOIN users cu ON cu.id = c.customer_id
             LEFT JOIN orders o ON o.id = c.order_id
             ${whereClause}
             ORDER BY c.updated_at DESC, c.conversation_id DESC`,
            params
        );

        return rows.map(mapConversation);
    }

    async function getConversation(actorInput, conversationId) {
        const actor = normalizeActor(actorInput);
        const conversation = await getAccessibleConversation(database, actor, conversationId);

        const [messages] = await database.query(
            `SELECT
                m.message_id,
                m.sender_id,
                m.sender_type,
                m.message,
                m.read_at,
                m.event_key,
                m.created_at,
                su.username AS sender_username,
                su.first_name AS sender_first_name,
                su.last_name AS sender_last_name
             FROM conversation_messages m
             LEFT JOIN users su ON su.id = m.sender_id
             WHERE m.conversation_id = ?
             ORDER BY m.created_at ASC, m.message_id ASC`,
            [conversation.conversation_id]
        );

        return {
            conversation: mapConversation(conversation),
            messages: messages.map(row => ({
                messageId: Number(row.message_id),
                senderId: row.sender_id === null ? null : Number(row.sender_id),
                senderType: row.sender_type,
                senderName:
                    row.sender_type === 'system'
                        ? (String(row.event_key || '').startsWith('ai_')
                            ? 'Rayjin Assistant'
                            : 'Rayjin Hardware')
                        : displayName(
                            row.sender_first_name,
                            row.sender_last_name,
                            row.sender_username,
                            row.sender_type === 'admin' ? 'Rayjin Hardware' : 'Customer'
                        ),
                message: row.message,
                eventKey: row.event_key || null,
                readAt: row.read_at || null,
                createdAt: row.created_at,
            })),
        };
    }

    async function createConversation(actorInput, input = {}) {
        const actor = normalizeActor(actorInput);

        if (actor.role !== 'customer') {
            throw new MessagingError(
                403,
                'Customers create conversations from the customer account. Admin can reply to existing conversations.',
                'CUSTOMER_CREATION_ONLY'
            );
        }

        const conversationType = normalizeConversationType(
            input.conversationType ?? input.type
        );

        const connection = await database.getConnection();

        try {
            await connection.beginTransaction();

            if (conversationType === 'general') {
                const subject = normalizeSubject(input.subject);
                const firstMessage = normalizeMessage(input.message);

                const [result] = await connection.query(
                    `INSERT INTO conversations
                        (customer_id, conversation_type, order_id, subject)
                     VALUES (?, 'general', NULL, ?)`,
                    [actor.id, subject]
                );

                const conversationId = Number(result.insertId);

                await insertMessage(connection, {
                    conversationId,
                    senderId: actor.id,
                    senderType: 'customer',
                    message: firstMessage,
                });

                await connection.commit();
                return getConversation(actor, conversationId);
            }

            const orderId = String(input.orderId || '').trim();

            if (!orderId) {
                throw new MessagingError(400, 'Order ID is required.', 'ORDER_ID_REQUIRED');
            }

            const [orders] = await connection.query(
                `SELECT id, user_id, created_at
                 FROM orders
                 WHERE id = ?
                   AND user_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [orderId, actor.id]
            );

            if (!orders.length) {
                throw new MessagingError(404, 'Order not found.', 'ORDER_NOT_FOUND');
            }

            const conversationId = await ensureOrderConversation(connection, {
                orderId,
                customerId: actor.id,
                createdAt: orders[0].created_at,
            });

            if (input.message !== undefined && String(input.message || '').trim()) {
                await insertMessage(connection, {
                    conversationId,
                    senderId: actor.id,
                    senderType: 'customer',
                    message: input.message,
                });
            }

            await connection.commit();
            return getConversation(actor, conversationId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async function sendMessage(actorInput, conversationId, value) {
        const actor = normalizeActor(actorInput);
        const message = normalizeMessage(value);
        const connection = await database.getConnection();

        try {
            await connection.beginTransaction();
            const conversation = await getAccessibleConversation(
                connection,
                actor,
                conversationId,
                { forUpdate: true }
            );

            let result;

            if (
                actor.role === 'admin' &&
                conversation.conversation_type === 'order' &&
                conversation.order_id &&
                conversation.order_status !== 'completed'
            ) {
                const [historyResult] = await connection.query(
                    `INSERT INTO order_status_history
                        (order_id, from_status, to_status, admin_id, note)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        conversation.order_id,
                        conversation.order_status,
                        conversation.order_status,
                        actor.id,
                        message,
                    ]
                );

                await connection.query(
                    `UPDATE orders
                     SET admin_message = ?
                     WHERE id = ?`,
                    [message, conversation.order_id]
                );

                result = await insertMessage(connection, {
                    conversationId: conversation.conversation_id,
                    senderId: actor.id,
                    senderType: 'admin',
                    message,
                    eventKey: `order-admin-history:${historyResult.insertId}`,
                });
            } else {
                result = await insertMessage(connection, {
                    conversationId: conversation.conversation_id,
                    senderId: actor.id,
                    senderType: actor.role,
                    message,
                });
            }

            await connection.commit();

            return {
                messageId: result.messageId,
                conversationId: Number(conversation.conversation_id),
                senderType: actor.role,
                message: result.message,
                createdAt: result.createdAt,
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async function sendAssistantExchange(
        actorInput,
        conversationId,
        { question, answer, exchangeId, handoff = false }
    ) {
        const actor = normalizeActor(actorInput);
        if (actor.role !== 'customer') {
            throw new MessagingError(403, 'Customer access required.', 'CUSTOMER_ACCESS_REQUIRED');
        }

        const cleanQuestion = normalizeMessage(question);
        const cleanAnswer = normalizeMessage(answer);
        const cleanExchangeId = String(exchangeId || '').trim();
        if (!cleanExchangeId) {
            throw new MessagingError(400, 'AI exchange identifier is required.', 'AI_EXCHANGE_ID_REQUIRED');
        }

        const connection = await database.getConnection();
        try {
            await connection.beginTransaction();
            const conversation = await getAccessibleConversation(
                connection,
                actor,
                conversationId,
                { forUpdate: true }
            );

            const questionEventKey = handoff
                ? `ai_handoff_question:${cleanExchangeId}`
                : `ai_question:${cleanExchangeId}`;
            const answerEventKey = handoff
                ? `ai_handoff:${cleanExchangeId}`
                : `ai_response:${cleanExchangeId}`;

            const questionResult = await insertMessage(connection, {
                conversationId: conversation.conversation_id,
                senderId: actor.id,
                senderType: 'customer',
                message: cleanQuestion,
                eventKey: questionEventKey,
            });

            const answerResult = await insertMessage(connection, {
                conversationId: conversation.conversation_id,
                senderId: null,
                senderType: 'system',
                message: cleanAnswer,
                eventKey: answerEventKey,
            });

            await connection.commit();
            return {
                conversationId: Number(conversation.conversation_id),
                questionMessageId: questionResult.messageId,
                answerMessageId: answerResult.messageId,
                handoff,
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async function sendSystemMessage(actorInput, conversationId, value, { eventKey = null } = {}) {
        const actor = normalizeActor(actorInput);
        const message = normalizeMessage(value);
        const cleanEventKey = eventKey === null || eventKey === undefined
            ? null
            : String(eventKey).trim() || null;
        const connection = await database.getConnection();

        try {
            await connection.beginTransaction();
            const conversation = await getAccessibleConversation(
                connection,
                actor,
                conversationId,
                { forUpdate: true }
            );

            const result = await insertMessage(connection, {
                conversationId: conversation.conversation_id,
                senderId: null,
                senderType: 'system',
                message,
                eventKey: cleanEventKey,
            });

            await connection.commit();

            return {
                inserted: result.inserted,
                messageId: result.messageId,
                conversationId: Number(conversation.conversation_id),
                senderType: 'system',
                message: result.message,
                eventKey: cleanEventKey,
                createdAt: result.createdAt,
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async function markRead(actorInput, conversationId) {
        const actor = normalizeActor(actorInput);
        const connection = await database.getConnection();

        try {
            await connection.beginTransaction();
            const conversation = await getAccessibleConversation(
                connection,
                actor,
                conversationId,
                { forUpdate: true }
            );

            const senderClause =
                actor.role === 'admin'
                    ? `sender_type = 'customer'`
                    : `sender_type IN ('admin', 'system')`;

            const [result] = await connection.query(
                `UPDATE conversation_messages
                 SET read_at = NOW()
                 WHERE conversation_id = ?
                   AND read_at IS NULL
                   AND ${senderClause}`,
                [conversation.conversation_id]
            );

            await connection.commit();

            return {
                conversationId: Number(conversation.conversation_id),
                markedRead: Number(result.affectedRows || 0),
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async function unreadCount(actorInput) {
        const actor = normalizeActor(actorInput);
        const senderClause =
            actor.role === 'admin'
                ? `(m.sender_type = 'customer' AND (m.event_key IS NULL OR m.event_key NOT LIKE 'ai_question:%'))`
                : `m.sender_type IN ('admin', 'system')`;
        const customerClause = actor.role === 'customer' ? 'AND c.customer_id = ?' : '';
        const params = actor.role === 'customer' ? [actor.id] : [];

        const [[row]] = await database.query(
            `SELECT COUNT(*) AS unread_count
             FROM conversation_messages m
             INNER JOIN conversations c ON c.conversation_id = m.conversation_id
             WHERE m.read_at IS NULL
               AND ${senderClause}
               ${customerClause}`,
            params
        );

        return Number(row?.unread_count || 0);
    }

    return {
        listConversations,
        getConversation,
        createConversation,
        sendMessage,
        sendAssistantExchange,
        sendSystemMessage,
        markRead,
        unreadCount,
    };
}

export const messagingLimits = {
    maxMessageLength: MAX_MESSAGE_LENGTH,
    maxSubjectLength: MAX_SUBJECT_LENGTH,
    minSubjectLength: MIN_SUBJECT_LENGTH,
};
