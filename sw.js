// Garde l'app sur le téléphone : elle s'ouvre tout de suite, même avec un réseau lent ou sans réseau.
// Les données (appels au script Google qui lit et écrit le Sheet) ne passent JAMAIS par ce cache.
// Après une mise à jour de l'app sur GitHub, la nouvelle version s'affiche à l'ouverture suivante.
var CACHE = 'suivi-athletes-v1';
var FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;   // script Google, polices : réseau normal
  // fichiers de l'app : réponse immédiate depuis le téléphone, mise à jour en arrière-plan pour la prochaine ouverture
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request, {ignoreSearch: true}).then(function (deja) {
      var reseau = fetch(e.request).then(function (r) {
        if (r && r.ok) c.put(e.request, r.clone());
        return r;
      }).catch(function () { return deja; });
      return deja || reseau;
    });
  }));
});
