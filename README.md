# auth-lab

[![Deploy on Back4app](https://img.shields.io/badge/Deploy%20on-Back4app-1568B8?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3eiIvPjwvc3ZnPg==)](https://www.back4app.com/signup?utm_source=github&utm_medium=repo&utm_campaign=auth-lab)

Two ways to have a login in the same backend — one written by hand, one that came
with the server — and the same questions asked of both. Where the answer is about
storage, it is read straight out of MongoDB rather than inferred.

**Measured on Parse Server 7.4.0 with MongoDB 7, Docker 29.4.3, 29 October 2026.
Identical across two consecutive clean runs.**

> **Read the article:** [Why AI-Generated Login Code Is Unsafe: Four Things a Login Must Do, Measured](https://www.back4app.com/blog/why-ai-generated-login-code-is-unsafe?utm_source=github&utm_medium=repo&utm_campaign=auth-lab)

## Run it

```
./run.sh
```

Needs Docker and Node 22. The backend is destroyed and rebuilt every run.

## What it found

### The password, as the database holds it

```
hand-written Account row, as stored:   {"email":"ana@example.com","password":"correct-horse-1"}
the built-in user row, as stored:      {"username":"ana","password":"$2y$10$LvgkIhFFP1Onv6JfzErUI..."}
a stranger reading the Account table:  1 row(s) — password included
```

### There is no lockout

```
150 wrong passwords in a row:               150 were answered, 0 were refused for trying
how long that took:                         2.4s — 61 guesses per second
the correct password, straight afterwards:  accepted — the account was never locked
```

### Verification switched on verifies nothing by itself

```
sign-up, with verification switched on:     accepted
what the server sent:                       verification
it came back with a working session:        yes
that session can use the app, unverified:   yes
signing in again, still unverified:         accepted
```

`verifyUserEmails` sends the mail. It does not refuse the account — that is a
second setting, and an app that stops at the first one has a verification step
nobody has to complete.

### The password reset is better than its reputation

```
a stranger asks for a reset on that address:  accepted
the same for an address with no account:      accepted — the same answer
reset mails actually sent:                    1
and who they went to:                         the account holder
```

Identical answers for known and unknown addresses, so the endpoint does not
confirm who has an account, and the link goes to the owner rather than the
asker. What it is missing is a rate limit: it is an unthrottled way to make your
server send mail.

## The pieces

| file | what it does |
| --- | --- |
| `run.mjs` | storage, guessing, and what an unverified account can do |
| `verify.mjs` | the same backend with e-mail verification switched on |
| `cloud/mail.js` | a mail adapter that writes to a file instead of sending |
| `parse-config.json` | verification on; it needs a config file, not env vars |
