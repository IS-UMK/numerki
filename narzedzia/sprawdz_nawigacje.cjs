#!/usr/bin/env node
"use strict";

// Test logiki nawigacji na ręcznych obiektach; bez silnika przeglądarki.
const assert = require("node:assert/strict");
const path = require("node:path");
const book = require(path.join(__dirname, "../oprawa/scalone/book.js"));

class Events {
  constructor() { this.listeners = new Map(); this.events = []; }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  dispatchEvent(event) {
    this.events.push(event);
    for (const callback of this.listeners.get(event.type) || []) callback(event);
    return true;
  }
}

class Element extends Events {
  constructor(tag, doc) {
    super();
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this._text = "";
    this.scrolls = [];
    this.classList = {
      contains: token => this.className.split(/\s+/).includes(token),
      add: (...tokens) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...tokens])].join(" "); },
      remove: (...tokens) => { this.className = this.className.split(/\s+/).filter(token => !tokens.includes(token)).join(" "); }
    };
  }
  get id() { return this.getAttribute("id") || ""; }
  set id(value) { this.setAttribute("id", value); }
  get className() { return this.getAttribute("class") || ""; }
  set className(value) { this.setAttribute("class", value); }
  get href() { return this.getAttribute("href") || ""; }
  set href(value) { this.setAttribute("href", value); }
  get rel() { return this.getAttribute("rel") || ""; }
  set rel(value) { this.setAttribute("rel", value); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(""); }
  set textContent(value) {
    this._text = String(value);
    for (const child of this.children) child.parentElement = null;
    this.children = [];
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...nodes) {
    for (const node of nodes) {
      if (node.parentElement) node.remove();
      this.children.push(node);
      node.parentElement = this;
    }
  }
  appendChild(node) { this.append(node); return node; }
  prepend(...nodes) {
    for (const node of nodes.reverse()) this.insertBefore(node, this.children[0] || null);
  }
  insertBefore(node, reference) {
    if (node.parentElement) node.remove();
    const index = reference ? this.children.indexOf(reference) : this.children.length;
    assert(index >= 0, "Punkt wstawienia musi być dzieckiem elementu.");
    this.children.splice(index, 0, node);
    node.parentElement = this;
    return node;
  }
  before(node) { this.parentElement.insertBefore(node, this); }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
    this.parentElement = null;
  }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  matches(selector) {
    return selector.split(",").some(part => {
      const query = part.trim();
      const tag = query.match(/^[a-z][a-z0-9-]*/i);
      if (tag && this.tagName !== tag[0].toUpperCase()) return false;
      for (const match of query.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(match[1])) return false;
      for (const match of query.matchAll(/#([\w-]+)/g)) if (this.id !== match[1]) return false;
      for (const match of query.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) {
        if (!this.hasAttribute(match[1])) return false;
        if (match[2] !== undefined && this.getAttribute(match[1]) !== match[2]) return false;
      }
      return true;
    });
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node;
    return null;
  }
  querySelectorAll(selector) {
    const direct = selector.startsWith(":scope > ");
    const query = direct ? selector.slice(9) : selector;
    const matches = [];
    for (const child of this.children) {
      if (child.matches(query)) matches.push(child);
      if (!direct) matches.push(...child.querySelectorAll(query));
    }
    return matches;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus(options) { this.ownerDocument.activeElement = this; this.focusOptions = options; }
  scrollIntoView(options) { this.scrolls.push(options); }
}

function fixture(count = 6, initialHash = "") {
  const doc = new Events();
  doc.title = "Metody numeryczne";
  doc.createElement = tag => new Element(tag, doc);
  doc.documentElement = doc.createElement("html");
  doc.body = doc.createElement("body");
  doc.documentElement.append(doc.body);
  doc.querySelector = selector => doc.documentElement.querySelector(selector);
  doc.querySelectorAll = selector => doc.documentElement.querySelectorAll(selector);
  doc.getElementById = id => {
    const walk = node => node.id === id ? node : node.children.map(walk).find(Boolean);
    return walk(doc.documentElement) || null;
  };
  const make = (tag, id = "", className = "", parent = doc.body, text = "") => {
    const node = doc.createElement(tag);
    node.id = id;
    node.className = className;
    node.textContent = text;
    parent.append(node);
    return node;
  };
  const skip = make("a", "", "book-skip");
  const content = make("div", "content");
  const cover = make("header", "", "book-cover", content);
  make("h1", "", "", cover, "Metody numeryczne");
  make("a", "spis-tresci", "", content);
  const toc = make("nav", "table-of-contents", "", content);
  make("h2", "", "", toc, "Spis treści");
  const chapters = [];
  for (let i = 1; i <= count; i++) {
    const chapter = make("section", `outline-container-chapter-${i}`, "book-chapter", content);
    make("h2", `chapter-${i}`, "", chapter, i === count ? "Dodatek" : `${i}. Rozdział ${i}`);
    const section = make("section", "", "", chapter);
    make("h3", `section-${i}`, "", section, `Podrozdział ${i}`);
    make("pre", `deep-${i}`, "", section, "Kod");
    chapters.push(chapter);
  }
  const alias = make("a", "old-alias", "", content);
  alias.hidden = true;
  alias.href = "#chapter-3";
  const cycleA = make("a", "cycle-a", "", content);
  cycleA.href = "#cycle-b";
  const cycleB = make("a", "cycle-b", "", content);
  cycleB.href = "#cycle-a";
  make("span", "zażółć", "", chapters[1]);

  const win = new Events();
  win.location = { hash: initialHash };
  win.CustomEvent = class {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  };
  let frameId = 0;
  const pending = new Map();
  win.requestAnimationFrame = callback => { pending.set(++frameId, callback); return frameId; };
  win.cancelAnimationFrame = id => pending.delete(id);
  const flush = () => {
    for (let i = 0; pending.size; i++) {
      assert(i < 20, "Pętla callbacków animacji w teście.");
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach(callback => callback());
    }
  };
  const navigate = hash => {
    win.location.hash = hash;
    win.dispatchEvent({ type: "hashchange" });
    flush();
  };
  return { doc, win, content, cover, toc, chapters, skip, flush, navigate };
}

function expectRoute(f, index) {
  assert.deepEqual(f.chapters.map(chapter => !chapter.hidden), f.chapters.map((_, i) => i === index));
  assert.equal(f.cover.hidden, index !== null);
  assert.equal(f.toc.hidden, index !== null);
  assert.equal(f.doc.documentElement.dataset.bookPage, index === null ? "cover" : "chapter");
  assert.equal(f.skip.href, index === null ? "#table-of-contents" : `#chapter-${index + 1}`);
  const event = f.doc.events.filter(item => item.type === "book:chapterchange").at(-1);
  assert(event, "Zdarzenie zmiany rozdziału musi zostać wysłane.");
  assert.equal(event.detail.chapter, index === null ? null : `chapter-${index + 1}`);
  if (index !== null) {
    assert(!f.doc.activeElement.closest(".book-chapter").hidden, "Fokus nie może pozostać w ukrytym rozdziale.");
    assert.equal(f.doc.activeElement.focusOptions.preventScroll, true);
    assert(f.doc.title.includes(index === f.chapters.length - 1 ? "Dodatek" : `Rozdział ${index + 1}`));
  }
  for (const nav of f.doc.querySelectorAll("nav.chapter-navigation")) {
    assert.equal(nav.hidden, index === null);
    if (index === null) continue;
    const previous = nav.querySelector('[rel="prev"]');
    const next = nav.querySelector('[rel="next"]');
    assert(previous && next, "Nawigacja powinna zawierać odsyłacze poprzedni i następny.");
    assert.equal(previous.hidden, index === 0);
    assert.equal(next.hidden, index === f.chapters.length - 1);
    if (index > 0) assert.equal(previous.href, `#chapter-${index}`);
    if (index < f.chapters.length - 1) assert.equal(next.href, `#chapter-${index + 2}`);
  }
}

assert.equal(typeof book.mountChapterNavigation, "function", "Brak funkcji montowania nawigacji w book.js.");
assert.doesNotThrow(() => book.mountChapterNavigation(null, {}));
const empty = fixture(0);
assert.doesNotThrow(() => book.mountChapterNavigation(empty.doc, empty.win));

const f = fixture();
f.doc.documentElement.dataset.mode = "research";
book.mountChapterNavigation(f.doc, f.win);
f.flush();
expectRoute(f, null);
assert.equal(f.doc.activeElement, undefined, "Start bez kotwicy nie powinien wymuszać fokusu.");
assert.equal(f.doc.querySelectorAll("nav.chapter-navigation").length, 2);

for (let i = 0; i < f.chapters.length; i++) {
  f.navigate(`#chapter-${i + 1}`);
  expectRoute(f, i);
  f.navigate(`#deep-${i + 1}`);
  expectRoute(f, i);
  assert(f.doc.getElementById(`deep-${i + 1}`).scrolls.length > 0);
}
f.navigate("#old-alias");
expectRoute(f, 2);
f.navigate("#" + encodeURIComponent("zażółć"));
expectRoute(f, 1);
for (const hash of ["", "#content", "#spis-tresci", "#table-of-contents", "#unknown", "#%E0%A4%A", "#cycle-a"]) {
  f.navigate(hash);
  expectRoute(f, null);
}

// Odwracanie historii nie odtwarza modułów ani nie zmienia wybranego widoku.
f.chapters[1].dataset.modelFrame = "7";
for (const [hash, index] of [["#chapter-2", 1], ["#chapter-5", 4], ["#chapter-2", 1], ["#chapter-5", 4], ["#spis-tresci", null]]) {
  f.navigate(hash);
  expectRoute(f, index);
}
assert.equal(f.chapters[1].dataset.modelFrame, "7");
assert.equal(f.doc.documentElement.dataset.mode, "research");

// Dwie szybkie zmiany adresu: nieaktualny callback nie przewija dawnego celu.
const oldTarget = f.doc.getElementById("chapter-1");
const newTarget = f.doc.getElementById("chapter-2");
const oldScrolls = oldTarget.scrolls.length;
const newScrolls = newTarget.scrolls.length;
for (const hash of ["#chapter-1", "#chapter-2"]) {
  f.win.location.hash = hash;
  f.win.dispatchEvent({ type: "hashchange" });
}
f.flush();
expectRoute(f, 1);
assert.equal(oldTarget.scrolls.length, oldScrolls);
assert.equal(newTarget.scrolls.length, newScrolls + 1);
assert.equal(f.doc.activeElement, newTarget);

// Wejście bezpośrednio w głęboką kotwicę i rozbudowa o kolejny rozdział.
const deep = fixture(6, "#deep-4");
book.mountChapterNavigation(deep.doc, deep.win);
deep.flush();
expectRoute(deep, 3);
const expanded = fixture(7, "#chapter-6");
book.mountChapterNavigation(expanded.doc, expanded.win);
expanded.flush();
expectRoute(expanded, 5);
expanded.navigate("#chapter-7");
expectRoute(expanded, 6);

console.log("OK: osobne rozdziały, kafelki/powrót, głębokie kotwice, stare aliasy, hashchange, poprzedni/następny, fokus i rozbudowa kursu.");
console.log("Testy wykonano na ręcznych obiektach Node; nie zastępują sprawdzenia w przeglądarce.");
