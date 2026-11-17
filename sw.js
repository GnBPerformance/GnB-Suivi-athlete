// Garde une copie de l'app sur le téléphone, pour qu'elle s'ouvre même sans réseau.
// Les données (appels au script Google qui lit et écrit le Sheet) ne passent JAMAIS par ce cache.
// Depuis la v3 (17/11/2026) : la page de l'app est TOUJOURS demandée d'abord à GitHub, une mise à jour se voit donc dès l'ouverture.
// La copie du téléphone ne sert que sans réseau, ou si GitHub met plus de 3 secondes à répondre.
var CACHE = 'suivi-athletes-v3';
var FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
var DELAI_RESEAU = 3000;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// la page de l'app : réseau d'abord (sans le cache du navigateur), copie du téléphone en secours
function pageReseauDabord(req) {
  return caches.open(CACHE).then(function (c) {
    var reseau = fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}).then(function (r) {
      if (r && r.ok) c.put('index.html', r.clone());
      return r;
    });
    var secours = new Promise(function (ok) {
      setTimeout(function () { c.match('index.html').then(function (x) { if (x) ok(x); }); }, DELAI_RESEAU);
    });
    return Promise.race([reseau, secours]).catch(function () {
      return c.match('index.html').then(function (x) { return x || reseau; });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;   // script Google, polices : réseau normal
  var page = e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  if (page) { e.respondWith(pageReseauDabord(e.request)); return; }
  // icônes et manifeste : réponse immédiate depuis le téléphone, mise à jour en arrière-plan
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
