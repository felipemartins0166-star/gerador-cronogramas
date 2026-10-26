/*AUTH-START*/
function sha256(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const b = unescape(encodeURIComponent(str)); const l = b.length; const w = new Array((((l + 8) >> 6) + 1) * 16).fill(0);
  for (let i = 0; i < l; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
  w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[(((l + 8) >> 6) << 4) + 15] = l * 8;
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]; const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < w.length; i += 16) {
    const a = w.slice(i, i + 16); for (let t = 16; t < 64; t++) { const s0 = rr(a[t - 15], 7) ^ rr(a[t - 15], 18) ^ (a[t - 15] >>> 3), s1 = rr(a[t - 2], 17) ^ rr(a[t - 2], 19) ^ (a[t - 2] >>> 10); a[t] = (a[t - 16] + s0 + a[t - 7] + s1) | 0; }
    let [A, B, C, Dd, E, F, G, Hh] = H;
    for (let t = 0; t < 64; t++) { const S1 = rr(E, 6) ^ rr(E, 11) ^ rr(E, 25), ch = (E & F) ^ (~E & G), t1 = (Hh + S1 + ch + K[t] + a[t]) | 0, S0 = rr(A, 2) ^ rr(A, 13) ^ rr(A, 22), mj = (A & B) ^ (A & C) ^ (B & C), t2 = (S0 + mj) | 0; Hh = G; G = F; F = E; E = (Dd + t1) | 0; Dd = C; C = B; B = A; A = (t1 + t2) | 0; }
    H[0] = (H[0] + A) | 0; H[1] = (H[1] + B) | 0; H[2] = (H[2] + C) | 0; H[3] = (H[3] + Dd) | 0; H[4] = (H[4] + E) | 0; H[5] = (H[5] + F) | 0; H[6] = (H[6] + G) | 0; H[7] = (H[7] + Hh) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
const slugN = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function pwHash(salt, slug, mat) { let h = salt + '|' + slug + '|' + mat; for (let i = 0; i < 3000; i++) h = sha256(h + salt); return h; }
/*AUTH-END*/
