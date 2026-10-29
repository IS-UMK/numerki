/* Wspólna obsługa scalonych notatek. Logika obliczeń pochodzi z istniejących demonstracji.
 * Każdy moduł działa we własnym zakresie i korzeniu rozdziału. Stare pliki pozostają osobno.
 */
(function (global) {
  "use strict";
  const nativeDocument = global.document || null;
  const modules = {};
  const errors = [];
  let mounted = false;

  function namespaceId(value, prefix) {
    const id = String(value);
    return id.startsWith(prefix) ? id : prefix + id;
  }

  function namespaceMarkup(value, prefix) {
    return String(value)
      .replace(/(\s)(id|for|list|headers|aria-labelledby|aria-describedby|aria-controls|aria-owns|aria-activedescendant)\s*=\s*(["'])(.*?)\3/gi,
        (_, space, attribute, quote, ids) => space + attribute + "=" + quote +
          ids.replace(/\S+/g, id => namespaceId(id, prefix)) + quote)
      .replace(/(\s)((?:xlink:)?href)\s*=\s*(["'])#([^"']+)\3/gi,
        (_, space, attribute, quote, id) => space + attribute + "=" + quote + "#" +
          namespaceId(id, prefix) + quote)
      .replace(/url\(\s*(["']?)#([^\s)'"\]]+)\1\s*\)/g,
        (_, quote, id) => "url(" + quote + "#" + namespaceId(id, prefix) + quote + ")");
  }

  function scopedSelector(value, prefix) {
    return String(value).replace(/#([A-Za-z_][\w-]*)/g,
      (_, id) => "#" + namespaceId(id, prefix));
  }

  function scopedDocument(chapter, prefix) {
    const native = nativeDocument;
    return {
      getElementById(id) {
        if (!chapter) return null;
        const node = native.getElementById(namespaceId(id, prefix));
        return node && chapter.contains(node) ? node : null;
      },
      querySelector(selector) {
        return chapter ? chapter.querySelector(scopedSelector(selector, prefix)) : null;
      },
      querySelectorAll(selector) {
        return chapter ? chapter.querySelectorAll(scopedSelector(selector, prefix)) : [];
      },
      createElement(...args) { return native.createElement(...args); },
      createElementNS(...args) { return native.createElementNS(...args); },
      addEventListener(type, listener, ...options) {
        if (!native) return;
        native.addEventListener(type, listener, ...options);
        // Opuszczenie rozdziału zatrzymuje te same odtwarzacze co ukrycie karty.
        if (type === "visibilitychange") {
          native.addEventListener("book:chapterchange", listener, ...options);
        }
      },
      get hidden() { return Boolean((native && native.hidden) || (chapter && chapter.hidden)); },
      get readyState() { return native ? native.readyState : "complete"; },
      get documentElement() { return native ? native.documentElement : null; }
    };
  }

  function localWindow(document) {
    const exported = { document };
    return new Proxy(global, {
      get(target, property) {
        if (Object.prototype.hasOwnProperty.call(exported, property)) return exported[property];
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(_target, property, value) {
        exported[property] = value;
        return true;
      }
    });
  }

  function celModule(chapter) {
    const document = scopedDocument(chapter, "cel-");
    const window = global;

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

    const api = { field, referenceError, euler };
    if (chapter) {

'use strict';
  (() => {
    const $ = id => document.getElementById(id);
    const svgNS = 'http://www.w3.org/2000/svg';
    const dom = Object.fromEntries(['mu-select','h-select','phase-plot','grid-lines','field-lines','axis-ticks','trajectory','trajectory-dots','next-step','next-point','current-point','point-label','exact-circle','exact-legend','value-time','value-x','value-y','value-error','step-title','calc-heading','calc-x','calc-y','next-state','reference-context','run-status','play-button','prev-button','next-button','reset-button','frame-label','step-slider','step-announcement','plot-description'].map(id => [id,$(id)]));
    const number = (x, digits=5) => (Object.is(x, -0) || Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x).toFixed(digits).replace('-', '−');
    const sub = n => String(n).replace(/\d/g, c => '₀₁₂₃₄₅₆₇₈₉'[Number(c)]);
    const px = x => 240 + x * 376 / 7;
    const py = y => 206 - y * 376 / 7;
    const point = z => `${px(z[0]).toFixed(3)},${py(z[1]).toFixed(3)}`;
    let mu=1, h=0.05, states=[], n=0, running=false, raf=0, last=0;
    function svgNode(tag, attrs, parent, label) {
      const el=document.createElementNS(svgNS,tag);
      for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,String(value));
      if (label !== undefined) el.textContent=label;
      parent.appendChild(el); return el;
    }
    function drawAxes() {
      for(let a=-3;a<=3;a++) {
        if(a===0) continue;
        svgNode('line',{x1:px(a),x2:px(a),y1:18,y2:394},dom['grid-lines']);
        svgNode('line',{x1:52,x2:428,y1:py(a),y2:py(a)},dom['grid-lines']);
        svgNode('text',{x:px(a),y:222,'text-anchor':'middle'},dom['axis-ticks'],String(a).replace('-','−'));
        svgNode('text',{x:231,y:py(a)+4,'text-anchor':'end'},dom['axis-ticks'],String(a).replace('-','−'));
      }
    }
    function drawField() {
      dom['field-lines'].replaceChildren();
      for(let i=-6;i<=6;i++) for(let j=-6;j<=6;j++) {
        const x=i/2,y=j/2, f=field(mu,[x,y]), length=Math.hypot(...f);
        if(length===0) continue;
        const dx=f[0]/length*7, dy=-f[1]/length*7;
        svgNode('line',{x1:px(x)-dx/2,y1:py(y)-dy/2,x2:px(x)+dx/2,y2:py(y)+dy/2,'marker-end':'url(#cel-field-arrow)'},dom['field-lines']);
      }
    }
    function render(announce=false) {
      const z=states[n], end=states.length-1, f=field(mu,z), next=states[n+1];
      const path=states.slice(0,n+1).map((z,i)=>(i?'L':'M')+point(z)).join(' ');
      dom['trajectory'].setAttribute('d',path);
      dom['trajectory-dots'].replaceChildren();
      for(let i=0;i<=n;i++) svgNode('circle',{cx:px(states[i][0]),cy:py(states[i][1]),r:1.7},dom['trajectory-dots']);
      dom['current-point'].setAttribute('cx',px(z[0])); dom['current-point'].setAttribute('cy',py(z[1]));
      dom['point-label'].setAttribute('x',Math.min(403,px(z[0])+10)); dom['point-label'].setAttribute('y',Math.max(32,py(z[1])-11)); dom['point-label'].textContent='z'+sub(n);
      dom['next-step'].setAttribute('visibility',next?'visible':'hidden'); dom['next-point'].setAttribute('visibility',next?'visible':'hidden');
      if(next) {
        for(const [attr,value] of Object.entries({x1:px(z[0]),y1:py(z[1]),x2:px(next[0]),y2:py(next[1])})) dom['next-step'].setAttribute(attr,value);
        dom['next-point'].setAttribute('cx',px(next[0]));dom['next-point'].setAttribute('cy',py(next[1]));
      }
      dom['value-time'].textContent=number(n*h,3); dom['value-x'].textContent=number(z[0]); dom['value-y'].textContent=number(z[1]);dom['value-error'].textContent=mu===0?number(referenceError(z,n*h),6):'—';
      dom['step-title'].textContent=`Krok ${n} / ${end}`; dom['frame-label'].textContent=`${n} / ${end}`;
      dom['step-slider'].max=end;dom['step-slider'].value=n;dom['step-slider'].setAttribute('aria-valuetext',`Krok ${n} z ${end}, czas ${number(n*h,3)}`);
      dom['prev-button'].disabled=n===0;dom['next-button'].disabled=n===end;
      dom['play-button'].disabled=n===end&&!running;dom['play-button'].textContent=running?'Pauza':'Odtwórz';dom['play-button'].setAttribute('aria-pressed',String(running));
      dom['calc-heading'].textContent=next?'Następny krok':'Koniec przedziału';
      dom['calc-x'].textContent=next?`x${sub(n+1)} = ${number(z[0])} + ${number(h,3)} · (${number(f[0])})`:'';
      dom['calc-y'].textContent=next?`y${sub(n+1)} = ${number(z[1])} + ${number(h,3)} · (${number(f[1])})`:'';
      dom['next-state'].textContent=next?`z${sub(n+1)} ≈ (${number(next[0])}; ${number(next[1])})`:`Obliczono ${end} kroków do T = 6.`;
      dom['reference-context'].textContent=mu===0?'eₙ to odległość od dokładnego punktu z(tₙ) = (2 cos tₙ; −2 sin tₙ).':'Błąd eₙ obliczamy dla μ = 0, gdy znamy rozwiązanie dokładne.';
      dom['run-status'].textContent=n===end?'Koniec · wróć do początku lub zmień h.':running?'Odtwarzanie · możesz zatrzymać w każdej chwili.':'Zatrzymano · wybierz „Krok +”.';
      dom['plot-description'].textContent=`Płaszczyzna fazowa. μ = ${mu}, h = ${number(h,3)}. W kroku ${n}, w chwili ${number(n*h,3)}, x wynosi ${number(z[0])}, y wynosi ${number(z[1])}. Zielona łamana przedstawia obliczone przybliżenia.${mu===0?' Przerywany okrąg przedstawia krzywą rozwiązania dokładnego.':''}`;
      if(announce) dom['step-announcement'].textContent=`Krok ${n}, czas ${number(n*h,3)}. x: ${number(z[0])}, y: ${number(z[1])}.${mu===0?' Błąd: '+number(referenceError(z,n*h),6)+'.':''}`;
    }
    function stop() { running=false;if(raf) cancelAnimationFrame(raf);raf=0;last=0; }
    function goTo(value) { stop();n=Math.min(states.length-1,Math.max(0,Math.round(value)));render(true); }
    function frame(timestamp) {
      if(!running) return;
      if(!last) last=timestamp;
      if(timestamp-last>=1000/6) {last=timestamp;n++;if(n>=states.length-1) stop();render(!running);}
      if(running) raf=requestAnimationFrame(frame);
    }
    function resetModel() {
      stop();mu=Number(dom['mu-select'].value);h=Number(dom['h-select'].value);n=0;
      states=euler(mu,h,Math.round(6/h));drawField();
      dom['exact-circle'].setAttribute('visibility',mu===0?'visible':'hidden');dom['exact-legend'].hidden=mu!==0;
      render(true);
    }
    dom['mu-select'].addEventListener('change',resetModel);dom['h-select'].addEventListener('change',resetModel);
    dom['play-button'].addEventListener('click',()=>{if(running){stop();render(true);}else if(n<states.length-1){running=true;render();raf=requestAnimationFrame(frame);}});
    dom['prev-button'].addEventListener('click',()=>goTo(n-1));dom['next-button'].addEventListener('click',()=>goTo(n+1));dom['reset-button'].addEventListener('click',()=>goTo(0));dom['step-slider'].addEventListener('input',event=>goTo(Number(event.target.value)));
    document.addEventListener('visibilitychange',()=>{if(document.hidden && running){stop();render();}});
    window.addEventListener('pagehide',stop);
    window.addEventListener('beforeprint',()=>{if(running){stop();render();}});
    drawAxes();resetModel();
  })();

    }
    return api;
  }

  function arytmetykaModule(chapter) {
    const document = scopedDocument(chapter, "arytmetyka-");
    const window = global;

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

    const api = { roundingInfo, roundBinary, representablePoints, accumulation };
    if (chapter) {

'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const ns = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}, label) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (label !== undefined) node.textContent = label;
    return node;
  }
  const fmt = x => String(Number(x.toFixed(8))).replace('-', '−');
  const px = x => 64 + (x - 1) * 208;
  const sx = n => 62 + n * 24.5;
  const sy = value => 274 - (value - 1) * 108;
  function gridRender() {
    const p = Number($('grid-p').value), x = Number($('grid-slider').value) / 64;
    const info = roundingInfo(x, p), drawing = $('grid-drawing');
    const nodes = [
      svg('rect', {x:px(1),y:102,width:px(2)-px(1),height:43,fill:'#f1f4ec'}),
      svg('line', {x1:px(1),y1:142,x2:px(4),y2:142,stroke:'#a9b6aa'}),
      svg('text', {x:64,y:34}, 'Wartość dokładna → reprezentacja')
    ];
    for (const point of representablePoints(p)) {
      nodes.push(svg('line', {x1:px(point),y1:134,x2:px(point),y2:150,stroke:'#9da99e'}));
    }
    for (const point of [1,2,3,4]) nodes.push(svg('text',{x:px(point),y:172,'text-anchor':'middle'},fmt(point)));
    if (!info.exact) {
      const mid = (info.lower + info.upper) / 2;
      nodes.push(svg('line',{x1:px(mid),y1:110,x2:px(mid),y2:151,stroke:'#935d21','stroke-dasharray':'3 3'}));
    }
    nodes.push(svg('line',{x1:px(x),y1:75,x2:px(info.value),y2:136,stroke:'#935d21','stroke-width':1.6}));
    nodes.push(svg('circle',{cx:px(x),cy:72,r:5,fill:'#935d21'}));
    nodes.push(svg('circle',{cx:px(info.value),cy:142,r:5,fill:'#196551'}));
    nodes.push(svg('text',{x:(px(1)+px(2))/2,y:198,'text-anchor':'middle'},'odstęp: '+fmt(2 ** (1-p))));
    nodes.push(svg('text',{x:(px(2)+px(4))/2,y:198,'text-anchor':'middle'},'odstęp: '+fmt(2 ** (2-p))));
    drawing.replaceChildren(...nodes);
    $('grid-r').textContent = fmt(x);
    $('grid-rounded').textContent = fmt(info.value);
    $('grid-error').textContent = fmt(Math.abs(info.value-x));
    $('grid-slider').setAttribute('aria-valuetext',fmt(x));
    const status = info.exact ? 'Liczba jest dokładnie reprezentowalna.' : info.tie
      ? 'Remis między '+fmt(info.lower)+' a '+fmt(info.upper)+'. Ostatni zachowany bit wybranej wartości jest zerem.'
      : 'Najbliższy punkt: '+fmt(info.value)+'. Przerywana kreska oznacza środek między sąsiadami.';
    $('grid-status').textContent = status;
    $('grid-description').textContent = 'Precyzja '+p+' bitów. Liczba '+fmt(x)+
      ', reprezentacja '+fmt(info.value)+', błąd bezwzględny '+fmt(Math.abs(info.value-x))+'. '+status;
  }
  $('grid-p').addEventListener('change',gridRender);
  $('grid-slider').addEventListener('input',gridRender);

  function drawSumGrid() {
    const nodes = [];
    for (const y of [1,1.5,2,2.5,3]) {
      nodes.push(svg('line',{x1:sx(0),y1:sy(y),x2:sx(16),y2:sy(y),stroke:'#e4e8df'}));
      nodes.push(svg('text',{x:sx(0)-12,y:sy(y)+4,'text-anchor':'end'},fmt(y)));
    }
    for (const n of [0,4,8,12,16]) {
      nodes.push(svg('line',{x1:sx(n),y1:sy(1),x2:sx(n),y2:sy(3),stroke:'#eef0e9'}));
      nodes.push(svg('text',{x:sx(n),y:299,'text-anchor':'middle'},String(n)));
    }
    nodes.push(svg('text',{x:sx(0),y:28},'wartość sumy'));
    nodes.push(svg('text',{x:258,y:328,'text-anchor':'middle'},'numer kroku n'));
    $('sum-grid').replaceChildren(...nodes);
  }
  let n = 0, p = 4, d = 0.125, series = accumulation(p,d);
  let playing = false, frameId = null, lastTime = null;
  function linePath(values) {
    return values.slice(0,n+1).map((value,i)=>(i===0?'M':'L')+sx(i)+','+sy(value)).join(' ');
  }
  function sumRender(announce = false) {
    const exact = series.exact[n], rounded = series.rounded[n], error = Math.abs(exact-rounded);
    $('sum-step-title').textContent = 'Krok '+n+' / 16';
    $('sum-exact').textContent = fmt(exact);
    $('sum-rounded').textContent = fmt(rounded);
    $('sum-error').textContent = fmt(error);
    $('sum-frame').textContent = n+' / 16';
    $('sum-slider').value = String(n);
    $('sum-slider').setAttribute('aria-valuetext','Krok '+n+', wartość obliczona '+fmt(rounded));
    $('sum-prev').disabled = n === 0;
    $('sum-next').disabled = n === 16;
    $('sum-play').disabled = n === 16;
    $('sum-play').textContent = playing ? 'Pauza' : 'Odtwórz';
    $('sum-play').setAttribute('aria-pressed',playing);
    $('exact-path').setAttribute('d',linePath(series.exact));
    $('rounded-path').setAttribute('d',linePath(series.rounded));
    $('sum-dots').replaceChildren(...series.rounded.slice(0,n+1).map((v,i)=>
      svg('circle',{cx:sx(i),cy:sy(v),r:2.4})));
    $('exact-point').setAttribute('cx',sx(n)); $('exact-point').setAttribute('cy',sy(exact));
    $('rounded-point').setAttribute('cx',sx(n)); $('rounded-point').setAttribute('cy',sy(rounded));
    for (const [key,value] of Object.entries({x1:sx(n),x2:sx(n),y1:sy(exact),y2:sy(rounded)}))
      $('error-line').setAttribute(key,value);
    if (n < 16) {
      const info = roundingInfo(rounded+d,p);
      $('sum-calc').textContent = 'fl('+fmt(rounded)+' + '+fmt(d)+') = '+fmt(info.value);
      $('sum-reason').textContent = info.exact ? 'Dokładna suma jest reprezentowalna.'
        : info.tie ? 'Suma '+fmt(rounded+d)+' leży w połowie między '+fmt(info.lower)+' a '+fmt(info.upper)+
            '. Remis rozstrzyga ostatni bit.'
        : 'Suma '+fmt(rounded+d)+' zaokrągla się do bliższego punktu '+fmt(info.value)+'.';
    } else {
      $('sum-calc').textContent = 'Wykonano 16 dodawań.';
      $('sum-reason').textContent = 'Porównaj oba ciągi albo zmień dane.';
    }
    const stopped = n>0 && rounded === series.rounded[n-1];
    $('sum-status').textContent = (playing?'Odtwarzanie. ':n===16?'Koniec. ':'Zatrzymano. ')+
      (stopped?'Ostatni krok nie zmienił wartości.':n===0?'Wybierz „Krok +”.':'Ostatni krok zmienił wartość.');
    $('sum-description').textContent = 'Precyzja '+p+' bitów, przyrost '+fmt(d)+'. Krok '+n+
      '. Suma dokładna '+fmt(exact)+', suma po zaokrągleniach '+fmt(rounded)+
      ', błąd bezwzględny '+fmt(error)+'.';
    if (announce) $('sum-announcement').textContent = $('sum-description').textContent;
  }
  function pause() {
    playing = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null; lastTime = null;
  }
  function seek(value) {
    pause(); n = Math.max(0,Math.min(16,value)); sumRender(true);
  }
  function tick(time) {
    if (!playing) return;
    if (lastTime === null) lastTime = time;
    if (time-lastTime >= 1000/3) {
      n = Math.min(16,n+1); lastTime = time;
      if (n === 16) { pause(); sumRender(true); return; }
      sumRender(false);
    }
    frameId = requestAnimationFrame(tick);
  }
  $('sum-play').addEventListener('click',()=>{
    if (playing) { pause(); sumRender(true); return; }
    if (n === 16) return;
    playing = true; lastTime = null; sumRender(false); frameId = requestAnimationFrame(tick);
  });
  $('sum-next').addEventListener('click',()=>seek(n+1));
  $('sum-prev').addEventListener('click',()=>seek(n-1));
  $('sum-reset').addEventListener('click',()=>seek(0));
  $('sum-slider').addEventListener('input',()=>seek(Number($('sum-slider').value)));
  function updateSettings() {
    pause(); p = Number($('sum-p').value); d = Number($('sum-d').value);
    series = accumulation(p,d); n=0; sumRender(true);
  }
  $('sum-p').addEventListener('change',updateSettings);
  $('sum-d').addEventListener('change',updateSettings);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();sumRender(false);}});
  gridRender(); drawSumGrid(); sumRender();
})();

    }
    return api;
  }

  function pierwiastkiModule(chapter) {
    const document = scopedDocument(chapter, "pierwiastki-");
    const window = localWindow(document);
    const exported = [];
    const module = {};
    Object.defineProperty(module, "exports", {
      get() { return exported[exported.length - 1] || {}; },
      set(api) { exported.push(api); }
    });

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
        const originalPlot = plot;
        const originalInitialPanel = initialPanel;
        plot = (...args) => namespaceMarkup(originalPlot(...args), "pierwiastki-");
        initialPanel = (...args) => namespaceMarkup(originalInitialPanel(...args), "pierwiastki-");
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
      u = panel.querySelector("#pierwiastki-map-u"),
      v = panel.querySelector("#pierwiastki-map-v");
    function render(changed) {
      let a = Number(u.value),
        b = Number(v.value);
      if (b - a < 0.1 - 1e-9) {
        if (changed === "u") b = Math.min(2, a + 0.1);
        else a = Math.max(1, b - 0.1);
      }
      u.value = a.toFixed(2);
      v.value = b.toFixed(2);
      panel.querySelector("#pierwiastki-map-u-value").textContent = num(a);
      panel.querySelector("#pierwiastki-map-v-value").textContent = num(b);
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
  const originalGraph = graph;
  const originalDistances = distances;
  const originalInitialPanel = initialPanel;
  graph = (...args) => namespaceMarkup(originalGraph(...args), "pierwiastki-");
  distances = (...args) => namespaceMarkup(originalDistances(...args), "pierwiastki-");
  initialPanel = (...args) => namespaceMarkup(originalInitialPanel(...args), "pierwiastki-");
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
      panel.querySelector("#pierwiastki-derivative-value").textContent = num(t);
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
  const originalPlot = plot;
  const originalInitialPanel = initialPanel;
  plot = (...args) => namespaceMarkup(originalPlot(...args), "pierwiastki-");
  initialPanel = (...args) => namespaceMarkup(originalInitialPanel(...args), "pierwiastki-");
  const api = { cases, plot, stats, initialPanel, mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    root.DerivativeIntuition = api;
    mount(root.document);
  }
})(typeof window !== "undefined" ? window : globalThis);


    const [RootMethods, IntervalMap, DerivativeIntuition] = exported;
    if (chapter) {
      RootMethods.mount(document);
      IntervalMap.mount(document);
      DerivativeIntuition.mount(document);
    }
    return { RootMethods, IntervalMap, DerivativeIntuition };
  }

  function nielinioweModule(chapter) {
    if (!chapter) return { mounted: false };
    const document = scopedDocument(chapter, "nieliniowe-");
    const window = global;

/* Pierwszy krok Newtona: rzut przestrzenny, powiększenie i przesuwanie. */
(function () {
  'use strict';
  const root=document.getElementById('newton-zoom');
  if (!root) return;
  const plot=root.querySelector('.nz-plot'),legend=root.querySelector('.nz-legend');
  const prev=root.querySelector('[data-prev]'),next=root.querySelector('[data-next]');
  const zoomIn=root.querySelector('[data-in]'),zoomOut=root.querySelector('[data-out]');
  const zoomValue=root.querySelector('[data-zoom]');
  const fit=root.querySelector('[data-fit]');
  const phase=root.querySelector('[data-stage]'),value=root.querySelector('[data-value]');
  const A=[1.5,1],f1=(x,y)=>x*x+y*y-2,f2=(x,y)=>x-y;
  const J=[[2*A[0],2*A[1]],[1,-1]],b=[-f1(...A),-f2(...A)];
  const det=J[0][0]*J[1][1]-J[0][1]*J[1][0];
  const H=[(b[0]*J[1][1]-J[0][1]*b[1])/det,(J[0][0]*b[1]-b[0]*J[1][0])/det];
  const B=A.map((x,i)=>x+H[i]);
  const t1=(x,y)=>f1(...A)+J[0][0]*(x-A[0])+J[0][1]*(y-A[1]);
  const t2=(x,y)=>f2(...A)+x-A[0]-(y-A[1]);
  const bounds={xmin:.6,xmax:1.85,ymin:.5,ymax:1.65,zmin:-.6,zmax:1.8};
  const C={f1:'var(--viz-series-1)',f2:'var(--viz-series-2)',t1:'var(--viz-series-3)',ink:'var(--foreground)',grid:'var(--border)'};
  const q0=[...A,0],q1=[...B,0],p1=[...A,f1(...A)],p2=[...A,f2(...A)];
  let step=0;
  function clip(points,axis,limit,above){
    const out=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const ina=above?a[axis]>=limit:a[axis]<=limit,inb=above?b[axis]>=limit:b[axis]<=limit;
      if(ina)out.push(a);
      if(ina!==inb){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+t*(b[j]-v)));}
    }
    return out;
  }
  function mesh(fn,color,n=18){
    const rows=[];
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      const x=bounds.xmin+(bounds.xmax-bounds.xmin)*i/n,x2=bounds.xmin+(bounds.xmax-bounds.xmin)*(i+1)/n;
      const y=bounds.ymin+(bounds.ymax-bounds.ymin)*j/n,y2=bounds.ymin+(bounds.ymax-bounds.ymin)*(j+1)/n;
      const quad=[[x,y,fn(x,y)],[x2,y,fn(x2,y)],[x2,y2,fn(x2,y2)],[x,y2,fn(x,y2)]];
      const poly=clip(clip(quad,2,bounds.zmin,true),2,bounds.zmax,false);
      if(poly.length>=3)rows.push({points:poly,color});
    }
    return rows;
  }
  const surfaces=mesh(f1,C.f1),plane2=mesh(t2,C.f2,7),plane1=mesh(t1,C.t1,7);
  const base={points:[[bounds.xmin,bounds.ymin,0],[bounds.xmax,bounds.ymin,0],[bounds.xmax,bounds.ymax,0],[bounds.xmin,bounds.ymax,0]],color:C.ink,base:true};
  const yaw=.25,tilt=.50,cy=Math.cos(yaw),sy=Math.sin(yaw),st=Math.sin(tilt),ct=Math.cos(tilt);
  const project=p=>[cy*p[0]-sy*p[1],st*(sy*p[0]+cy*p[1])-ct*p[2]];
  const depth=p=>ct*(sy*p[0]+cy*p[1])+st*p[2];
  const axes=[[[bounds.xmin,bounds.ymin,0],[bounds.xmax+.08,bounds.ymin,0],'x'],[[bounds.xmin,bounds.ymin,0],[bounds.xmin,bounds.ymax+.08,0],'y'],[[bounds.xmin,bounds.ymin,bounds.zmin],[bounds.xmin,bounds.ymin,bounds.zmax+.08],'z']];
  const all=[...surfaces,...plane1,...plane2,base].flatMap(s=>s.points).concat(axes.flatMap(a=>a.slice(0,2)),[q0,q1,p1,p2]);
  const projected=all.map(project),us=projected.map(p=>p[0]),vs=projected.map(p=>p[1]);
  const umin=Math.min(...us),umax=Math.max(...us),vmin=Math.min(...vs),vmax=Math.max(...vs);
  // Orthographic camera: zoom and pan preserve the geometry and all three scales.
  const camera={zoom:1,u:(umin+umax)/2,v:(vmin+vmax)/2};
  let viewWidth=736,viewHeight=427,baseScale=1,pending=0;
  const pointers=new Map();
  const fmt=x=>Number(x.toFixed(3)).toString().replace('-','−');
  function draw(){
    viewWidth=Math.max(200,plot.clientWidth||root.clientWidth||736);
    viewHeight=Math.max(350,Math.min(470,viewWidth*.58));
    baseScale=Math.min((viewWidth-100)/(umax-umin),(viewHeight-72)/(vmax-vmin));
    const scale=baseScale*camera.zoom;
    const px=p=>{const q=project(p);return[viewWidth/2+(q[0]-camera.u)*scale,viewHeight/2+(q[1]-camera.v)*scale];};
    const pair=p=>px(p).map(x=>x.toFixed(2)).join(',');
    const label=(p,text,dx=0,dy=0,anchor='middle',extra='')=>{const a=px(p);return `<text x="${a[0]+dx}" y="${a[1]+dy}" text-anchor="${anchor}" ${extra}>${text}</text>`;};
    const line=(a,b,color,width=1,extra='')=>{const x=px(a),y=px(b);return `<line x1="${x[0]}" y1="${x[1]}" x2="${y[0]}" y2="${y[1]}" stroke="${color}" stroke-width="${width}" ${extra}/>`;};
    const dot=(p,r=4,color=C.ink,extra='')=>{const a=px(p);return `<circle cx="${a[0]}" cy="${a[1]}" r="${r}" fill="${color}" ${extra}/>`;};
    let svg='<title id="nz-title">Krok Newtona dla dwóch równań</title><desc id="nz-desc">Trzy etapy: powierzchnie funkcji, ich płaszczyzny styczne i nowe przybliżenie. Przyciski plus i minus oraz kółko myszy zmieniają powiększenie. Przeciąganie przesuwa widok, a gest dwoma palcami zmienia powiększenie. Punkty P jeden i P dwa leżą nad Q zero. Strzałka od Q zero do Q jeden przedstawia poprawkę Newtona.</desc>';
    svg+=`<defs><clipPath id="nz-viewport"><rect x="0" y="0" width="${viewWidth}" height="${viewHeight}"/></clipPath></defs><g clip-path="url(#nz-viewport)">`;
    const objects=[base,...plane2,...(step===0?surfaces:plane1)];
    objects.sort((a,b)=>a.points.reduce((s,p)=>s+depth(p),0)/a.points.length-b.points.reduce((s,p)=>s+depth(p),0)/b.points.length);
    for(const obj of objects)svg+=`<polygon points="${obj.points.map(pair).join(' ')}" fill="${obj.color}" fill-opacity="${obj.base ? .025 : .13}" stroke="${obj.color}" stroke-opacity=".3" stroke-width=".65"/>`;
    for(const x of [.75,1,1.25,1.5,1.75])svg+=line([x,bounds.ymin,0],[x,bounds.ymax,0],C.grid,.7);
    for(const y of [.75,1,1.25,1.5])svg+=line([bounds.xmin,y,0],[bounds.xmax,y,0],C.grid,.7);
    for(const [a,b,name] of axes){svg+=line(a,b,C.ink,1);svg+=label(b,name,name==='y'?-6:8,name==='z'?-5:8,name==='y'?'end':'start',`class="axis-title" data-axis="${name}"`);}
    for(const x of [1,1.5])svg+=label([x,bounds.ymin,0],fmt(x),0,19);
    for(const y of [1,1.5])svg+=label([bounds.xmin,y,0],fmt(y),-9,4,'end');
    for(const z of [.5,1,1.5])svg+=label([bounds.xmin,bounds.ymin,z],fmt(z),-8,4,'end');
    svg+=label([bounds.xmax,bounds.ymax,0],'z = 0',0,19);
    svg+=line(q0,p1,C.ink,1,'stroke-dasharray="3 4" stroke-opacity=".55"');
    svg+=dot(q0,4,C.ink,'data-point="q0"')+label(q0,'Q₀',11,17,'start');
    svg+=dot(p1,4.5,step===0?C.f1:C.t1)+label(p1,'P₁',11,-5,'start');
    const pp=px(p2);svg+=`<path d="M ${pp[0]} ${pp[1]-5} l 5 10 h -10 z" fill="${C.f2}"/>`+label(p2,'P₂',11,3,'start');
    if(step>0){
      const first=[],constant=J[0][0]*A[0]+J[0][1]*A[1]-f1(...A);
      for(const x of [bounds.xmin,bounds.xmax]){const y=(constant-J[0][0]*x)/J[0][1];if(y>=bounds.ymin&&y<=bounds.ymax)first.push([x,y,0]);}
      for(const y of [bounds.ymin,bounds.ymax]){const x=(constant-J[0][1]*y)/J[0][0];if(x>=bounds.xmin&&x<=bounds.xmax)first.push([x,y,0]);}
      if(first.length>=2)svg+=line(first[0],first[1],C.t1,2.5);
      const lo=Math.max(bounds.xmin,bounds.ymin),hi=Math.min(bounds.xmax,bounds.ymax);
      svg+=line([lo,lo,0],[hi,hi,0],C.f2,2.5);
    }
    if(step===2){
      const a=px(q0),b=px(q1),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
      svg+=line(q0,q1,C.ink,2);
      const tx=b[0]-8*ux,ty=b[1]-8*uy;
      svg+=`<path d="M ${tx} ${ty} L ${tx-9*ux+4*uy} ${ty-9*uy-4*ux} L ${tx-9*ux-4*uy} ${ty-9*uy+4*ux} Z" fill="${C.ink}"/>`;
      svg+=label(q0.map((v,i)=>(v+q1[i])/2),'H₀',0,32);
      svg+=`<circle cx="${b[0]}" cy="${b[1]}" r="7" fill="var(--background)" stroke="${C.ink}" stroke-width="1.8"/>`;
      svg+=dot(q1,2,C.ink,'data-point="q1"')+label(q1,'Q₁',-10,17,'end');
    }
    svg+='</g>';
    plot.innerHTML=namespaceMarkup(`<svg viewBox="0 0 ${viewWidth} ${viewHeight}" height="${viewHeight}" role="img" aria-labelledby="nz-title nz-desc">${svg}</svg>`, "nieliniowe-");
    const names=['Powierzchnie','Płaszczyzny styczne','Nowe przybliżenie'];
    phase.textContent=`${step+1} / 3 · ${names[step]}`;
    const entries=step===0?[[C.f1,'z = f₁ = x² + y² − 2'],[C.f2,'z = f₂ = x − y']]:[[C.t1,'T₁: z = 3x + 2y − 5.25'],[C.f2,'T₂: z = x − y']];
    legend.innerHTML=entries.map(([color,name])=>`<span><i class="nz-swatch" style="border-color:${color}"></i>${name}</span>`).join('');
    value.textContent=step===2?`Q₁ = (${fmt(B[0])}; ${fmt(B[1])}; 0) · H₀ = (${fmt(H[0])}; ${fmt(H[1])})`:'P₁ = (1.5; 1; 1.25) · P₂ = (1.5; 1; 0.5)';
    prev.disabled=step===0;next.disabled=step===2;
    zoomValue.textContent=Math.round(camera.zoom*100)+'%';
    zoomIn.disabled=camera.zoom>=4-1e-9;zoomOut.disabled=camera.zoom<=1+1e-9;
    root.dataset.zoom=String(camera.zoom);
    root.dataset.stage=String(step);
    fit.disabled=camera.zoom===1;
  }
  function scheduleDraw(){
    if(!pending)pending=window.requestAnimationFrame(()=>{pending=0;draw();});
  }
  function setZoom(target,x=viewWidth/2,y=viewHeight/2){
    const z=Math.max(1,Math.min(4,target));
    const anchorU=camera.u+(x-viewWidth/2)/(baseScale*camera.zoom);
    const anchorV=camera.v+(y-viewHeight/2)/(baseScale*camera.zoom);
    camera.u=anchorU-(x-viewWidth/2)/(baseScale*z);
    camera.v=anchorV-(y-viewHeight/2)/(baseScale*z);
    camera.zoom=z;
    if(z===1){camera.u=(umin+umax)/2;camera.v=(vmin+vmax)/2;}
  }
  function pan(dx,dy){if(camera.zoom>1){camera.u-=dx/(baseScale*camera.zoom);camera.v-=dy/(baseScale*camera.zoom);}}
  function position(event){
    const rect=plot.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*viewWidth/(rect.width||viewWidth),y:(event.clientY-rect.top)*viewHeight/(rect.height||viewHeight)};
  }
  prev.addEventListener('click',()=>{step=Math.max(0,step-1);draw();});
  next.addEventListener('click',()=>{step=Math.min(2,step+1);draw();});
  zoomIn.addEventListener('click',()=>{setZoom(camera.zoom+.25);draw();});
  zoomOut.addEventListener('click',()=>{setZoom(camera.zoom-.25);draw();});
  fit.addEventListener('click',()=>{setZoom(1);draw();});
  plot.addEventListener('wheel',event=>{
    event.preventDefault();
    const p=position(event),unit=event.deltaMode===1?16:event.deltaMode===2?viewHeight:1;
    const delta=Math.max(-600,Math.min(600,event.deltaY*unit));
    setZoom(camera.zoom*Math.exp(-delta*.0015),p.x,p.y);scheduleDraw();
  },{passive:false});
  plot.addEventListener('pointerdown',event=>{
    if((event.button!==0&&event.pointerType!=='touch')||pointers.size>=2)return;
    event.preventDefault();pointers.set(event.pointerId,position(event));
    try{plot.setPointerCapture(event.pointerId);}catch(_){}
    plot.classList.add('is-dragging');
  });
  plot.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    event.preventDefault();
    const before=[...pointers.values()],old=pointers.get(event.pointerId),p=position(event);
    pointers.set(event.pointerId,p);
    if(pointers.size===2){
      const after=[...pointers.values()];
      const a={x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2};
      const b={x:(after[0].x+after[1].x)/2,y:(after[0].y+after[1].y)/2};
      const d0=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),d1=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);
      if(d0>0&&d1>0)setZoom(camera.zoom*d1/d0,a.x,a.y);
      pan(b.x-a.x,b.y-a.y);
    }else pan(p.x-old.x,p.y-old.y);
    scheduleDraw();
  });
  function release(event){
    pointers.delete(event.pointerId);
    try{plot.releasePointerCapture(event.pointerId);}catch(_){}
    if(!pointers.size)plot.classList.remove('is-dragging');
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])plot.addEventListener(name,release);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(plot.clientWidth!==viewWidth)draw();}).observe(plot);
  draw();
})();

    return { mounted: true };
  }

  function buildModules() {
    const factories = {
      cel: celModule,
      arytmetyka: arytmetykaModule,
      pierwiastki: pierwiastkiModule,
      nieliniowe: nielinioweModule
    };
    for (const [name, factory] of Object.entries(factories)) {
      const chapter = nativeDocument ? nativeDocument.querySelector(".chapter-" + name) : null;
      try {
        modules[name] = factory(chapter);
      } catch (error) {
        errors.push({ chapter: name, message: String(error) });
        if (global.console) global.console.error("Ilustracje rozdziału " + name + ":", error);
      }
    }
  }

  function mountViews() {
    if (!nativeDocument || !nativeDocument.getElementById("content")) return;
    let view = "reading";
    try {
      if (global.localStorage.getItem("numerical-mode") === "research") view = "research";
    } catch (_) { /* Zapis ustawień jest opcjonalny. */ }
    if (new URLSearchParams(global.location.search).get("tryb") === "badanie") view = "research";
    const toolbar = nativeDocument.createElement("div");
    toolbar.id = "book-views";
    toolbar.className = "book-toolbar";
    const contentsLink = nativeDocument.getElementById("table-of-contents") ? "#table-of-contents"
      : nativeDocument.getElementById("spis-tresci") ? "#spis-tresci" : "#content";
    toolbar.innerHTML = '<div class="book-toolbar-inner">' +
      '<a class="book-brand" href="#content">Metody numeryczne</a>' +
      '<div class="book-toolbar-controls"><a href="' + contentsLink + '">Spis treści</a>' +
      '<div class="book-view-options" role="group" aria-label="Widok materiału">' +
      '<button type="button" data-view="reading" aria-pressed="false">Czytanie</button>' +
      '<button type="button" data-view="research" aria-pressed="false">Badanie</button>' +
      '</div></div></div><p class="book-view-status" role="status" aria-live="polite" aria-atomic="true"></p>';
    const status = toolbar.querySelector(".book-view-status");
    const buttons = toolbar.querySelectorAll("[data-view]");
    function setView(next, remember = false) {
      const point = nativeDocument.elementFromPoint(global.innerWidth / 2,
        Math.min(160, global.innerHeight / 3));
      const anchor = point && point.closest("section, header");
      const before = anchor ? anchor.getBoundingClientRect().top : null;
      view = next === "research" ? "research" : "reading";
      nativeDocument.documentElement.dataset.mode = view;
      buttons.forEach(button => button.setAttribute("aria-pressed",
        String(button.dataset.view === view)));
      if (remember) {
        try { global.localStorage.setItem("numerical-mode", view); } catch (_) { /* Opcjonalnie. */ }
        status.textContent = view === "research"
          ? "Widok badania: pokazano role fragmentów i dodatkowe uwagi."
          : "Widok czytania: ukryto etykiety ról i pomocnicze uwagi.";
        if (anchor && before !== null) global.scrollBy({
          top: anchor.getBoundingClientRect().top - before,
          behavior: "instant"
        });
      }
    }
    buttons.forEach(button => button.addEventListener("click",
      () => setView(button.dataset.view, true)));
    nativeDocument.body.prepend(toolbar);
    const skip = nativeDocument.createElement("a");
    skip.className = "book-skip";
    skip.href = "#content";
    skip.textContent = "Przejdź do treści";
    nativeDocument.body.prepend(skip);
    setView(view);
  }

  function mountChapterNavigation(doc = nativeDocument, win = global) {
    if (!doc) return null;
    const content = doc.getElementById("content");
    if (!content) return null;
    const chapters = Array.from(content.children).filter(node => node.classList.contains("book-chapter"));
    if (!chapters.length) return null;
    const headings = chapters.map(chapter => chapter.querySelector("h2[id]"));
    if (headings.some(heading => !heading)) return null;
    const cover = content.querySelector(".book-cover");
    const contents = doc.getElementById("table-of-contents");
    const landing = [cover, contents].filter(Boolean);
    const originalTitle = doc.title;
    const skip = doc.querySelector(".book-skip");
    let activeChapter = null;
    let revision = 0;

    function link(label, className) {
      const anchor = doc.createElement("a");
      anchor.className = className;
      anchor.textContent = label;
      return anchor;
    }

    function navigation(position) {
      const nav = doc.createElement("nav");
      nav.className = "chapter-navigation chapter-navigation-" + position;
      nav.setAttribute("aria-label", position === "top" ? "Nawigacja rozdziałów" : "Dalsze rozdziały");
      const previous = link("← Poprzedni", "chapter-previous");
      const home = link("Spis treści", "chapter-home");
      const next = link("Następny →", "chapter-next");
      previous.setAttribute("rel", "prev");
      next.setAttribute("rel", "next");
      home.setAttribute("href", "#table-of-contents");
      nav.append(previous, home, next);
      return { nav, previous, next };
    }

    const top = navigation("top");
    const bottom = navigation("bottom");
    content.insertBefore(top.nav, chapters[0]);
    content.append(bottom.nav);

    function destination() {
      let id = win.location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch (_) { /* Nieznana kotwica pokaże spis. */ }
      const seen = new Set();
      while (id && !seen.has(id)) {
        seen.add(id);
        const target = doc.getElementById(id);
        if (!target) break;
        const chapter = target.closest(".book-chapter");
        if (chapters.includes(chapter)) return { target, chapter };
        // Zachowane aliasy dawnej strony tytułowej wskazują bieżące nagłówki.
        const alias = target.getAttribute("href");
        if (!alias || !alias.startsWith("#")) break;
        id = alias.slice(1);
      }
      return { target: contents || cover, chapter: null };
    }

    function show({ initial = false } = {}) {
      const { target, chapter } = destination();
      const index = chapters.indexOf(chapter);
      const changed = activeChapter !== chapter;
      activeChapter = chapter;
      for (const section of chapters) section.hidden = section !== chapter;
      for (const node of landing) node.hidden = Boolean(chapter);
      doc.documentElement.dataset.bookPage = chapter ? "chapter" : "cover";
      doc.title = chapter ? headings[index].textContent.trim() + " — " + originalTitle : originalTitle;
      if (skip) skip.setAttribute("href", chapter ? "#" + headings[index].id : "#table-of-contents");

      for (const { nav, previous, next } of [top, bottom]) {
        nav.hidden = !chapter;
        for (const [anchor, adjacent, relation] of [
          [previous, index - 1, "Poprzedni rozdział"],
          [next, index + 1, "Następny rozdział"]
        ]) {
          const heading = chapter && headings[adjacent];
          anchor.hidden = !heading;
          if (heading) {
            anchor.setAttribute("href", "#" + heading.id);
            anchor.setAttribute("aria-label", relation + ": " + heading.textContent.trim());
          } else {
            anchor.removeAttribute("href");
            anchor.removeAttribute("aria-label");
          }
        }
      }

      if (changed || initial) {
        doc.dispatchEvent(new win.CustomEvent("book:chapterchange", {
          detail: { chapter: chapter ? headings[index].id : null }
        }));
      }
      const currentRevision = ++revision;
      if (!initial || chapter) win.requestAnimationFrame(() => {
        if (currentRevision !== revision || !target) return;
        const section = chapter && target.closest("section");
        const focus = chapter
          ? (target.matches("h2, h3, h4, h5, h6") ? target
            : (section && section.querySelector("h2, h3, h4, h5, h6")) || headings[index])
          : contents || cover;
        if (focus) {
          focus.setAttribute("tabindex", "-1");
          focus.focus({ preventScroll: true });
        }
        target.scrollIntoView({ block: "start", behavior: "instant" });
      });
    }

    win.addEventListener("hashchange", () => show());
    show({ initial: true });
    return { show };
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    mountViews();
    buildModules();
    if (nativeDocument) {
      for (const table of nativeDocument.querySelectorAll("#content table")) {
        if (table.closest(".table-scroll, .table-wrap")) continue;
        const wrap = nativeDocument.createElement("div");
        wrap.className = "table-scroll";
        table.before(wrap);
        wrap.append(table);
      }
    }
    // Najpierw zainicjuj ilustracje przy dostępnej szerokości, potem wybierz stronę.
    mountChapterNavigation();
  }

  const api = { namespaceId, namespaceMarkup, scopedSelector, modules, errors, mount, mountChapterNavigation };
  global.NumerkiBook = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!nativeDocument) mount();
  else if (nativeDocument.readyState === "loading") {
    nativeDocument.addEventListener("DOMContentLoaded", mount, { once: true });
  } else mount();
})(typeof window !== "undefined" ? window : globalThis);
