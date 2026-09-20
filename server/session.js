import crypto from 'node:crypto';

const COOKIE_NAME = 'bits_motion_session';
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signature(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET_NOT_CONFIGURED');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));
}

export function createSessionToken(userId) {
  const payload = encode({ version: 1, userId, expiresAt: Date.now() + SESSION_AGE_SECONDS * 1000 });
  return `${payload}.${signature(payload)}`;
}

export function readSessionUserId(req) {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!token) return null;
    const [payload, suppliedSignature] = token.split('.');
    const expected = signature(payload);
    const suppliedBuffer = Buffer.from(suppliedSignature || '');
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.version !== 1 || typeof parsed.userId !== 'string' || !parsed.userId || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt < Date.now()) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_AGE_SECONDS}; Priority=High${secure}`);
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Priority=High${secure}`);
}
