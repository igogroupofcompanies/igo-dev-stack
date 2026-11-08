'use strict';
// Hybrid encryption for team logs: members encrypt with the admin's PUBLIC key,
// only the admin's PRIVATE key (kept on the admin PC) can read them.
// AES-256-GCM for data, RSA-OAEP-SHA256 (3072-bit) to wrap the AES key.
const crypto = require('crypto');

function keygen() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey, fingerprint: fingerprint(publicKey) };
}

function fingerprint(pubPem) {
  const der = crypto.createPublicKey(pubPem).export({ type: 'spki', format: 'der' });
  return crypto.createHash('sha256').update(der).digest('hex').slice(0, 16).replace(/(.{4})(?=.)/g, '$1-');
}

function encrypt(buf, pubPem) {
  const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(buf), c.final()]);
  const k = crypto.publicEncrypt({ key: pubPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
  return JSON.stringify({ v: 1, alg: 'RSA-OAEP-256+A256GCM', fp: fingerprint(pubPem), k: k.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') });
}

function decrypt(text, privPem) {
  const o = JSON.parse(text);
  const key = crypto.privateDecrypt({ key: privPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(o.k, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(o.iv, 'base64'));
  d.setAuthTag(Buffer.from(o.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(o.data, 'base64')), d.final()]);
}

module.exports = { keygen, fingerprint, encrypt, decrypt };
