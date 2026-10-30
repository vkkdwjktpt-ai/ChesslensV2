/* ChessLens fast readers.
   Reader     : on-screen boards. Looks at a tiny 8x8 fingerprint of every square each frame and only re-runs the piece
                recogniser on squares whose fingerprint changed (plus a slow round-robin refresh). A new label must be
                seen twice before it is accepted. Typical cost per static frame: ~4000 pixel reads.
   It keeps recognition state between frames and accepts changed labels only after they are seen twice. */
(function (root) {
  const L = (typeof module !== 'undefined') ? require('./lens.js') : root.Lens;
  const N = 32, T_CHANGE = 0.35;

  function lumAt(d, W, H, px, py) {
    let ix = px | 0, iy = py | 0;
    if (ix < 0) ix = 0; else if (ix >= W) ix = W - 1;
    if (iy < 0) iy = 0; else if (iy >= H) iy = H - 1;
    const o = (iy * W + ix) * 4; return 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
  }
  const maxMove = (a, b) => Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));

  class Reader {
    constructor(model) { this.model = model; this.reset(); }
    reset() {
      this.sig = new Array(64).fill(null); this.acc = new Array(64).fill(null); this.cand = new Array(64).fill(null);
      this.pend = new Uint8Array(64); this.rr = 0; this.q = null; this.x = new Float32Array(N * N); this.reclass = 0;
    }
    classify(d, W, H, h, r, c) {
      const x = this.x, m = this.model; let sum = 0;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        let a = 0;
        for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
          const u = c + (i + (sx + .5) / 2) / N, v = r + (j + (sy + .5) / 2) / N, dd = h[6] * u + h[7] * v + 1;
          a += lumAt(d, W, H, (h[0] * u + h[1] * v + h[2]) / dd, (h[3] * u + h[4] * v + h[5]) / dd);
        }
        a /= 4; x[j * N + i] = a; sum += a;
      }
      const mean = sum / (N * N); let v2 = 0;
      for (let k = 0; k < N * N; k++) { const t = x[k] - mean; v2 += t * t; }
      const sd = Math.sqrt(v2 / (N * N));
      for (let k = 0; k < N * N; k++) x[k] = (x[k] - mean) / (sd + m.meta.eps);
      return m.meta.classes[L.forward(m, x)];
    }
    // d: RGBA frame, quad: normalised corners TL,TR,BR,BL. Returns {names: 8x8 accepted labels, reclass: squares re-read}
    update(d, W, H, quad) {
      if (!this.q || maxMove(this.q, quad) > 0.012) { this.q = quad.map(p => p.slice()); this.sig.fill(null); }
      const q = this.q, h = L.homography(L.BOARD, q.map(([x, y]) => [x * W, y * H]));
      const s8 = new Float32Array(64), rr1 = this.rr, rr2 = (this.rr + 1) % 64; this.rr = (this.rr + 2) % 64; let n = 0;
      for (let i = 0; i < 64; i++) {
        const r = i >> 3, c = i & 7; let sum = 0;
        for (let b = 0; b < 8; b++) for (let a = 0; a < 8; a++) {
          const u = c + (a + .5) / 8, v = r + (b + .5) / 8, dd = h[6] * u + h[7] * v + 1;
          const g = lumAt(d, W, H, (h[0] * u + h[1] * v + h[2]) / dd, (h[3] * u + h[4] * v + h[5]) / dd); s8[b * 8 + a] = g; sum += g;
        }
        const mean = sum / 64; let vs = 0;
        for (let k = 0; k < 64; k++) { const t = s8[k] - mean; vs += t * t; }
        const sd = Math.sqrt(vs / 64);
        for (let k = 0; k < 64; k++) s8[k] = (s8[k] - mean) / (sd + 8);
        const prev = this.sig[i]; let diff = 99;
        if (prev) { diff = 0; for (let k = 0; k < 64; k++) diff += Math.abs(s8[k] - prev[k]); diff /= 64; }
        if (diff > T_CHANGE || this.pend[i] || i === rr1 || i === rr2) {
          const raw = this.classify(d, W, H, h, r, c); this.sig[i] = Float32Array.from(s8); n++;
          if (this.acc[i] === null || raw === this.acc[i]) { this.acc[i] = raw; this.cand[i] = null; this.pend[i] = 0; }
          else if (this.cand[i] && this.cand[i].l === raw) { if (++this.cand[i].n >= 2) { this.acc[i] = raw; this.cand[i] = null; this.pend[i] = 0; } }
          else { this.cand[i] = { l: raw, n: 1 }; this.pend[i] = 1; }
        }
      }
      this.reclass = n;
      const names = []; for (let r = 0; r < 8; r++) names.push(this.acc.slice(r * 8, r * 8 + 8));
      return { names, reclass: n };
    }
  }

  const api = { Reader };
  if (typeof module !== 'undefined') module.exports = api; else root.Readers = api;
})(typeof self !== 'undefined' ? self : this);
