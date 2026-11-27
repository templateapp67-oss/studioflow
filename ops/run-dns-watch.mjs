import { dnsWatchResolvers, runDnsWatch } from '../server/dnsWatch.mjs';

async function main(environment) {
  if (environment.SECURITY_CENTER_DNS_WATCH_ENABLED !== 'true') {
    console.log('DNS watch disabled');
    return;
  }
  const connectionString = environment.SECURITY_CENTER_DNS_MONITOR_DATABASE_URL;
  const url = new URL(connectionString);
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || url.search || url.hash ||
      !url.hostname || !url.username || !url.password) throw new Error('Invalid database configuration');
  const resolvers = dnsWatchResolvers(environment);
  const {Pool} = await import('pg');
  const pool = new Pool({
    connectionString,max: 2,connectionTimeoutMillis: 3000,
    statement_timeout: 5000,query_timeout: 6000,
    ssl: {
      rejectUnauthorized: true,
      ...(environment.SECURITY_CENTER_DATABASE_CA ? {ca: environment.SECURITY_CENTER_DATABASE_CA} : {}),
    },
  });
  pool.on('error',() => {});
  try {
    const result = await runDnsWatch({database: pool,resolvers});
    console.log(JSON.stringify(result));
    if (result.errors) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main(process.env).catch(() => {
  console.error('DNS watch failed. Inspect restricted service diagnostics.');
  process.exitCode = 1;
});
