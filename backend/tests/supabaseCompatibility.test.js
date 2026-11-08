import test from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.RAYJIN_TEST_REMOTE_DATABASE === '1' && Boolean(process.env.DATABASE_URL);

test('PostgreSQL compatibility adapter reads data and preserves transaction semantics', { skip: !enabled }, async () => {
  const { default: pool } = await import('../db.js');
  const { getSalesFinancialHistory } = await import('../lib/financialMetrics.js');
  const { getReorderSuggestions } = await import('../lib/reorderService.js');
  const { getExpenseRows } = await import('../lib/expenseService.js');
  const { getPublicPopularProducts } = await import('../lib/analyticsService.js');

  try {
    const [users] = await pool.query(
      'SELECT id, username FROM users WHERE id > ? ORDER BY id LIMIT ?',
      [0, 3]
    );
    assert.ok(users.length > 0);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        'INSERT INTO categories (category_name, description, status) VALUES (?, ?, ?)',
        ['__pg_smoke_test__', 'rollback only', 'Inactive']
      );
      assert.ok(Number(result.insertId) > 0);
      await connection.rollback();
    } finally {
      connection.release();
    }

    const [[rollbackCheck]] = await pool.query(
      'SELECT COUNT(*)::integer AS count FROM categories WHERE category_name = ?',
      ['__pg_smoke_test__']
    );
    assert.equal(rollbackCheck.count, 0);

    const [financialHistory, reorderSuggestions, expenses, popularProducts] = await Promise.all([
      getSalesFinancialHistory(pool),
      getReorderSuggestions(pool),
      getExpenseRows(pool, { limit: 10 }),
      getPublicPopularProducts(pool, { period: 'month', limit: 5 }),
    ]);
    assert.ok(financialHistory && typeof financialHistory === 'object');
    assert.ok(reorderSuggestions && typeof reorderSuggestions === 'object');
    assert.ok(expenses && typeof expenses === 'object');
    assert.ok(popularProducts && typeof popularProducts === 'object');
  } finally {
    await pool.end();
  }
});
