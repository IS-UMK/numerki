'use strict';
// Model dydaktyczny: liczby dodatnie, ograniczona precyzja znaczącej,
// bez modelowania granic wykładnika. Wszystkie dane ilustracji są dyadyczne.
function roundingInfo(x, p) {
  if (!Number.isFinite(x) || x <= 0 || !Number.isInteger(p) || p < 2 || p > 24)
    throw new RangeError('Wymagana dodatnia wartość skończona i p od 2 do 24.');
  const exponent = Math.floor(Math.log2(x));
  const spacing = 2 ** (exponent - p + 1);
  const q = x / spacing;
  const k = Math.floor(q), fraction = q - k;
  const index = fraction < 0.5 ? k : fraction > 0.5 ? k + 1 : k % 2 === 0 ? k : k + 1;
  return {value: index * spacing, lower: k * spacing, upper: (k + 1) * spacing,
    spacing, tie: fraction === 0.5, exact: fraction === 0};
}
function roundBinary(x, p) { return roundingInfo(x, p).value; }
function representablePoints(p) {
  const points = [];
  for (let e = 0; e <= 1; e++) {
    const count = 2 ** (p - 1), spacing = 2 ** (e - p + 1);
    for (let k = 0; k < count; k++) points.push(2 ** e + k * spacing);
  }
  points.push(4);
  return points;
}
function accumulation(p, d, count = 16) {
  if (![3,4,5].includes(p) || ![0.125,0.0625,0.09375].includes(d) ||
      !Number.isInteger(count) || count < 0 || count > 16)
    throw new RangeError('Dane poza zakresem ilustracji.');
  const rounded = [1], exact = [1];
  for (let n = 1; n <= count; n++) {
    rounded.push(roundBinary(rounded[n - 1] + d, p));
    exact.push(1 + n * d);
  }
  return {rounded, exact};
}
