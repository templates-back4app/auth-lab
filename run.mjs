// Two ways to have a login: the one an assistant writes when you ask for one,
// and the one that comes with the backend. The same four questions are asked of
// both, and the answers come out of the database itself where that is the point.
import { anon, owner, waitUp } from './client.mjs';
import { execSync } from 'node:child_process';

await waitUp();
const line = (q, a) => console.log(`    ${q.padEnd(48)}${a}`);
const mongo = (js) => execSync(
  `docker compose exec -T mongo mongosh dev --quiet --eval ${JSON.stringify(js)}`,
  { cwd: import.meta.dirname, encoding: 'utf8' }).trim();

// ── the login an assistant writes when asked for "a login" ──────────────────
console.log('');
console.log('  [1/5] WHERE THE PASSWORD ENDS UP');
console.log('');
await owner.post('/classes/Account', { email: 'ana@example.com', password: 'correct-horse-1', name: 'Ana' });
await anon.post('/users', { username: 'ana', password: 'correct-horse-1', email: 'ana@example.com' });

line('hand-written Account row, as stored:', mongo('JSON.stringify(db.Account.findOne({}, {email:1, password:1, _id:0}))'));
line('the built-in user row, as stored:', mongo('const u = db.getCollection("_User").findOne({}, {username:1, _hashed_password:1, _id:0}); JSON.stringify({username: u.username, password: (u._hashed_password||"").slice(0,29) + "..."})'));

const strangerReads = await anon.get('/classes/Account?limit=10');
line('a stranger reading the Account table:', strangerReads.ok
  ? `${strangerReads.json.results.length} row(s) — ${strangerReads.json.results[0]?.password ? 'password included' : 'no password field'}`
  : 'refused');

// ── how many guesses the login will take ────────────────────────────────────
console.log('');
console.log('  [2/5] HOW MANY GUESSES THE LOGIN WILL TAKE');
console.log('');
const started = Date.now();
const N = 150;
const results = [];
for (let i = 0; i < N; i += 25) {
  results.push(...await Promise.all(Array.from({ length: 25 }, (_, j) =>
    anon.get(`/login?username=ana&password=wrong-${i + j}`).catch(() => ({ status: 0 })))));
}
const seconds = (Date.now() - started) / 1000;
const locked = results.filter((r) => r.status === 429 || /locked|too many/i.test(r.text ?? '')).length;
line(`${N} wrong passwords in a row:`, `${results.length - locked} were answered, ${locked} were refused for trying`);
line('how long that took:', `${seconds.toFixed(1)}s — ${(N / seconds).toFixed(0)} guesses per second`);
const right = await anon.get('/login?username=ana&password=correct-horse-1');
line('the correct password, straight afterwards:', right.ok ? 'accepted — the account was never locked' : `refused — ${right.json.error}`);

// ── what a new account can do before anyone proves the address ──────────────
console.log('');
console.log('  [3/5] WHAT A NEW ACCOUNT CAN DO BEFORE THE ADDRESS IS PROVED');
console.log('');
const made = await anon.post('/users', { username: 'bruno', password: 'correct-horse-2', email: 'someone.elses@example.com' });
line('sign-up with an address we do not own:', made.ok ? 'accepted' : `refused — ${made.json.error}`);
line('it came back with a working session:', made.json.sessionToken ? 'yes' : 'no');
const me = await anon.get('/users/me', { session: made.json.sessionToken });
line('that session can use the app:', me.ok ? `yes — signed in as ${me.json.username}` : 'no');
line('emailVerified on the new account:', String(mongo('JSON.stringify(db.getCollection("_User").findOne({username:"bruno"}).emailVerified ?? null)')));

// ── who can ask for a password reset ────────────────────────────────────────
console.log('');
console.log('  [4/5] WHAT HAPPENS IF SOMEONE FORGETS THEIR PASSWORD');
console.log('');
const reset = await anon.post('/requestPasswordReset', { email: 'ana@example.com' });
line('asking for a password reset:', reset.ok ? 'accepted' : 'refused');
if (!reset.ok) {
  console.log(`      ${reset.json.error}`);
  console.log('      So on a backend nobody has configured, there is no reset and no');
  console.log('      verification at all — not a weak one, none. Stage 5 switches them on.');
}
console.log('');
