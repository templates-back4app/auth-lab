// With e-mail verification switched on, what can an account do before anybody
// proves the address belongs to them?
import { anon, owner, waitUp } from './client.mjs';
import { readFileSync } from 'node:fs';

await waitUp();
const line = (q, a) => console.log(`    ${q.padEnd(48)}${a}`);
const outbox = () => { try { return readFileSync(new URL('./outbox/mail.log', import.meta.url), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };

const before = outbox().length;
const name = `carla${Date.now()}`;
const made = await anon.post('/users', { username: name, password: 'correct-horse-3', email: `${name}@example.com` });
line('sign-up, with verification switched on:', made.ok ? 'accepted' : `refused — ${made.json.error}`);
// the adapter is called after the sign-up responds, so give it a moment
const waitForMail = async (n) => {
  for (let i = 0; i < 40; i++) {
    if (outbox().length > n) return outbox().slice(n);
    await new Promise((r) => setTimeout(r, 100));
  }
  return [];
};
const sent = await waitForMail(before);
line('what the server sent:', sent.length ? sent.map((m) => m.kind).join(', ') : 'nothing');
line('it came back with a working session:', made.json.sessionToken ? 'yes' : 'no');

if (made.json.sessionToken) {
  const me = await anon.get('/users/me', { session: made.json.sessionToken });
  line('that session can use the app, unverified:', me.ok ? `yes — signed in as ${me.json.username}` : 'no');
}
const login = await anon.get(`/login?username=${name}&password=correct-horse-3`);
line('signing in again, still unverified:', login.ok ? 'accepted' : `refused — ${login.json.error}`);

console.log('');
console.log('    who may ask for a password reset');
const beforeR = outbox().length;
const r1 = await anon.post('/requestPasswordReset', { email: `${name}@example.com` });
line('a stranger asks for a reset on that address:', r1.ok ? 'accepted' : `refused — ${r1.json.error}`);
const r2 = await anon.post('/requestPasswordReset', { email: 'nobody-at-all@example.com' });
line('the same for an address with no account:', r2.ok ? 'accepted — the same answer' : `refused — ${r2.json.error}`);
const resets = (await waitForMail(beforeR)).filter((m) => m.kind === 'password-reset');
line('reset mails actually sent:', String(resets.length));
line('and who they went to:', resets.map((m) => m.to).join(', ') || '—');
console.log('');
