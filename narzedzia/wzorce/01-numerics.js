'use strict';
  // Pure numerical model. Deliberately separate from the rendering and controls.
  function field(mu, z) { return [z[1], mu * (1 - z[0] * z[0]) * z[1] - z[0]]; }
  function referenceError(z, t) { return Math.hypot(z[0] - 2 * Math.cos(t), z[1] + 2 * Math.sin(t)); }
  function euler(mu, h, N, z0 = [2, 0]) {
    if (!Number.isFinite(mu) || mu < 0 || !Number.isFinite(h) || h <= 0 || !Number.isInteger(N) || N < 0 || !Array.isArray(z0) || z0.length !== 2 || !z0.every(Number.isFinite)) throw new RangeError('Niedopuszczalne dane modelu.');
    const states = [[z0[0], z0[1]]];
    for (let n = 0; n < N; n++) {
      const z = states[n], f = field(mu, z);
      const next = [z[0] + h * f[0], z[1] + h * f[1]];
      if (!next.every(Number.isFinite)) throw new RangeError('Nieskończony wynik obliczeń.');
      states.push(next);
    }
    return states;
  }
