import { createECDH, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envPath = new URL('../.env.push.local', import.meta.url);
const sqlPath = new URL('./admin-push.local.sql', import.meta.url);
if (!existsSync(envPath)) {
  const key = createECDH('prime256v1');
  key.generateKeys();
  writeFileSync(envPath, [
    `VAPID_PUBLIC_KEY=${key.getPublicKey().toString('base64url')}`,
    `VAPID_PRIVATE_KEY=${key.getPrivateKey().toString('base64url')}`,
    'VAPID_SUBJECT=https://app-kottab-v2.bouakkaz-mosque-school.workers.dev',
    `PUSH_DISPATCH_SECRET=${randomBytes(32).toString('hex')}`,
    '',
  ].join('\n'), { mode: 0o600 });
}
const env = Object.fromEntries(readFileSync(envPath, 'utf8').trim().split(/\r?\n/).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1)];
}));
if (!/^[a-f0-9]{64}$/.test(env.PUSH_DISPATCH_SECRET ?? '')) throw new Error('Invalid local dispatch secret');
const migration = readFileSync(new URL('./add-admin-push.sql', import.meta.url), 'utf8');
const settings = [
  ['admin_push_url', 'https://szypbjvhwaiblnqqevbw.supabase.co/functions/v1/admin-push'],
  ['admin_push_secret', env.PUSH_DISPATCH_SECRET],
].map(([name, value]) => `do $setup$
declare secret_id uuid;
begin
  select id into secret_id from vault.secrets where name = '${name}' limit 1;
  if secret_id is null then
    perform vault.create_secret('${value}', '${name}');
  else
    perform vault.update_secret(secret_id, '${value}', '${name}');
  end if;
end;
$setup$;`).join('\n');
writeFileSync(sqlPath, `${migration}\n-- Private dispatch configuration\n${settings}\n`, { mode: 0o600 });
console.log(`Configuration generated (secret values are not printed):\n${fileURLToPath(envPath)}\n${fileURLToPath(sqlPath)}`);
