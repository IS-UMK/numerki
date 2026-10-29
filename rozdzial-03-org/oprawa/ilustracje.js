(function (root) {
        "use strict";
        const colors = {
          ink: "#25322e",
          muted: "#65716b",
          grid: "#d8ded5",
          curve: "#196551",
          step: "#a15c22",
          blue: "#305a82",
        };
        const sq = (x) => x * x - 2;
        const cases = {
          bisection: [
            {
              id: "root",
              name: "Ciągła funkcja: x² − 2",
              f: sq,
              a: 1,
              b: 2,
              root: Math.SQRT2,
              range: [0.7, 2.2, -1.7, 3],
              count: 10,
              equation: "f(x) = x² − 2",
              guaranteed: true,
            },
            {
              id: "pole",
              name: "Nieciągłość: 1/x",
              f: (x) => 1 / x,
              a: -1,
              b: 1.5,
              range: [-1.5, 2, -6, 6],
              count: 9,
              equation: "f(x) = 1/x",
              pole: 0,
              guaranteed: false,
            },
          ],
          newton: [
            {
              id: "root",
              name: "Zbieżność: x² − 2, start 2",
              f: sq,
              df: (x) => 2 * x,
              x0: 2,
              range: [0.7, 2.2, -1.7, 3],
              count: 5,
              equation: "f(x) = x² − 2",
            },
            {
              id: "zero",
              name: "Zerowa pochodna: start 0",
              f: sq,
              df: (x) => 2 * x,
              x0: 0,
              range: [-1.8, 2.2, -3, 3],
              count: 1,
              equation: "f(x) = x² − 2",
            },
            {
              id: "cycle",
              name: "Cykl: x³ − 2x + 2, start 0",
              f: (x) => x * x * x - 2 * x + 2,
              df: (x) => 3 * x * x - 2,
              x0: 0,
              range: [-2.2, 1.7, -4, 4],
              count: 5,
              equation: "f(x) = x³ − 2x + 2",
            },
          ],
          secant: [
            {
              id: "root",
              name: "Zbieżność: start 1 i 2",
              f: sq,
              x0: 1,
              x1: 2,
              range: [0.7, 2.2, -1.7, 3],
              count: 6,
              equation: "f(x) = x² − 2",
            },
            {
              id: "zero",
              name: "Równe wartości: start −1 i 1",
              f: sq,
              x0: -1,
              x1: 1,
              range: [-1.8, 2.2, -3, 3],
              count: 1,
              equation: "f(x) = x² − 2",
            },
          ],
          fixed: [
            {
              id: "root",
              name: "Kontrakcja: g(x) = x − (x² − 2)/4",
              f: (x) => x - (x * x - 2) / 4,
              x0: 2,
              range: [0, 2.2, 0, 2.2],
              count: 9,
              equation: "g(x) = x − (x² − 2)/4",
              q: 0.5,
            },
            {
              id: "cycle",
              name: "Cykl: g(x) = 2/x, start 1",
              f: (x) => 2 / x,
              x0: 1,
              range: [0, 2.2, 0, 2.2],
              count: 5,
              equation: "g(x) = 2/x",
            },
          ],
        };
        const titles = {
          bisection: "Bisekcja",
          newton: "Newton",
          secant: "Sieczne",
          fixed: "Iteracje funkcyjne",
        };
        const frameCount = (rows) => rows.length * 2 - (rows[rows.length - 1].blocked ? 1 : 0);
        const esc = (s) =>
          String(s).replace(
            /[&<>"']/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
          );
        function num(x, digits = 7) {
          if (!Number.isFinite(x)) return String(x);
          if (Object.is(x, -0) || x === 0) return "0";
          const a = Math.abs(x);
          let s =
            a < 0.00001 || a >= 1e7 ? x.toExponential(3) : Number(x.toPrecision(digits)).toString();
          return s.replace(/^-/, "−");
        }
        function trace(method, cfg) {
          const rows = [];
          if (method === "bisection") {
            let a = cfg.a,
              b = cfg.b;
            for (let n = 0; n < cfg.count; n++) {
              const c = (a + b) / 2,
                fc = cfg.f(c),
                fa = cfg.f(a);
              const left = fa < 0 !== fc < 0;
              const na = left ? a : c,
                nb = left ? c : b;
              rows.push({ n, a, b, c, fc, na, nb });
              if (fc === 0 || !Number.isFinite(fc)) break;
              a = na;
              b = nb;
            }
          } else if (method === "newton") {
            let x = cfg.x0;
            for (let n = 0; n < cfg.count; n++) {
              const fx = cfg.f(x),
                slope = cfg.df(x),
                next = slope === 0 ? null : x - fx / slope;
              rows.push({ n, x, fx, slope, next, blocked: slope === 0 });
              if (slope === 0 || !Number.isFinite(next) || fx === 0) break;
              x = next;
            }
          } else if (method === "secant") {
            let prev = cfg.x0,
              x = cfg.x1;
            for (let n = 1; n <= cfg.count; n++) {
              const fp = cfg.f(prev),
                fx = cfg.f(x),
                denom = fx - fp;
              const slope = denom / (x - prev),
                next = denom === 0 ? null : x - (fx * (x - prev)) / denom;
              rows.push({ n, prev, x, fp, fx, slope, denom, next, blocked: denom === 0 });
              if (denom === 0 || !Number.isFinite(next) || fx === 0) break;
              prev = x;
              x = next;
            }
          } else {
            let x = cfg.x0;
            for (let n = 0; n < cfg.count; n++) {
              const next = cfg.f(x);
              rows.push({ n, x, next });
              x = next;
            }
          }
          return rows;
        }
        function state(method, cfg, rows, index) {
          const row = rows[Math.floor(index / 2)],
            phase = index % 2;
          let stats, message;
          if (method === "bisection") {
            if (!phase) {
              stats = [
                ["Środek c" + row.n, num(row.c)],
                ["f(c" + row.n + ")", num(row.fc)],
                [
                  cfg.guaranteed ? "Oszacowanie błędu" : "Połowa długości",
                  num((row.b - row.a) / 2),
                ],
              ];
              message = `Krok ${row.n + 1}: dzielimy przedział [${num(row.a)}; ${num(row.b)}] w jego środku.`;
            } else {
              stats = [
                ["Lewy koniec", num(row.na)],
                ["Prawy koniec", num(row.nb)],
                ["Długość przedziału", num(row.nb - row.na)],
              ];
              message = cfg.guaranteed
                ? "Zachowujemy połowę z przeciwnymi znakami na końcach. Zawiera ona pierwiastek."
                : "Zachowujemy zmianę znaku przy nieciągłości. W tym przedziale nie ma pierwiastka.";
            }
          } else if (method === "newton" || method === "secant") {
            const name = method === "newton" ? "stycznej" : "siecznej";
            stats = [
              ["x" + row.n, num(row.x)],
              ["f(x" + row.n + ")", num(row.fx)],
              [method === "newton" ? "Pochodna" : "Nachylenie siecznej", num(row.slope)],
            ];
            if (row.blocked)
              message = `Pozioma prosta nie przecina osi poziomej. Mianownik wynosi zero — kolejny krok jest nieokreślony.`;
            else if (!phase)
              message = `Krok ${row.n + (method === "newton" ? 1 : 0)}: wyznaczamy przecięcie ${name} z osią poziomą.`;
            else {
              stats = [
                ["Nowe x" + (row.n + 1), num(row.next)],
                ["Nowe residuum", num(cfg.f(row.next))],
                ["Zmiana przybliżenia", num(Math.abs(row.next - row.x))],
              ];
              message =
                cfg.id === "cycle"
                  ? `Otrzymujemy ${num(row.next)}. Iteracje wracają naprzemiennie do 0 i 1.`
                  : `Przenosimy się do punktu funkcji o argumencie x${row.n + 1} = ${num(row.next)}.`;
            }
          } else {
            stats = [
              ["x" + row.n, num(row.x)],
              ["x" + (row.n + 1) + " = g(x" + row.n + ")", num(row.next)],
              ["Residuum x² − 2", num(sq(phase ? row.next : row.x))],
            ];
            message = !phase
              ? `Ruch pionowy: z przekątnej y = x do wykresu g. Odczytujemy g(x${row.n}).`
              : `Ruch poziomy: do przekątnej y = x. Nowy argument to x${row.n + 1} = ${num(row.next)}.`;
            if (phase && cfg.id === "cycle") message += " Powtarza się cykl 1 → 2 → 1.";
          }
          return { row, phase, stats, message };
        }
        function plot(method, cfg, rows, index, uid) {
          const s = state(method, cfg, rows, index),
            r = s.row;
          const square = method === "fixed",
            W = square ? 480 : 760,
            H = square ? 440 : 340;
          const L = square ? 60 : 56,
            R = square ? 36 : 24,
            T = 28,
            B = 28;
          const pw = W - L - R,
            ph = H - T - B;
          const [xmin, xmax, ymin, ymax] = cfg.range;
          const X = (x) => L + ((x - xmin) / (xmax - xmin)) * pw;
          const Y = (y) => H - B - ((y - ymin) / (ymax - ymin)) * ph;
          const fixed = (v) => Number(v.toFixed(3));
          const pathLine = (x1, y1, x2, y2, col = colors.step, dash = "", width = 2, extra = "") =>
            `<line x1="${fixed(X(x1))}" y1="${fixed(Y(y1))}" x2="${fixed(X(x2))}" y2="${fixed(Y(y2))}" stroke="${col}" stroke-width="${width}" ${dash ? 'stroke-dasharray="' + dash + '"' : ""} ${extra}/>`;
          const point = (x, y, col = colors.step, radius = 4) => {
            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y) ||
              x < xmin ||
              x > xmax ||
              y < ymin ||
              y > ymax
            )
              return "";
            return `<circle cx="${fixed(X(x))}" cy="${fixed(Y(y))}" r="${radius}" fill="${col}" stroke="#fffdfa" stroke-width="1.3"/>`;
          };
          const label = (x, y, text, col = colors.muted, anchor = "middle") =>
            `<text x="${fixed(x)}" y="${fixed(y)}" fill="${col}" text-anchor="${anchor}">${esc(text)}</text>`;
          let elements = [];
          const zeroY = Math.max(ymin, Math.min(ymax, 0)),
            zeroX = Math.max(xmin, Math.min(xmax, 0));
          elements.push(
            pathLine(xmin, zeroY, xmax, zeroY, colors.grid, "", 1),
            pathLine(zeroX, ymin, zeroX, ymax, colors.grid, "", 1),
          );
          const xticks = square ? [0, 1, 2] : xmin >= 0 ? [1, 1.5, 2] : [-1, 0, 1];
          const yticks = square ? [1, 2] : ymax === 6 ? [-4, 4] : [-2, 2];
          xticks.forEach((x) => {
            if (x < xmin || x > xmax) return;
            elements.push(
              pathLine(
                x,
                zeroY - (ymax - ymin) * 0.01,
                x,
                zeroY + (ymax - ymin) * 0.01,
                colors.grid,
                "",
                1,
              ),
            );
            elements.push(label(X(x), Y(zeroY) + 21, num(x)));
          });
          yticks.forEach((y) => {
            if (y < ymin || y > ymax) return;
            elements.push(label(L - 10, Y(y) + 5, num(y), colors.muted, "end"));
          });
          elements.push(label(W - R - 3, Y(zeroY) - 9, "x", colors.muted, "end"));
          elements.push(label(L, 16, square ? "y" : "f(x)", colors.muted, "start"));
          const clip = uid + "-clip";
          let layers = [];
          if (method === "bisection") {
            const a = s.phase ? r.na : r.a,
              b = s.phase ? r.nb : r.b;
            layers.push(
              `<rect x="${fixed(X(a))}" y="${T}" width="${fixed(X(b) - X(a))}" height="${ph}" fill="${colors.curve}" opacity=".075"/>`,
            );
            layers.push(
              pathLine(a, ymin, a, ymax, colors.curve, "4 5", 1),
              pathLine(b, ymin, b, ymax, colors.curve, "4 5", 1),
            );
          }
          const segments =
            cfg.pole === 0
              ? [
                  [xmin, -0.006],
                  [0.006, xmax],
                ]
              : [[xmin, xmax]];
          for (const [lo, hi] of segments) {
            let d = "",
              open = false;
            for (let i = 0; i <= 500; i++) {
              const x = lo + ((hi - lo) * i) / 500,
                y = cfg.f(x);
              if (
                !Number.isFinite(y) ||
                y < ymin - 3 * (ymax - ymin) ||
                y > ymax + 3 * (ymax - ymin)
              ) {
                open = false;
                continue;
              }
              d += (open ? " L" : " M") + fixed(X(x)) + " " + fixed(Y(y));
              open = true;
            }
            layers.push(`<path d="${d}" fill="none" stroke="${colors.curve}" stroke-width="2.5"/>`);
          }
          if (cfg.pole === 0) layers.push(pathLine(0, ymin, 0, ymax, colors.muted, "3 5", 1));
          if (square) {
            layers.push(pathLine(xmin, xmin, xmax, xmax, colors.blue, "5 5", 1.5));
            for (let k = 0; k <= Math.floor(index / 2); k++) {
              const t = rows[k],
                last = k === Math.floor(index / 2),
                col = last ? colors.step : "#b5b6a7";
              layers.push(pathLine(t.x, t.x, t.x, t.next, col, "", last ? 2.5 : 1.5));
              if (!last || s.phase)
                layers.push(pathLine(t.x, t.next, t.next, t.next, col, "", last ? 2.5 : 1.5));
            }
            layers.push(point(r.x, r.x, colors.blue), point(r.x, r.next));
            if (s.phase) layers.push(point(r.next, r.next, colors.step, 5));
          } else if (method === "bisection") {
            layers.push(pathLine(r.c, 0, r.c, r.fc, colors.step, "4 4", 1.5));
            layers.push(
              point(r.c, 0),
              point(r.c, r.fc),
              point(r.a, cfg.f(r.a), colors.curve),
              point(r.b, cfg.f(r.b), colors.curve),
            );
          } else {
            if (method === "secant") layers.push(point(r.prev, r.fp, colors.blue));
            layers.push(
              pathLine(
                xmin,
                r.fx + r.slope * (xmin - r.x),
                xmax,
                r.fx + r.slope * (xmax - r.x),
                colors.step,
                "",
                2,
              ),
            );
            layers.push(pathLine(r.x, 0, r.x, r.fx, colors.muted, "3 4", 1));
            layers.push(point(r.x, r.fx, colors.step, 5));
            if (r.next !== null) {
              layers.push(point(r.next, 0, colors.step, 5));
              if (s.phase)
                layers.push(
                  pathLine(r.next, 0, r.next, cfg.f(r.next), colors.step, "4 4", 1.5),
                  point(r.next, cfg.f(r.next), colors.curve, 5),
                );
            }
          }
          elements.push(`<g clip-path="url(#${clip})">${layers.join("")}</g>`);
          const title = `${titles[method]}. ${cfg.equation}. ${s.message}`;
          return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${uid}-title ${uid}-desc"><title id="${uid}-title">${esc(title)}</title><desc id="${uid}-desc">${esc(s.stats.map(([l, v]) => l + ": " + v).join(". "))}</desc><defs><clipPath id="${clip}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs>${elements.join("")}</svg>`;
        }
        function initialPanel(method) {
          const cfg = cases[method][0],
            rows = trace(method, cfg),
            s = state(method, cfg, rows, 0);
          const options = cases[method]
            .map((c, i) => `<option value="${i}">${esc(c.name)}</option>`)
            .join("");
          const legend =
            method === "fixed"
              ? "Zielona: g(x). Niebieska przerywana: y = x. Pomarańczowa: krok iteracji."
              : "Zielona: badana funkcja. Pomarańczowa: konstrukcja kolejnego przybliżenia.";
          return `<figure class="animation ${method === "fixed" ? "square" : ""}" data-method="${method}" aria-label="Animacja: ${titles[method]}">
<div class="anim-head"><label for="case-${method}">Przykład</label><select id="case-${method}" disabled>${options}</select></div>
<div class="plot">${plot(method, cfg, rows, 0, "plot-" + method)}</div>
<div class="anim-stats">${s.stats.map(([l, v]) => `<div><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join("")}</div>
<p class="anim-message">${esc(s.message)}</p>
<div class="anim-controls"><button type="button" data-action="play" disabled aria-pressed="false">Odtwórz</button><button type="button" data-action="prev" disabled>Wstecz</button><button type="button" data-action="next" disabled>Dalej</button><button type="button" data-action="reset" disabled>Od początku</button><span class="frame-counter">1 / ${frameCount(rows)}</span></div>
<figcaption>${legend} Przykłady obliczane w arytmetyce podwójnej precyzji. Animacja pokazuje skończoną liczbę kroków.</figcaption>
</figure>`;
        }
        function mount(doc) {
          const players = [];
          const reduced =
            root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
          for (const panel of doc.querySelectorAll(".animation")) {
            const method = panel.dataset.method,
              select = panel.querySelector("select");
            let cfg = cases[method][0],
              rows = trace(method, cfg),
              index = 0,
              timer = null;
            const get = (a) => panel.querySelector('[data-action="' + a + '"]');
            const play = get("play"),
              prev = get("prev"),
              next = get("next"),
              reset = get("reset");
            function stop() {
              if (timer !== null) root.clearInterval(timer);
              timer = null;
              play.textContent = "Odtwórz";
              play.setAttribute("aria-pressed", "false");
            }
            function render() {
              const s = state(method, cfg, rows, index);
              panel.querySelector(".plot").innerHTML = plot(
                method,
                cfg,
                rows,
                index,
                "plot-" + method,
              );
              panel.querySelector(".anim-stats").innerHTML = s.stats
                .map(([l, v]) => `<div><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`)
                .join("");
              panel.querySelector(".anim-message").textContent = s.message;
              panel.querySelector(".frame-counter").textContent =
                index + 1 + " / " + frameCount(rows);
              prev.disabled = index === 0;
              next.disabled = index === frameCount(rows) - 1;
              reset.disabled = index === 0;
              play.disabled = frameCount(rows) === 1;
              if (next.disabled) stop();
            }
            select.disabled = false;
            play.disabled = false;
            next.disabled = false;
            select.addEventListener("change", () => {
              stop();
              cfg = cases[method][Number(select.value)];
              rows = trace(method, cfg);
              index = 0;
              render();
            });
            prev.addEventListener("click", () => {
              stop();
              index = Math.max(0, index - 1);
              render();
            });
            next.addEventListener("click", () => {
              stop();
              index = Math.min(frameCount(rows) - 1, index + 1);
              render();
            });
            reset.addEventListener("click", () => {
              stop();
              index = 0;
              render();
            });
            play.addEventListener("click", () => {
              if (timer !== null) {
                stop();
                return;
              }
              players.forEach((p) => p.stop());
              if (index === frameCount(rows) - 1) index = 0;
              render();
              play.textContent = "Pauza";
              play.setAttribute("aria-pressed", "true");
              timer = root.setInterval(
                () => {
                  index++;
                  render();
                },
                reduced ? 1800 : 1250,
              );
            });
            // A focused, manually advanced frame is announced without reading every automatic update.
            const announce = doc.createElement("p");
            announce.className = "sr-only";
            announce.setAttribute("aria-live", "polite");
            panel.appendChild(announce);
            [prev, next, reset, select].forEach((el) =>
              el.addEventListener(el === select ? "change" : "click", () => {
                const s = state(method, cfg, rows, index);
                announce.textContent =
                  s.message + " " + s.stats.map(([l, v]) => l + ": " + v).join(". ");
              }),
            );
            players.push({ stop });
          }
          doc.addEventListener("visibilitychange", () => {
            if (doc.hidden) players.forEach((p) => p.stop());
          });        }
        const api = { cases, trace, state, plot, initialPanel, frameCount, mount };
        if (typeof module !== "undefined" && module.exports) module.exports = api;
        else {
          root.RootMethods = api;
          if (root.document) mount(root.document);
        }
      })(typeof window !== "undefined" ? window : globalThis);

(function (root) {
  "use strict";
  const ink = "#25322e",
    muted = "#65716b",
    grid = "#d8ded5";
  const green = "#196551",
    orange = "#a15c22",
    blue = "#305a82";
  const cases = [
    {
      name: "Obie własności: g(x) = x − (x² − 2)/4",
      f: (x) => x - (x * x - 2) / 4,
      image: [1.25, 1.5],
      q: 0.5,
      self: true,
      explanation: "Kontrakcja na I: |g′(x)| ≤ 1/2 dla każdego x ∈ [1, 2].",
    },
    {
      name: "W siebie, bez kontrakcji: g(x) = 2/x",
      f: (x) => 2 / x,
      image: [1, 2],
      q: null,
      self: true,
      explanation: "Brak kontrakcji na I: |g(1) − g(2)| = |1 − 2| = 1.",
    },
    {
      name: "Kontrakcja, lecz poza I: g(x) = x/2 + 1.25",
      f: (x) => x / 2 + 1.25,
      image: [1.75, 2.25],
      q: 0.5,
      self: false,
      explanation: "Kontrakcja na I: |g′(x)| = 1/2. Jednak g(2) = 2.25 ∉ I.",
    },
  ];
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const num = (x) => Number(x.toFixed(4)).toString();
  const fix = (x) => Number(x.toFixed(3));
  function values(cfg, u, v) {
    const gu = cfg.f(u),
      gv = cfg.f(v),
      before = v - u,
      after = Math.abs(gv - gu);
    return { gu, gv, before, after, ratio: after / before };
  }
  function graph(cfg, u, v) {
    const W = 360,
      H = 350,
      L = 48,
      T = 24,
      side = 278,
      lo = 0.75,
      hi = 2.4;
    const X = (x) => L + ((x - lo) / (hi - lo)) * side,
      Y = (y) => T + side - ((y - lo) / (hi - lo)) * side;
    const text = (x, y, t, anchor = "middle", color = muted) =>
      '<text x="' +
      fix(x) +
      '" y="' +
      fix(y) +
      '" text-anchor="' +
      anchor +
      '" fill="' +
      color +
      '">' +
      esc(t) +
      "</text>";
    const line = (x1, y1, x2, y2, color, width = 1, dash = "") =>
      '<line x1="' +
      fix(x1) +
      '" y1="' +
      fix(y1) +
      '" x2="' +
      fix(x2) +
      '" y2="' +
      fix(y2) +
      '" stroke="' +
      color +
      '" stroke-width="' +
      width +
      '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") +
      "/>";
    let e = [];
    e.push(
      '<rect x="' +
        fix(X(1)) +
        '" y="' +
        fix(Y(2)) +
        '" width="' +
        fix(X(2) - X(1)) +
        '" height="' +
        fix(Y(1) - Y(2)) +
        '" fill="#f0f2ed" stroke="' +
        grid +
        '" stroke-dasharray="4 4"/>',
    );
    e.push(line(L, T, L, T + side, grid), line(L, T + side, L + side, T + side, grid));
    [1, 1.5, 2].forEach((x) => {
      e.push(
        line(X(x), T + side - 3, X(x), T + side + 4, grid),
        text(X(x), T + side + 23, num(x)),
      );
      e.push(line(L - 3, Y(x), L + 4, Y(x), grid), text(L - 10, Y(x) + 5, num(x), "end"));
    });
    e.push(text(L, 15, "g(x)", "start"), text(W - 20, T + side + 3, "x", "start"));
    e.push(text(X(2) + 8, Y(1.8), "I × I", "start"));
    e.push(line(X(lo), Y(lo), X(hi), Y(hi), blue, 1.3, "5 5"));
    let d = "";
    for (let i = 0; i <= 180; i++) {
      const x = 1 + i / 180;
      d += (i ? " L" : "M") + fix(X(x)) + " " + fix(Y(cfg.f(x)));
    }
    e.push('<path d="' + d + '" fill="none" stroke="' + green + '" stroke-width="2.6"/>');
    e.push(line(L, Y(cfg.image[0]), L, Y(cfg.image[1]), green, 5));
    for (const [x, label, color] of [
      [u, "u", orange],
      [v, "v", blue],
    ]) {
      const y = cfg.f(x);
      e.push(line(X(x), Y(lo), X(x), Y(y), color, 1, "3 4"));
      e.push(line(X(lo), Y(y), X(x), Y(y), color, 1, "3 4"));
      e.push(
        '<circle cx="' +
          fix(X(x)) +
          '" cy="' +
          fix(Y(y)) +
          '" r="4.5" fill="' +
          color +
          '" stroke="#fffdfa" stroke-width="1.2"/>',
      );
      e.push(text(X(x), Y(lo) - 8, label, "middle", color));
    }
    const description =
      "Przedział I = [1, 2]. Obraz g(I) = [" +
      num(cfg.image[0]) +
      ", " +
      num(cfg.image[1]) +
      "]. " +
      (cfg.self
        ? "Wykres dla x z I mieści się w kwadracie I × I."
        : "Część wykresu dla x z I wychodzi poza kwadrat I × I.");
    return (
      '<svg viewBox="0 0 ' +
      W +
      " " +
      H +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="map-graph-title map-graph-desc"><title id="map-graph-title">Obraz przedziału</title><desc id="map-graph-desc">' +
      esc(description) +
      "</desc>" +
      e.join("") +
      "</svg>"
    );
  }
  function distances(cfg, u, v) {
    const W = 360,
      H = 264,
      L = 30,
      span = 302,
      lo = 0.75,
      hi = 2.4;
    const X = (x) => L + ((x - lo) / (hi - lo)) * span;
    const { gu, gv, before, after } = values(cfg, u, v);
    const text = (x, y, t, anchor = "start", color = muted) =>
      '<text x="' +
      fix(x) +
      '" y="' +
      y +
      '" text-anchor="' +
      anchor +
      '" fill="' +
      color +
      '">' +
      esc(t) +
      "</text>";
    const line = (x1, x2, y, color, width = 1) =>
      '<line x1="' +
      fix(x1) +
      '" y1="' +
      y +
      '" x2="' +
      fix(x2) +
      '" y2="' +
      y +
      '" stroke="' +
      color +
      '" stroke-width="' +
      width +
      '" stroke-linecap="round"/>';
    let e = [
      text(L, 23, "Argumenty: u i v", "start", ink),
      text(L, 144, "Wartości: g(u) i g(v)", "start", ink),
    ];
    for (const y of [71, 192]) {
      e.push(line(X(lo), X(hi), y, grid), line(X(1), X(2), y, grid, 7));
      for (const x of [1, 2]) e.push(text(X(x), y + 24, num(x), "middle"));
    }
    e.push(line(X(cfg.image[0]), X(cfg.image[1]), 192, green, 7));
    for (const [a, b, y] of [
      [u, v, 71],
      [gu, gv, 192],
    ]) {
      e.push(line(X(a), X(b), y - 17, orange, 2));
      e.push(
        '<circle cx="' +
          fix(X(a)) +
          '" cy="' +
          y +
          '" r="5" fill="' +
          orange +
          '" stroke="#fffdfa" stroke-width="1.2"/>',
      );
      e.push(
        '<circle cx="' +
          fix(X(b)) +
          '" cy="' +
          y +
          '" r="5" fill="' +
          blue +
          '" stroke="#fffdfa" stroke-width="1.2"/>',
      );
    }
    e.push(text(L, 119, "|u − v| = " + num(before), "start", ink));
    e.push(text(L, 240, "|g(u) − g(v)| = " + num(after), "start", ink));
    return (
      '<svg viewBox="0 0 ' +
      W +
      " " +
      H +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="map-distance-title map-distance-desc"><title id="map-distance-title">Porównanie odległości</title><desc id="map-distance-desc">Obie osie mają tę samą skalę. Odległość argumentów: ' +
      num(before) +
      ". Odległość ich obrazów: " +
      num(after) +
      ".</desc>" +
      e.join("") +
      "</svg>"
    );
  }
  function verdict(cfg, u, v) {
    const s = values(cfg, u, v);
    return (
      "<p><strong>Obraz przedziału:</strong> g(I) = [" +
      num(cfg.image[0]) +
      "; " +
      num(cfg.image[1]) +
      "] " +
      (cfg.self ? "⊆ I." : "⊈ I.") +
      "</p>" +
      "<p><strong>Kontrakcja:</strong> " +
      esc(
        cfg.explanation
          .replace(/^Kontrakcja na I: /, "")
          .replace(/^Brak kontrakcji na I: /, "nie — "),
      ) +
      "</p>" +
      '<p class="map-ratio">Dla wybranej pary stosunek odległości wynosi ' +
      num(s.ratio) +
      (cfg.q !== null ? " ≤ q = " + num(cfg.q) : "") +
      ".</p>"
    );
  }
  function initialPanel() {
    const cfg = cases[0],
      u = 1,
      v = 2;
    return (
      '<figure class="map-explorer" id="obraz-przedzialu" aria-labelledby="map-heading">' +
      '<p class="map-heading" id="map-heading">Dwie własności odwzorowania</p>' +
      '<div class="anim-head"><label for="map-case">Przykład</label><select id="map-case" disabled>' +
      cases.map((c, i) => '<option value="' + i + '">' + esc(c.name) + "</option>").join("") +
      "</select></div>" +
      '<div class="map-sliders"><label for="map-u">u = <output id="map-u-value" for="map-u">1</output><input type="range" id="map-u" min="1" max="1.9" step="0.01" value="1" disabled></label>' +
      '<label for="map-v">v = <output id="map-v-value" for="map-v">2</output><input type="range" id="map-v" min="1.1" max="2" step="0.01" value="2" disabled></label></div>' +
      '<div class="map-plots"><div class="map-graph">' +
      graph(cfg, u, v) +
      '</div><div class="map-distances">' +
      distances(cfg, u, v) +
      "</div></div>" +
      '<div class="map-verdict">' +
      verdict(cfg, u, v) +
      "</div>" +
      "<figcaption>Szary kwadrat: I × I. Zielony odcinek na osi: g(I). Niebieska przekątna: y = x. Obie osie porównujące odległości mają tę samą skalę. Przesuń punkty lub zmień przykład. Rysunek ilustruje wybrane pary; kontrakcja wymaga jednego q &lt; 1 dla wszystkich par w I.</figcaption>" +
      '<p class="sr-only map-status" aria-live="polite"></p></figure>'
    );
  }
  function mount(doc) {
    const panel = doc.querySelector(".map-explorer");
    if (!panel) return;
    const select = panel.querySelector("select"),
      u = panel.querySelector("#map-u"),
      v = panel.querySelector("#map-v");
    function render(changed) {
      let a = Number(u.value),
        b = Number(v.value);
      if (b - a < 0.1 - 1e-9) {
        if (changed === "u") b = Math.min(2, a + 0.1);
        else a = Math.max(1, b - 0.1);
      }
      u.value = a.toFixed(2);
      v.value = b.toFixed(2);
      panel.querySelector("#map-u-value").textContent = num(a);
      panel.querySelector("#map-v-value").textContent = num(b);
      const cfg = cases[Number(select.value)];
      panel.querySelector(".map-graph").innerHTML = graph(cfg, a, b);
      panel.querySelector(".map-distances").innerHTML = distances(cfg, a, b);
      panel.querySelector(".map-verdict").innerHTML = verdict(cfg, a, b);
    }
    for (const input of [select, u, v]) input.disabled = false;
    select.addEventListener("change", () => {
      u.value = "1";
      v.value = "2";
      render();
    });
    u.addEventListener("input", () => render("u"));
    v.addEventListener("input", () => render("v"));
    for (const input of [select, u, v])
      input.addEventListener("change", () => {
        panel.querySelector(".map-status").textContent =
          panel.querySelector(".map-verdict").textContent;
      });
  }
  const api = { cases, values, graph, distances, verdict, initialPanel, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    root.IntervalMap = api;
    mount(root.document);
  }
})(typeof window !== "undefined" ? window : globalThis);

(function (root) {
  "use strict";
  const green = "#196551",
    orange = "#a15c22",
    muted = "#65716b",
    grid = "#d8ded5";
  const cases = [
    {
      name: "Rosnąca i wypukła: eˣ − 1",
      f: (x) => Math.expm1(x),
      df: Math.exp,
      ddf: Math.exp,
      curvature: 1,
      description:
        "Funkcja rośnie: f′ > 0. Nachylenie stycznych rośnie: f″ > 0. Każda styczna leży pod wykresem.",
    },
    {
      name: "Malejąca i wypukła: e⁻ˣ − 1",
      f: (x) => Math.expm1(-x),
      df: (x) => -Math.exp(-x),
      ddf: (x) => Math.exp(-x),
      curvature: 1,
      description:
        "Funkcja maleje: f′ < 0. Nachylenie stycznych rośnie: f″ > 0. Każda styczna leży pod wykresem.",
    },
    {
      name: "Rosnąca i wklęsła: 1 − e⁻ˣ",
      f: (x) => -Math.expm1(-x),
      df: (x) => Math.exp(-x),
      ddf: (x) => -Math.exp(-x),
      curvature: -1,
      description:
        "Funkcja rośnie: f′ > 0. Nachylenie stycznych maleje: f″ < 0. Każda styczna leży nad wykresem.",
    },
    {
      name: "Malejąca i wklęsła: 1 − eˣ",
      f: (x) => -Math.expm1(x),
      df: (x) => -Math.exp(x),
      ddf: (x) => -Math.exp(x),
      curvature: -1,
      description:
        "Funkcja maleje: f′ < 0. Nachylenie stycznych maleje: f″ < 0. Każda styczna leży nad wykresem.",
    },
    {
      name: "Zerowa pierwsza pochodna w 0: x²",
      f: (x) => x * x,
      df: (x) => 2 * x,
      ddf: () => 2,
      curvature: 1,
      start: 0,
      description:
        "Funkcja jest wypukła. Pierwsza pochodna zmienia znak w 0: po lewej funkcja maleje, po prawej rośnie.",
    },
    {
      name: "Zerowa druga pochodna w 0: x + x³",
      f: (x) => x + x * x * x,
      df: (x) => 1 + 3 * x * x,
      ddf: (x) => 6 * x,
      start: 0,
      description:
        "Funkcja rośnie. Dla x < 0 jest wklęsła, a dla x > 0 wypukła. W 0: f′ = 1 i f″ = 0.",
    },
  ];
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const num = (x) => Number(x.toFixed(4)).toString().replace(/^-/, "−");
  const fixed = (x) => Number(x.toFixed(3));
  function plot(cfg, t) {
    const W = 600,
      H = 330,
      L = 50,
      R = 28,
      T = 25,
      B = 27;
    const X = (x) => L + ((x + 1.2) / 2.4) * (W - L - R),
      Y = (y) => T + ((3 - y) / 6) * (H - T - B);
    const line = (x1, y1, x2, y2, c, w = 1, dash = "") =>
      '<line x1="' +
      fixed(X(x1)) +
      '" y1="' +
      fixed(Y(y1)) +
      '" x2="' +
      fixed(X(x2)) +
      '" y2="' +
      fixed(Y(y2)) +
      '" stroke="' +
      c +
      '" stroke-width="' +
      w +
      '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") +
      "/>";
    const label = (x, y, text, anchor = "middle") =>
      '<text x="' +
      fixed(x) +
      '" y="' +
      fixed(y) +
      '" text-anchor="' +
      anchor +
      '" fill="' +
      muted +
      '">' +
      esc(text) +
      "</text>";
    const ft = cfg.f(t),
      slope = cfg.df(t),
      tangent = (x) => ft + slope * (x - t);
    let e = [line(-1.2, 0, 1.2, 0, grid), line(0, -3, 0, 3, grid)];
    for (const x of [-1, 0, 1])
      e.push(line(x, -0.06, x, 0.06, grid), label(X(x), Y(0) + 23, num(x)));
    for (const y of [-2, 2]) e.push(label(X(0) - 10, Y(y) + 5, num(y), "end"));
    let path = "",
      shade = "";
    for (let i = 0; i <= 240; i++) {
      const x = -1.2 + (2.4 * i) / 240;
      path += (i ? " L" : "M") + fixed(X(x)) + " " + fixed(Y(cfg.f(x)));
    }
    if (cfg.curvature) {
      shade =
        path +
        " L" +
        fixed(X(1.2)) +
        " " +
        fixed(Y(tangent(1.2))) +
        " L" +
        fixed(X(-1.2)) +
        " " +
        fixed(Y(tangent(-1.2))) +
        " Z";
    }
    e.push('<g clip-path="url(#derivative-clip)">');
    if (shade) e.push('<path d="' + shade + '" fill="' + green + '" opacity=".055"/>');
    e.push('<path d="' + path + '" fill="none" stroke="' + green + '" stroke-width="2.8"/>');
    e.push(line(-1.2, tangent(-1.2), 1.2, tangent(1.2), orange, 2, "7 4"));
    e.push(line(t, 0, t, ft, muted, 1, "3 4"));
    e.push(
      '<circle cx="' +
        fixed(X(t)) +
        '" cy="' +
        fixed(Y(ft)) +
        '" r="5" fill="' +
        orange +
        '" stroke="#fffdfa" stroke-width="1.5"/>',
    );
    e.push("</g>", label(W - R, Y(0) - 10, "x", "end"), label(L, 20, "f(x)", "start"));
    const desc =
      "Punkt styczności t = " +
      num(t) +
      ". f(t) = " +
      num(ft) +
      ", f′(t) = " +
      num(slope) +
      ", f″(t) = " +
      num(cfg.ddf(t)) +
      ". " +
      cfg.description;
    return (
      '<svg viewBox="0 0 ' +
      W +
      " " +
      H +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="derivative-svg-title derivative-svg-desc"><title id="derivative-svg-title">Znak pochodnej i położenie stycznej</title><desc id="derivative-svg-desc">' +
      esc(desc) +
      '</desc><defs><clipPath id="derivative-clip"><rect x="' +
      L +
      '" y="' +
      T +
      '" width="' +
      (W - L - R) +
      '" height="' +
      (H - T - B) +
      '"/></clipPath></defs>' +
      e.join("") +
      "</svg>"
    );
  }
  function stats(cfg, t) {
    return [
      ["f(t)", cfg.f(t)],
      ["f′(t)", cfg.df(t)],
      ["f″(t)", cfg.ddf(t)],
    ]
      .map(
        ([name, value]) =>
          "<div><span>" + name + "</span><strong>" + num(value) + "</strong></div>",
      )
      .join("");
  }
  function initialPanel() {
    const cfg = cases[0],
      t = 0.6;
    return (
      '<figure class="derivative-demo" id="intuicja-pochodnych" aria-labelledby="derivative-heading">' +
      '<p class="derivative-heading" id="derivative-heading">Znak pochodnej i położenie stycznej</p>' +
      '<div class="anim-head"><label for="derivative-case">Funkcja</label><select id="derivative-case" disabled>' +
      cases.map((c, i) => '<option value="' + i + '">' + esc(c.name) + "</option>").join("") +
      "</select></div>" +
      '<label class="derivative-slider" for="derivative-point">Punkt styczności t = <output for="derivative-point" id="derivative-value">0.6</output>' +
      '<input id="derivative-point" type="range" min="-1" max="1" step="0.02" value="0.6" disabled></label>' +
      '<div class="derivative-plot">' +
      plot(cfg, t) +
      '</div><div class="anim-stats">' +
      stats(cfg, t) +
      "</div>" +
      '<p class="derivative-description">' +
      esc(cfg.description) +
      "</p>" +
      "<figcaption>Przesuń punkt styczności i porównaj cztery układy znaków. Zielona: funkcja. Pomarańczowa przerywana: styczna. W punkcie styczności mają wspólną wartość. Dwa ostatnie przykłady pokazują pochodną równą zeru w punkcie.</figcaption>" +
      '<p class="sr-only derivative-status" aria-live="polite"></p></figure>'
    );
  }
  function mount(doc) {
    const panel = doc.querySelector(".derivative-demo");
    if (!panel) return;
    const select = panel.querySelector("select"),
      slider = panel.querySelector("input");
    function render() {
      const cfg = cases[+select.value],
        t = +slider.value;
      panel.querySelector("#derivative-value").textContent = num(t);
      panel.querySelector(".derivative-plot").innerHTML = plot(cfg, t);
      panel.querySelector(".anim-stats").innerHTML = stats(cfg, t);
      panel.querySelector(".derivative-description").textContent = cfg.description;
    }
    select.disabled = false;
    slider.disabled = false;
    select.addEventListener("change", () => {
      slider.value = String(cases[+select.value].start ?? 0.6);
      render();
    });
    slider.addEventListener("input", render);
    for (const control of [select, slider])
      control.addEventListener("change", () => {
        const cfg = cases[+select.value],
          t = +slider.value;
        panel.querySelector(".derivative-status").textContent =
          cfg.description +
          " t = " +
          num(t) +
          ". Pierwsza pochodna " +
          num(cfg.df(t)) +
          ", druga pochodna " +
          num(cfg.ddf(t)) +
          ".";
      });
  }
  const api = { cases, plot, stats, initialPanel, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    root.DerivativeIntuition = api;
    mount(root.document);
  }
})(typeof window !== "undefined" ? window : globalThis);

for (const table of document.querySelectorAll('.outline-2 table')) {
  const wrap = document.createElement('div');
  wrap.className = 'table-scroll';
  table.before(wrap); wrap.append(table);
}
