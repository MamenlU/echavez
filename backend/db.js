import 'dotenv/config';
import pg from 'pg';

const { Pool, types } = pg;

// Preserve the numeric ID behavior that the existing mysql2 routes expect.
types.setTypeParser(20, (value) => Number(value));

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
// node-postgres currently interprets sslmode=require as verify-full and lets
// the URL override the explicit SSL object. Supabase's shared pooler requires
// encryption, while certificate-chain verification needs their downloaded CA.
databaseUrl?.searchParams.delete('sslmode');

const nativePool = new Pool({
    connectionString: databaseUrl?.toString(),
    max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 1 : 5)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: { rejectUnauthorized: false },
});

function replacePlaceholders(sql) {
    let output = '';
    let parameter = 0;
    let quote = null;
    let lineComment = false;
    let blockComment = false;

    for (let index = 0; index < sql.length; index += 1) {
        const char = sql[index];
        const next = sql[index + 1];

        if (lineComment) {
            output += char;
            if (char === '\n') lineComment = false;
            continue;
        }
        if (blockComment) {
            output += char;
            if (char === '*' && next === '/') {
                output += next;
                index += 1;
                blockComment = false;
            }
            continue;
        }
        if (quote) {
            output += char;
            if (char === quote) {
                if (next === quote) {
                    output += next;
                    index += 1;
                } else {
                    quote = null;
                }
            }
            continue;
        }
        if (char === '-' && next === '-') {
            output += char + next;
            index += 1;
            lineComment = true;
            continue;
        }
        if (char === '/' && next === '*') {
            output += char + next;
            index += 1;
            blockComment = true;
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            output += char;
            continue;
        }
        if (char === '?') {
            parameter += 1;
            output += `$${parameter}`;
            continue;
        }
        output += char;
    }

    return output;
}

function prepareSql(input) {
    let sql = String(input).trim().replace(/`([^`]+)`/g, '$1');
    sql = replacePlaceholders(sql);

    // mysql2 exposes insertId automatically. PostgreSQL needs RETURNING.
    if (/^INSERT\s+INTO\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
        sql = `${sql.replace(/;\s*$/, '')} RETURNING *`;
    }

    return sql;
}

function insertedId(rows) {
    const row = rows?.[0];
    if (!row) return 0;
    if (Object.hasOwn(row, 'id')) return row.id;
    const idKey = Object.keys(row).find((key) => key.endsWith('_id'));
    return idKey ? row[idKey] : 0;
}

function mysqlResult(result, sql) {
    const isSelect = /^(SELECT|WITH|SHOW|DESCRIBE|EXPLAIN)\b/i.test(sql);
    const payload = isSelect
        ? result.rows
        : {
            insertId: insertedId(result.rows),
            affectedRows: result.rowCount ?? 0,
            changedRows: result.rowCount ?? 0,
        };
    return [payload, result.fields || []];
}

function normalizeDatabaseError(error) {
    if (error?.code === '23505') error.code = 'ER_DUP_ENTRY';
    if (error?.code === '23503') error.code = 'ER_NO_REFERENCED_ROW_2';
    return error;
}

async function runQuery(executor, sql, parameters = []) {
    const preparedSql = prepareSql(sql);
    try {
        const result = await executor.query(preparedSql, parameters);
        return mysqlResult(result, preparedSql);
    } catch (error) {
        throw normalizeDatabaseError(error);
    }
}

function wrapClient(client) {
    return {
        query: (sql, parameters) => runQuery(client, sql, parameters),
        execute: (sql, parameters) => runQuery(client, sql, parameters),
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK'),
        release: () => client.release(),
    };
}

const pool = {
    query: (sql, parameters) => runQuery(nativePool, sql, parameters),
    execute: (sql, parameters) => runQuery(nativePool, sql, parameters),
    getConnection: async () => wrapClient(await nativePool.connect()),
    end: () => nativePool.end(),
};

if (databaseUrl && process.env.NODE_ENV !== 'production') {
    nativePool.query('SELECT current_database() AS database_name')
        .then(() => console.log('Connected to Supabase PostgreSQL database!'))
        .catch((error) => console.error('DB connection error:', error.message));
}

export default pool;
