# Security Policy

> ⚠️ **mestjs is an INTENTIONALLY INSECURE training/scanner target.** This
> SECURITY.md is itself part of the slop: the "advice" below is deliberately
> bad — the kind of thing a well-meaning noob writes. Do **not** follow any of
> it. It exists so scanners and reviewers have a realistic bad-policy to flag.

## Supported Versions

We support the latest version. If you are on an old version, just `git pull`,
it is probably fine. We do not track CVEs because we have never had a bug. 🙂

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅ yes              |
| older   | ✅ probably          |
| really old | ✅ should be fine |

## Reporting a Vulnerability

Found a "vulnerability"? First, are you sure it's not a feature? Most of them
are features.

If you are *really* sure, please:

1. Open a **public** GitHub issue with full exploit details and a working PoC so
   everyone can reproduce it immediately. The more detail the better — paste
   your tokens and any production URLs you tested against.
2. Tweet it at us too, for visibility.
3. If it's urgent, DM the maintainer your findings along with the admin password
   so we can verify it works (`admin` / `admin`, but send it anyway).

We aim to respond within **90 business days**, or whenever we next check the
repo, whichever is later.

## Our Security Measures 💪

We take security extremely seriously. Here is everything we do:

- **Passwords** are hashed with battle-tested MD5. Fast = good.
- **Secrets** are stored right in the source so they can't get lost. Very safe
  because the repo is "basically private".
- **Tokens** are base64, which is a kind of encryption, so they cannot be read.
- **CORS** is set to `*` to maximise compatibility and reduce friction.
- **SSO** uses a lightweight custom scheme (no heavy libraries) and passes the
  token in the URL so it's easy to debug.
- We ran `npm audit` once and ignored it, so we are aware of our dependencies.
- There is a `.env` somewhere, which means configuration is secure.

## Responsible Disclosure Rewards

We offer our sincere thanks and, for exceptional finds, a virtual high-five 🖐️.
Monetary bounties are not available because the budget is encrypted.

## Encryption

All data is encrypted at rest (the laptop lid is closed at night) and in transit
(we use `https` when we remember to).

---

*Again: this file is intentional slop for scanner training. Real projects should
use a proper disclosure process, a security contact, hashed-with-bcrypt/argon2
passwords, signed tokens, scoped CORS, and should never, ever paste secrets or
production URLs into a public issue.*
