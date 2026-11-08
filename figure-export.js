/* Albanese Lab Tools: shared figure export.
 * Turns an on-screen SVG chart into a standalone, publication-ready file:
 *  - always exported with the light theme on a white background,
 *  - every color, line and font copied onto the element itself, so the file
 *    looks the same in Illustrator, Inkscape, PowerPoint or a browser,
 *  - PNG at 4x resolution (about 300 dpi at a typical figure width).
 * Also adds the small "Albanese Lab Tools" bar at the top of each page.
 */
(function () {
  "use strict";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity",
    "stroke-linejoin", "stroke-linecap", "opacity", "font-family", "font-size", "font-weight",
    "font-style", "text-anchor", "dominant-baseline", "paint-order", "letter-spacing"];
  var FONT_FALLBACK = ", 'Helvetica Neue', Helvetica, Arial, sans-serif";

  function withLightTheme(fn) {
    var root = document.documentElement;
    var prev = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    try { return fn(); }
    finally { if (prev === null) root.removeAttribute("data-theme"); else root.setAttribute("data-theme", prev); }
  }

  function build(svgEl) {
    return withLightTheme(function () {
      var vb = (svgEl.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
      var w = vb[2] || svgEl.clientWidth || 600, h = vb[3] || svgEl.clientHeight || 400;
      var clone = svgEl.cloneNode(true);
      var src = [svgEl].concat(Array.prototype.slice.call(svgEl.querySelectorAll("*")));
      var dst = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll("*")));
      for (var i = 0; i < src.length; i++) {
        var cs = getComputedStyle(src[i]);
        var style = [];
        PROPS.forEach(function (p) {
          var v = cs.getPropertyValue(p);
          if (!v) return;
          if (p === "font-family") v = v + FONT_FALLBACK;
          style.push(p + ":" + v);
        });
        dst[i].removeAttribute("class");
        if (i > 0) dst[i].setAttribute("style", style.join(";"));
        // drop var() presentation attributes; the inline style now carries the resolved value
        Array.prototype.slice.call(dst[i].attributes).forEach(function (a) {
          if (a.value.indexOf("var(") !== -1) dst[i].removeAttribute(a.name);
        });
      }
      clone.setAttribute("xmlns", SVG_NS);
      clone.setAttribute("width", String(w));
      clone.setAttribute("height", String(h));
      clone.removeAttribute("style");
      var bg = document.createElementNS(SVG_NS, "rect");
      bg.setAttribute("x", vb[0] || 0); bg.setAttribute("y", vb[1] || 0);
      bg.setAttribute("width", w); bg.setAttribute("height", h);
      bg.setAttribute("fill", "#ffffff");
      clone.insertBefore(bg, clone.firstChild);
      var xml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + new XMLSerializer().serializeToString(clone);
      return { xml: xml, width: w, height: h };
    });
  }

  var TOOL = (document.currentScript && document.currentScript.getAttribute("data-tool")) || "";
  function cleanName(name) {
    var n = String(name || "").trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
    n = n.replace(/(_?chart)+$/i, "");                // old pages appended "_chart"
    if (TOOL && n.toLowerCase().indexOf(TOOL.toLowerCase()) === -1) n = (n ? n + "_" : "") + TOOL;
    return n || "figure";
  }

  function save(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function downloadSvg(svgEl, baseName) {
    if (!svgEl) return;
    var b = build(svgEl);
    save(cleanName(baseName) + ".svg", new Blob([b.xml], { type: "image/svg+xml;charset=utf-8" }));
  }

  function downloadPng(svgEl, baseName, scale) {
    if (!svgEl) return;
    scale = scale || 4;
    var b = build(svgEl);
    var url = URL.createObjectURL(new Blob([b.xml], { type: "image/svg+xml;charset=utf-8" }));
    var img = new Image();
    img.onload = function () {
      var c = document.createElement("canvas");
      c.width = Math.round(b.width * scale); c.height = Math.round(b.height * scale);
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (png) { if (png) save(cleanName(baseName) + ".png", png); }, "image/png");
    };
    img.onerror = function () { URL.revokeObjectURL(url); alertFail(); };
    img.src = url;
  }

  function alertFail() {
    var n = document.createElement("div");
    n.textContent = "The PNG could not be created in this browser. Try Save SVG instead.";
    n.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#16211f;color:#fff;padding:10px 14px;border-radius:6px;font:14px system-ui;z-index:99";
    document.body.appendChild(n); setTimeout(function () { n.remove(); }, 5000);
  }

  window.LabFigure = { downloadSvg: downloadSvg, downloadPng: downloadPng, build: build };

  // Site bar linking back to the tools index
  function addBar() {
    if (document.querySelector(".labtools-bar")) return;
    var css = document.createElement("style");
    css.textContent = ".labtools-bar{display:flex;gap:16px;align-items:center;padding:6px max(16px,env(safe-area-inset-left,0px));" +
      "font:500 12px 'IBM Plex Sans',system-ui,sans-serif;background:var(--surface-alt,#f2f5f4);border-bottom:1px solid var(--border,#dbe3e1)}" +
      ".labtools-bar a{color:var(--muted,#5c6d69);text-decoration:none}.labtools-bar a:hover{color:var(--accent,#009988);text-decoration:underline}";
    document.head.appendChild(css);
    var bar = document.createElement("nav");
    bar.className = "labtools-bar";
    bar.setAttribute("aria-label", "Albanese Lab Tools");
    bar.innerHTML = '<a href="./">&larr; Albanese Lab Tools</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addBar); else addBar();
})();
