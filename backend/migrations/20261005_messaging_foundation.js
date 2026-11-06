// Focused, idempotent migration for the Rayjin Hardware messaging foundation.
//
// This migration is ADDITIVE ONLY:
// - creates conversations
// - creates conversation_messages
// - copies legacy customer-visible Admin order messages into the new structure
// - leaves orders.admin_message and order_status_history untouched
//
// It does NOT change order status logic, PayMongo, inventory, sales, delivery,
// product fulfillment rules, authentication, or historical transaction records.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const COMPLETION_CUSTOMER_MESSAGE =
  'Thank you for your purchase from Rayjin Hardware! Your order has been successfully completed. We appreciate your business and look forward to serving you again.';

const databaseName = process.env.DB_NAME || 'echavez_web';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
});

async function tableExists(tableName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );

  return rows.length > 0;
}

async function requireSourceTables() {
  for (const tableName of ['users', 'orders', 'order_status_history']) {
    if (!(await tableExists(tableName))) {
      throw new Error(`Required source table "${tableName}" does not exist in ${databaseName}.`);
    }
  }
}

async function ensureMessagingTables() {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      conversation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_id INT NOT NULL,
      conversation_type ENUM('general','order') NOT NULL,
      order_id VARCHAR(50) DEFAULT NULL,
      subject VARCHAR(150) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id),
      UNIQUE KEY uq_conversations_order (order_id),
      KEY idx_conversations_customer_updated (customer_id, updated_at),
      KEY idx_conversations_type_updated (conversation_type, updated_at),
      CONSTRAINT fk_conversations_customer
        FOREIGN KEY (customer_id) REFERENCES users (id),
      CONSTRAINT fk_conversations_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      conversation_id BIGINT UNSIGNED NOT NULL,
      sender_id INT DEFAULT NULL,
      sender_type ENUM('customer','admin','system') NOT NULL,
      message TEXT NOT NULL,
      read_at DATETIME DEFAULT NULL,
      event_key VARCHAR(190) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id),
      UNIQUE KEY uq_conversation_messages_event_key (event_key),
      KEY idx_conversation_messages_conversation_created (conversation_id, created_at, message_id),
      KEY idx_conversation_messages_unread (conversation_id, read_at),
      KEY fk_conversation_messages_sender (sender_id),
      CONSTRAINT fk_conversation_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations (conversation_id)
        ON DELETE CASCADE,
      CONSTRAINT fk_conversation_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

