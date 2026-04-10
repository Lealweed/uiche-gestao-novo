const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.txswessunrkuvsexxjuu',
  password: 'Deus2026!@#$',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();

  const tables = [
    'public.shifts',
    'public.transactions',
    'public.cash_movements',
    'public.shift_cash_closings',
    'public.time_punches',
    'public.user_attendance',
    'public.audit_logs',
    'public.transaction_receipts',
    'public.adjustment_requests',
    'public.operator_messages',
  ];

  const result = {};

  for (const tableName of tables) {
    const key = tableName.split('.').pop();
    const existsCheck = await client.query('select to_regclass($1) is not null as exists', [tableName]);

    if (!existsCheck.rows[0]?.exists) {
      result[key] = 0;
      continue;
    }

    const countQuery = await client.query(`select count(*)::bigint as count from ${tableName}`);
    result[key] = Number(countQuery.rows[0]?.count ?? 0);
  }

  const operatorMessagesCheck = await client.query("select to_regclass('public.operator_messages')::text as operator_messages_table");
  result.operator_messages_table = operatorMessagesCheck.rows[0]?.operator_messages_table ?? null;

  const attachmentColumnsCheck = await client.query(`
    select count(*)::int as count
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'operator_messages'
      and column_name in ('attachment_path', 'attachment_name', 'attachment_type', 'attachment_size')
  `);
  result.operator_messages_attachment_columns = Number(attachmentColumnsCheck.rows[0]?.count ?? 0);

  console.log(JSON.stringify(result, null, 2));
  await client.end();
})().catch(async (error) => {
  console.error('VERIFY_RESET_ERROR');
  console.error(error.message);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
