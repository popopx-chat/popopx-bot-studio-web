/* POPOPX Bot Studio — site behaviour: locale switch, tabs, copy, nav, reveal. */
(function () {
  "use strict";

  var P = window.POPOPX_I18N;
  if (!P) { return; }

  var STORE = "popopx_bot_studio_lang";
  var FALLBACK = P.fallback;
  var doc = document;

  /* ---------------------------------------------------------------- locale */

  function normalize(raw) {
    if (!raw) { return ""; }
    var tag = String(raw).trim().replace(/_/g, "-").toLowerCase();
    if (!tag) { return ""; }
    var i;
    for (i = 0; i < P.locales.length; i++) {
      if (P.locales[i].toLowerCase() === tag) { return P.locales[i]; }
    }
    if (P.aliases[tag]) { return P.aliases[tag]; }
    var base = tag.split("-")[0];
    if (P.aliases[base]) { return P.aliases[base]; }
    for (i = 0; i < P.locales.length; i++) {
      if (P.locales[i].toLowerCase() === base) { return P.locales[i]; }
    }
    return "";
  }

  function fromQuery() {
    try {
      return normalize(new URL(doc.location.href).searchParams.get("lang"));
    } catch (e) {
      return normalize((doc.location.search.match(/[?&]lang=([^&#]+)/) || [])[1]);
    }
  }

  function fromStored() {
    try { return normalize(localStorage.getItem(STORE)); } catch (e) { return ""; }
  }

  function fromBrowser() {
    var list = navigator.languages || [navigator.language || navigator.userLanguage || ""];
    for (var i = 0; i < list.length; i++) {
      var hit = normalize(String(list[i]).split(";")[0]);
      if (hit) { return hit; }
    }
    return "";
  }

  function pickLocale() {
    return fromQuery() || fromStored() || fromBrowser() || FALLBACK;
  }

  function entry(locale, key) {
    var dict = P.dict[locale] || {};
    var value = dict[key];
    if (value === undefined || value === "") { value = P.dict[FALLBACK][key]; }
    return value === undefined ? null : value;
  }

  function applyTitle(locale) {
    /* site_title is the brand string and identical in all 18 locales, so the only
       translatable half of <title> is the tagline; English keeps the static markup. */
    var tagline = entry(locale, "meta_tagline");
    var base = P.dict[FALLBACK].site_title;
    if (tagline && locale !== FALLBACK) { doc.title = base + " — " + tagline; }
  }

  function render(locale) {
    var i, nodes, node, key, value;

    nodes = doc.querySelectorAll("[data-i18n]");
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      value = entry(locale, node.getAttribute("data-i18n"));
      if (value !== null) { node.textContent = value; }
    }

    nodes = doc.querySelectorAll("[data-i18n-aria-label]");
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      value = entry(locale, node.getAttribute("data-i18n-aria-label"));
      if (value !== null) { node.setAttribute("aria-label", value); }
    }

    nodes = doc.querySelectorAll("[data-i18n-placeholder]");
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      value = entry(locale, node.getAttribute("data-i18n-placeholder"));
      if (value !== null) { node.setAttribute("placeholder", value); }
    }

    nodes = doc.querySelectorAll("[data-i18n-meta]");
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      value = entry(locale, node.getAttribute("data-i18n-meta"));
      if (value !== null) { node.setAttribute("content", value); }
    }

    var og = doc.querySelector('meta[property="og:locale"]');
    if (og) { og.setAttribute("content", locale); }

    doc.documentElement.setAttribute("lang", locale);
    doc.documentElement.setAttribute("dir", P.rtl.indexOf(locale) >= 0 ? "rtl" : "ltr");
    isolateTechnical(isolateRoot());
    applyTitle(locale);
    fitHead();
  }

  /* Localhost addresses, port ranges, API paths, env names and tool ids read
     left to right even in an Arabic sentence; without a bidi island the colon
     and the slashes jump around. Runs after every render because render()
     replaces textContent. */
  var TECH = /(https?:\/\/[^\s)]+|\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b|\b\d{4}[–-]\d{4}\b|\/(?:api|book|orch)(?:[/{][\w$.*{}-]*)*|\bvar\/studio\b|\.env\b|\bX-[A-Za-z][\w-]*|\b[A-Z][A-Z0-9_]{2,}\b|\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|\b[\w-]+\.(?:cact|db|json|py|sh|mjs)\b|--[a-z0-9][\w-]*)/g;
  var LTR_ONLY = P.rtl;

  function isolateRoot() {
    return doc.querySelector("main") || doc.body;
  }

  function isolateTechnical(root) {
    if (!root || LTR_ONLY.indexOf(localeNow) < 0) { return; }
    var nodes = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children.length) { continue; }
      var text = el.textContent;
      TECH.lastIndex = 0;
      if (!TECH.test(text)) { continue; }
      TECH.lastIndex = 0;
      var frag = doc.createDocumentFragment();
      var last = 0;
      var m;
      while ((m = TECH.exec(text))) {
        if (m.index > last) { frag.appendChild(doc.createTextNode(text.slice(last, m.index))); }
        var b = doc.createElement("bdi");
        b.setAttribute("dir", "ltr");
        b.textContent = m[0];
        frag.appendChild(b);
        last = m.index + m[0].length;
      }
      if (last < text.length) { frag.appendChild(doc.createTextNode(text.slice(last))); }
      el.textContent = "";
      el.appendChild(frag);
    }
  }

  /* Seven nowrap labels beside the brand and the language control do not fit in
     every locale — Polish alone measures 878px of labels — so the hamburger takes
     the nav wherever the row would overflow. Measured, not guessed at breakpoints. */
  function fitHead() {
    var head = doc.querySelector(".site-head");
    var inner = doc.querySelector(".head-inner");
    if (!head || !inner) { return; }
    head.classList.remove("nav-tight", "nav-compact");
    if (inner.scrollWidth > inner.clientWidth + 1) { head.classList.add("nav-tight"); }
    if (inner.scrollWidth > inner.clientWidth + 1) { head.classList.add("nav-compact"); }
    doc.documentElement.style.setProperty("--head-h", Math.round(head.offsetHeight) + "px");
  }

  function syncUrl(locale) {
    if (!window.history || !history.replaceState) { return; }
    var url = new URL(doc.location.href);
    if (locale === FALLBACK) { url.searchParams.delete("lang"); } else { url.searchParams.set("lang", locale); }
    history.replaceState(null, "", url);
  }

  function setLocale(locale, persist) {
    var hit = normalize(locale) || FALLBACK;
    localeNow = hit;
    if (persist) {
      try { localStorage.setItem(STORE, hit); } catch (e) { /* private mode: keep the session switch */ }
    }
    render(hit);
    syncUrl(hit);
    var select = doc.getElementById("lang-select");
    if (select) { select.value = hit; }
  }

  function buildSelect(locale) {
    var select = doc.getElementById("lang-select");
    if (!select) { return; }
    var frag = doc.createDocumentFragment();
    for (var i = 0; i < P.locales.length; i++) {
      var code = P.locales[i];
      var opt = doc.createElement("option");
      opt.value = code;
      opt.textContent = P.labels[code];
      opt.setAttribute("lang", code);
      frag.appendChild(opt);
    }
    select.appendChild(frag);
    select.value = locale;
    select.addEventListener("change", function () { setLocale(select.value, true); });
  }

  /* ------------------------------------------------------------------ tabs */

  function initTabs() {
    var tabs = [].slice.call(doc.querySelectorAll("[role=tab]"));
    if (!tabs.length) { return; }

    function show(tab) {
      for (var i = 0; i < tabs.length; i++) {
        var on = tabs[i] === tab;
        var pane = doc.getElementById(tabs[i].getAttribute("aria-controls"));
        tabs[i].classList.toggle("is-on", on);
        tabs[i].setAttribute("aria-selected", on ? "true" : "false");
        tabs[i].tabIndex = on ? 0 : -1;
        if (pane) {
          pane.classList.toggle("is-on", on);
          if (on) { pane.removeAttribute("hidden"); } else { pane.setAttribute("hidden", ""); }
        }
      }
    }

    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () { show(this); });
      tabs[i].addEventListener("keydown", function (event) {
        var key = event.key;
        var at = tabs.indexOf(this);
        if (key === "ArrowRight" || key === "ArrowLeft") {
          event.preventDefault();
          var next = tabs[(at + (key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          next.focus();
          show(next);
        } else if (key === "Home" || key === "End") {
          event.preventDefault();
          var edge = tabs[key === "Home" ? 0 : tabs.length - 1];
          edge.focus();
          show(edge);
        }
      });
    }

    if (location.hash.indexOf("#tab-") === 0) {
      var target = doc.getElementById(location.hash.slice(1));
      if (target && target.getAttribute("role") === "tab") { show(target); }
    }
  }

  /* ------------------------------------------------------------------ copy */

  function fallbackCopy(text) {
    var area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    doc.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
    doc.body.removeChild(area);
    return ok;
  }

  function flash(button, done) {
    var label = button.querySelector(".copy-text");
    var original = button.getAttribute("data-i18n") || "action_copy";
    if (done && label) {
      button.classList.add("is-done");
      label.textContent = entry(currentLocale(), "ui_copied") || "Copied";
      window.setTimeout(function () {
        button.classList.remove("is-done");
        label.textContent = entry(currentLocale(), original) || "Copy";
      }, 1800);
    }
  }

  var localeNow = FALLBACK;
  function currentLocale() { return localeNow; }

  function initCopy() {
    var buttons = [].slice.call(doc.querySelectorAll("[data-copy]"));
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var block = this.closest("[data-copy-source]");
        if (!block) { return; }
        var code = block.querySelector("code");
        if (!code) { return; }
        var text = code.textContent;
        var button = this;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { flash(button, true); }, function () {
            flash(button, fallbackCopy(text));
          });
        } else {
          flash(button, fallbackCopy(text));
        }
      });
    }
  }

  /* ------------------------------------------------------------------- nav */

  function initMenu() {
    var head = doc.querySelector(".site-head");
    var button = doc.getElementById("menu-btn");
    var nav = doc.querySelector(".primary-nav");
    if (!head || !button || !nav) { return; }
    nav.id = "primary-nav";
    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", open ? "false" : "true");
      head.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        button.setAttribute("aria-expanded", "false");
        head.classList.remove("is-open");
      }
    });
    var raf = 0;
    window.addEventListener("resize", function () {
      if (raf) { return; }
      raf = window.requestAnimationFrame(function () { raf = 0; fitHead(); });
    });
    fitHead();
  }

  function initReveal() {
    var targets = [].slice.call(doc.querySelectorAll(".card, .rail-step, .plugin-list li, .matrix tr, .steps li, .ep, details, .specs > div, .topo, .cmd, .footnote, .eco-note"));
    if (!("IntersectionObserver" in window)) { return; }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add("is-in");
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    for (var i = 0; i < targets.length; i++) {
      targets[i].classList.add("reveal");
      targets[i].style.transitionDelay = (i % 6) * 45 + "ms";
      io.observe(targets[i]);
    }
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    localeNow = pickLocale();
    buildSelect(localeNow);
    render(localeNow);
    syncUrl(localeNow);
    initTabs();
    initCopy();
    initMenu();
    initReveal();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.POPOPX_SET_LOCALE = setLocale;
})();
