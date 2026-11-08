// Encrypts / decrypts the private case-study details embedded in index.html.
//
//   node tools/lock.mjs decrypt <password>   -> writes private/cases.json (plain text, git-ignored)
//   node tools/lock.mjs encrypt <password>   -> reads private/cases.json, re-locks it into index.html
//
// Format (base64): salt(16) | iv(12) | AES-256-GCM ciphertext. Key = PBKDF2-SHA256, 250k iterations.
// Must match unlock() in index.html.
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(root, "index.html");
const PLAIN = join(root, "private", "cases.json");
const RE = /\/\*LOCKED\*\/"([A-Za-z0-9+/=]*)"\/\*END\*\//;
const ITER = 250000;

async function key(pw, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

const [cmd, pw] = process.argv.slice(2);
if (!["encrypt", "decrypt"].includes(cmd) || !pw) {
  console.error("Usage: node tools/lock.mjs encrypt|decrypt <password>");
  process.exit(1);
}
const html = readFileSync(HTML, "utf8");
if (!RE.test(html)) { console.error("Locked block not found in index.html"); process.exit(1); }

if (cmd === "encrypt") {
  const data = new TextEncoder().encode(JSON.stringify(JSON.parse(readFileSync(PLAIN, "utf8"))));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(pw, salt), data));
  const blob = Buffer.concat([salt, iv, ct]).toString("base64");
  writeFileSync(HTML, html.replace(RE, `/*LOCKED*/"${blob}"/*END*/`));
  console.log(`Locked ${data.length} bytes into index.html`);
} else {
  const raw = Buffer.from(html.match(RE)[1], "base64");
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.subarray(16, 28) },
      await key(pw, raw.subarray(0, 16)), raw.subarray(28));
    mkdirSync(dirname(PLAIN), { recursive: true });
    writeFileSync(PLAIN, JSON.stringify(JSON.parse(new TextDecoder().decode(pt)), null, 2) + "\n");
    console.log(`Wrote ${PLAIN}`);
  } catch {
    console.error("Wrong password."); process.exit(1);
  }
}
