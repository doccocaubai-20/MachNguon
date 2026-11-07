import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, hash) {
  const [salt, expected] = (hash ?? "").split(":");
  const valid = /^[a-f0-9]{32}$/.test(salt) && /^[a-f0-9]{128}$/.test(expected ?? "");
  const actual = await derive(password, valid ? salt : "0".repeat(32), 64);
  return valid && timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
