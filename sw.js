// Garde l'app disponible sans Internet. Change VERSION à chaque mise à jour.
var VERSION = "super-agenda-v8";
var CORE = ["./", "index.html", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  // Seulement l'app et ses polices : l'agenda commun (api.github.com) doit toujours passer par Internet.
  if (url.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  if (url.origin === location.origin && e.request.mode === "navigate") {
    // Page: réseau d'abord pour recevoir les mises à jour, sinon la copie gardée.
    e.respondWith(fetch(e.request).then(function (r) {
      var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put("index.html", copy); });
      return r;
    }).catch(function () { return caches.match("index.html"); }));
    return;
  }
  // Fichiers et polices: la copie gardée d'abord, puis le réseau.
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (r) {
      if (r.ok || r.type === "opaque") { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
      return r;
    });
  }));
});
