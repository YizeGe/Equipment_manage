// ============ 管理员登录（密码哈希校验 + 会话签名） ============
// 密码只以 PBKDF2-SHA256 哈希形式存储，明文不出现在代码中。
// 更换密码：用相同参数重新计算哈希并替换 PASSWORD_HASH 即可：
//   node -e 'console.log(require("crypto").pbkdf2Sync("新密码", PASSWORD_SALT, 100000, 32, "sha256").toString("hex"))'

export const SESSION_COOKIE = "sem_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 会话有效期：7 天（秒）

const PASSWORD_SALT = "2046cee3a35d8ca94e526ccd82ac0a46";
const PASSWORD_HASH = "e48a286f4b8e5d5d03b77c68bb11185a28a3b1b239b1b3c3f47a89c0e3fef614";
const SESSION_SECRET = "5f4ce47f1588d6faaaf5095f58a2c09385c8742d0aa4759204948df63f1b32ec";

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(PASSWORD_SALT), iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  return toHex(bits);
}

/** 校验管理员密码（哈希比对） */
export async function verifyPassword(password: string): Promise<boolean> {
  return (await hashPassword(password)) === PASSWORD_HASH;
}

async function hmac(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

/** 签发会话令牌：过期时间戳 + HMAC 签名 */
export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  return `${exp}.${await hmac(`sem:${exp}`)}`;
}

/** 校验会话令牌（签名与有效期） */
export async function verifySessionToken(token: string): Promise<boolean> {
  const i = token.indexOf(".");
  if (i <= 0) return false;
  const exp = Number(token.slice(0, i));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return (await hmac(`sem:${exp}`)) === token.slice(i + 1);
}