async function getOrCreateOrderConversation({ orderId, customerId, createdAt }) {
  await connection.query(
    `INSERT IGNORE INTO conversations
       (customer_id, conversation_type, order_id, subject, created_at, updated_at)
     VALUES (?, 'order', ?, NULL, ?, ?)`,
    [customerId, orderId, createdAt, createdAt]
  );

  const [[conversation]] = await connection.query(
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

async function insertMessageIfMissing({
  conversationId,
  senderId,
  senderType,
  message,
  eventKey,
  createdAt,
  readAt = null,
}) {
  const [result] = await connection.query(
    `INSERT IGNORE INTO conversation_messages
       (conversation_id, sender_id, sender_type, message, read_at, event_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [conversationId, senderId, senderType, message, readAt, eventKey, createdAt]
  );

  return Number(result.affectedRows || 0) === 1;
}

try {
  console.log(`Running messaging-foundation migration on: ${databaseName}`);

  await requireSourceTables();
  await ensureMessagingTables();
  console.log('Messaging tables are present.');

  let importedHistoryMessages = 0;
  let importedFallbackMessages = 0;
  let fallbackMatchedToHistory = 0;
  let fallbackWithoutHistoryMatch = 0;
  let fallbackAdminMessages = 0;
  let fallbackSystemMessages = 0;

  await connection.beginTransaction();

  try {
    // Source A: the exact rows the existing Customer Dashboard treats as
    // customer-facing Admin message history.
    const [legacyHistoryRows] = await connection.query(`
      SELECT
        h.history_id,
        h.order_id,
        h.admin_id,
        h.note,
        h.created_at,
        o.user_id AS customer_id
      FROM order_status_history h
      INNER JOIN orders o ON o.id = h.order_id
      WHERE h.admin_id IS NOT NULL
        AND h.from_status = h.to_status
        AND h.note IS NOT NULL
        AND TRIM(h.note) <> ''
        AND h.note <> 'Admin message cleared'
      ORDER BY h.created_at ASC, h.history_id ASC
    `);

    for (const row of legacyHistoryRows) {
      const conversationId = await getOrCreateOrderConversation({
        orderId: row.order_id,
        customerId: row.customer_id,
        createdAt: row.created_at,
      });

      const inserted = await insertMessageIfMissing({
        conversationId,
        senderId: row.admin_id,
        senderType: 'admin',
        message: String(row.note),
        eventKey: `legacy-history:${row.history_id}`,
        createdAt: row.created_at,
        // Imported historical messages predate the new inbox and should not
        // suddenly create unread badges when the feature is enabled.
        readAt: row.created_at,
      });

      if (inserted) importedHistoryMessages += 1;
    }

    // Source B: preserve the current orders.admin_message compatibility fallback,
    // but ONLY for orders that have no Source-A history at all. This mirrors the
    // existing Customer Dashboard behavior: admin_message is displayed only when
    // message_history is empty.
    const [fallbackRows] = await connection.query(`
      SELECT
        o.id AS order_id,
        o.user_id AS customer_id,
        o.admin_message,
        o.created_at AS order_created_at,
        o.updated_at AS order_updated_at
      FROM orders o
      WHERE o.admin_message IS NOT NULL
        AND TRIM(o.admin_message) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM order_status_history h
          WHERE h.order_id = o.id
            AND h.admin_id IS NOT NULL
            AND h.from_status = h.to_status
            AND h.note IS NOT NULL
            AND TRIM(h.note) <> ''
            AND h.note <> 'Admin message cleared'
        )
      ORDER BY o.created_at ASC, o.id ASC
    `);

    for (const row of fallbackRows) {
      const cleanMessage = String(row.admin_message).trim();

      // If the fallback text exists anywhere in order history, reuse the original
      // author/timestamp context instead of inventing one.
      const [[matchingHistory]] = await connection.query(
        `SELECT
           history_id,
           admin_id,
           from_status,
           to_status,
           created_at
         FROM order_status_history
         WHERE order_id = ?
           AND note IS NOT NULL
           AND TRIM(note) <> ''
           AND TRIM(note) = ?
         ORDER BY created_at DESC, history_id DESC
         LIMIT 1`,
        [row.order_id, cleanMessage]
      );

      if (matchingHistory) fallbackMatchedToHistory += 1;
      else fallbackWithoutHistoryMatch += 1;

      let senderType = 'admin';
      let senderId = matchingHistory?.admin_id ?? null;

      // The existing completion thank-you is application-generated system text,
      // even though an Admin action may have triggered the Completed transition.
      if (cleanMessage === COMPLETION_CUSTOMER_MESSAGE) {
        senderType = 'system';
        senderId = null;
      } else if (matchingHistory && matchingHistory.admin_id == null) {
        senderType = 'system';
        senderId = null;
      }

      if (senderType === 'system') fallbackSystemMessages += 1;
      else fallbackAdminMessages += 1;

      const createdAt =
        matchingHistory?.created_at || row.order_updated_at || row.order_created_at;

      const conversationId = await getOrCreateOrderConversation({
        orderId: row.order_id,
        customerId: row.customer_id,
        createdAt,
      });

      const inserted = await insertMessageIfMissing({
        conversationId,
        senderId,
        senderType,
        message: cleanMessage,
        eventKey: `legacy-current:${row.order_id}`,
        createdAt,
        // Preserve the legacy message without treating it as a brand-new unread
        // notification in the future Messages inbox.
        readAt: createdAt,
      });

      if (inserted) importedFallbackMessages += 1;
    }

    // Make each imported conversation sort by its latest actual message timestamp.
    await connection.query(`
      UPDATE conversations c
      INNER JOIN (
        SELECT conversation_id, MAX(created_at) AS latest_message_at
        FROM conversation_messages
        GROUP BY conversation_id
      ) m ON m.conversation_id = c.conversation_id
      SET c.updated_at = m.latest_message_at
      WHERE c.conversation_type = 'order'
    `);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  const [[summary]] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM conversations) AS conversations,
      (SELECT COUNT(*) FROM conversations WHERE conversation_type = 'order') AS order_conversations,
      (SELECT COUNT(*) FROM conversations WHERE conversation_type = 'general') AS general_conversations,
      (SELECT COUNT(*) FROM conversation_messages) AS messages,
      (SELECT COUNT(*) FROM conversation_messages WHERE sender_type = 'admin') AS admin_messages,
      (SELECT COUNT(*) FROM conversation_messages WHERE sender_type = 'system') AS system_messages,
      (SELECT COUNT(*) FROM conversation_messages WHERE sender_type = 'customer') AS customer_messages,
      (SELECT COUNT(*) FROM conversation_messages WHERE event_key LIKE 'legacy-history:%') AS legacy_history_messages,
      (SELECT COUNT(*) FROM conversation_messages WHERE event_key LIKE 'legacy-current:%') AS legacy_fallback_messages
  `);

  console.log(`New legacy-history messages inserted this run: ${importedHistoryMessages}`);
  console.log(`New compatibility-fallback messages inserted this run: ${importedFallbackMessages}`);
  console.log(`Fallback rows matched to an existing history row: ${fallbackMatchedToHistory}`);
  console.log(`Fallback rows with no exact history match: ${fallbackWithoutHistoryMatch}`);
  console.log(`Fallback rows classified as Admin: ${fallbackAdminMessages}`);
  console.log(`Fallback rows classified as System: ${fallbackSystemMessages}`);
  console.log('--- Current messaging foundation totals ---');
  console.log(`Conversations: ${Number(summary.conversations || 0)}`);
  console.log(`Order conversations: ${Number(summary.order_conversations || 0)}`);
  console.log(`General conversations: ${Number(summary.general_conversations || 0)}`);
  console.log(`Messages: ${Number(summary.messages || 0)}`);
  console.log(`Admin messages: ${Number(summary.admin_messages || 0)}`);
  console.log(`System messages: ${Number(summary.system_messages || 0)}`);
  console.log(`Customer messages: ${Number(summary.customer_messages || 0)}`);
  console.log(`Imported legacy-history messages: ${Number(summary.legacy_history_messages || 0)}`);
  console.log(`Imported legacy compatibility fallbacks: ${Number(summary.legacy_fallback_messages || 0)}`);
  console.log('Messaging-foundation migration completed successfully.');
} catch (error) {
  console.error('Messaging-foundation migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
