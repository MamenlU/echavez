// Read-only verification for the Rayjin Hardware messaging foundation.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const databaseName = process.env.DB_NAME || 'echavez_web';
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
});

try {
  console.log(`Checking messaging foundation on: ${databaseName}`);

  const [tables] = await connection.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('conversations', 'conversation_messages')
    ORDER BY TABLE_NAME
  `);

  console.log(`Messaging tables found: ${tables.map((row) => row.TABLE_NAME).join(', ') || 'none'}`);

  if (tables.length !== 2) {
    throw new Error('Expected both conversations and conversation_messages tables.');
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
      (SELECT COUNT(*) FROM conversation_messages WHERE event_key LIKE 'legacy-current:%') AS legacy_fallback_messages,
      (SELECT COUNT(*) FROM conversation_messages WHERE event_key IS NOT NULL) AS keyed_messages
  `);

  console.table([summary]);

  const [[missingHistoryImports]] = await connection.query(`
    SELECT COUNT(*) AS count
    FROM order_status_history h
    WHERE h.admin_id IS NOT NULL
      AND h.from_status = h.to_status
      AND h.note IS NOT NULL
      AND TRIM(h.note) <> ''
      AND h.note <> 'Admin message cleared'
      AND NOT EXISTS (
        SELECT 1
        FROM conversation_messages cm
        WHERE cm.event_key = CONCAT('legacy-history:', h.history_id)
      )
  `);

  const [[missingFallbackImports]] = await connection.query(`
    SELECT COUNT(*) AS count
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
      AND NOT EXISTS (
        SELECT 1
        FROM conversation_messages cm
        WHERE cm.event_key = CONCAT('legacy-current:', o.id)
      )
  `);

  const [[orphanMessages]] = await connection.query(`
    SELECT COUNT(*) AS count
    FROM conversation_messages cm
    LEFT JOIN conversations c ON c.conversation_id = cm.conversation_id
    WHERE c.conversation_id IS NULL
  `);

  console.log(`Legacy history rows still missing from new messaging storage: ${Number(missingHistoryImports.count || 0)}`);
  console.log(`Visible legacy fallback messages still missing from new messaging storage: ${Number(missingFallbackImports.count || 0)}`);
  console.log(`Orphan conversation messages: ${Number(orphanMessages.count || 0)}`);

  if (
    Number(missingHistoryImports.count || 0) !== 0 ||
    Number(missingFallbackImports.count || 0) !== 0 ||
    Number(orphanMessages.count || 0) !== 0
  ) {
    throw new Error('Messaging foundation verification found an inconsistency.');
  }

  console.log('Messaging foundation verification passed.');
} catch (error) {
  console.error('Messaging foundation verification failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
