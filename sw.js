/* ═══════════════════════════════════════════════════════════
   MI HORARIO — trabajador de servicio

   El punto delicado: un caché mal planteado congela la app en
   una versión vieja y tus actualizaciones dejan de llegar.
   Por eso el HTML va SIEMPRE a la red primero y solo cae al
   caché si no hay conexión. Los iconos y las tipografías, que
   casi nunca cambian, sí van al caché primero.

   Al subir una versión nueva: cambia VERSION. Eso descarta el
   caché anterior y la app avisa que hay algo nuevo.
   ═══════════════════════════════════════════════════════════ */

const VERSION = "5.0";
const CACHE   = "mihorario-" + VERSION;

/* Lo que se guarda al instalar, para que la app abra sin internet
   desde la primera vez. Rutas relativas: así funciona igual en la
   raíz del dominio que en un subdirectorio de GitHub Pages. */
const BASE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./iconos/icono-192.png",
  "./iconos/icono-512.png",
  "./iconos/icono-maskable-512.png",
  "./iconos/apple-touch-icon.png",
  "./iconos/favicon-32.png"
];

/* ── Instalación ───────────────────────────────────────── */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        /* addAll falla entero si un solo archivo falta; se guardan
           uno por uno para que un icono ausente no tumbe todo. */
        return Promise.all(
          BASE.map(function (u) {
            return c.add(new Request(u, { cache: "reload" })).catch(function () {
              console.warn("[sw] no se pudo guardar:", u);
            });
          })
        );
      })
      .then(function () {
        /* No se activa sola: espera a que la persona acepte recargar,
           para no cambiarle la app a media captura. */
        return self.skipWaiting();
      })
  );
});

/* ── Activación: tirar cachés de versiones pasadas ──────── */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (llaves) {
        return Promise.all(
          llaves.map(function (k) {
            if (k !== CACHE && k.indexOf("mihorario-") === 0) return caches.delete(k);
          })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* ── Peticiones ────────────────────────────────────────── */
self.addEventListener("fetch", function (e) {
  const req = e.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const mismoSitio = url.origin === self.location.origin;

  /* Nunca tocar la API: esas respuestas no se guardan. */
  if (url.hostname.indexOf("api.anthropic.com") >= 0) return;

  const esDocumento =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") >= 0;

  /* 1. Documentos → RED PRIMERO.
        Es lo que hace que una versión nueva llegue en cuanto la subes.
        Sin conexión, se sirve la copia guardada. */
  if (esDocumento) {
    e.respondWith(
      fetch(req)
        .then(function (r) {
          const copia = r.clone();
          caches.open(CACHE).then(function (c) { c.put("./index.html", copia); });
          return r;
        })
        .catch(function () {
          return caches.match("./index.html").then(function (r) {
            return r || caches.match("./") || new Response(
              "<!doctype html><meta charset=utf-8><title>Sin conexión</title>" +
              "<body style=\"font-family:system-ui;background:#E6E4DC;color:#171613;padding:40px\">" +
              "<h1>Sin conexión</h1><p>Abre la app una vez con internet para poder usarla después sin él.</p>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            );
          });
        })
    );
    return;
  }

  /* 2. Tipografías de Google → CACHÉ PRIMERO, y se refresca en segundo
        plano. Así la app abre con su tipografía aunque no haya red. */
  if (url.hostname.indexOf("fonts.googleapis.com") >= 0 ||
      url.hostname.indexOf("fonts.gstatic.com") >= 0) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        const red = fetch(req).then(function (r) {
          if (r && (r.ok || r.type === "opaque")) {
            const copia = r.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copia); });
          }
          return r;
        }).catch(function () { return hit; });
        return hit || red;
      })
    );
    return;
  }

  /* 3. Lo demás del propio sitio (iconos, manifiesto) → CACHÉ PRIMERO. */
  if (mismoSitio) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (r) {
          if (r && r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copia); });
          }
          return r;
        }).catch(function () { return hit; });
      })
    );
  }
});

/* ── Mensajes desde la app ─────────────────────────────── */
self.addEventListener("message", function (e) {
  if (!e.data) return;
  if (e.data.tipo === "actualizar") self.skipWaiting();
  if (e.data.tipo === "version" && e.source) {
    e.source.postMessage({ tipo: "version", version: VERSION });
  }
});
