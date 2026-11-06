// A mail adapter that writes to a file instead of sending. Everything the real
// one would deliver — the reset link, the verification link — lands in
// outbox/mail.log, so the lab can check what was actually sent and to whom.
const { appendFileSync } = require('node:fs');

module.exports = function () {
  const write = (kind, opts) => {
    appendFileSync('/parse-server/outbox/mail.log',
      JSON.stringify({ kind, to: opts.user?.get('email') ?? opts.to, at: new Date().toISOString() }) + '\n');
    return Promise.resolve();
  };
  return {
    sendMail: (opts) => write('mail', opts),
    sendVerificationEmail: (opts) => write('verification', opts),
    sendPasswordResetEmail: (opts) => write('password-reset', opts),
  };
};
