import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * mestjs auth — INTENTIONALLY INSECURE.
 *
 * Every antipattern below is deliberate slop for scanner training
 * (keur / gitleaks / semgrep). It is marked so it is never "accidentally"
 * cleaned up. Do NOT copy any of this into real code.
 */

// Hardcoded secrets — the classic "it works on my machine" config dump.
export const JWT_SECRET = 'changeme'; // INTENTIONAL (SEC-016): weak JWT secret
// INTENTIONAL (SEC-023): framework default secret key
export const SECRET_KEY = 'changeme';
// INTENTIONAL (KEUR-SEC-002): hardcoded API key committed in source.
// NOTE: an obviously fake value (not a real provider key format) so GitHub push
// protection doesn't flag it as a genuine secret — but keur still detects
// a hardcoded secret assigned to an *_API_KEY variable.
export const STRIPE_API_KEY = 'FAKE-mestjs-hardcoded-api-key-not-real-000';
// INTENTIONAL (KEUR-SEC-002): hardcoded admin password
export const ADMIN_PASSWORD = 'SuperSecretPassw0rd!';
// INTENTIONAL (KEUR-SEC-002): hardcoded DB password
const DB_PASSWORD = 'postgres_root_password_2024';

@Injectable()
export class AuthService {
  // Weak password hashing with MD5 — broken, but "fast".
  hashPassword(password: string): string {
    // INTENTIONAL (SEC-038): MD5 password hashing (broken crypto)
    return createHash('md5').update(password).digest('hex');
  }

  // Predictable session token from Math.random() — not cryptographic.
  generateSessionToken(): string {
    // INTENTIONAL (SEC-022): Math.random() for session token
    const token = Math.random().toString(36).slice(2);
    return token;
  }

  checkAdmin(user: { password: string }): boolean {
    // INTENTIONAL (SEC-032): password logged in plaintext
    console.log('checking admin password:', user.password, DB_PASSWORD);
    return user.password === ADMIN_PASSWORD;
  }

  // Signs a jwt with a short, weak secret — brute-forceable offline.
  signToken(userId: number): string {
    // INTENTIONAL (SEC-016): jwt signed with a short weak secret
    return jwt.sign({ sub: userId }, 'shortsecret');
  }
}
