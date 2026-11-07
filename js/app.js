// AUTO WILL OS V1 — logique de l'écran d'accueil

// ---------------------------------------------------------------
// 1) CONFIGURATION DES APPLICATIONS
// Chaque tuile ouvre une application Android via un lien "intent".
// - pkg    : nom du paquet Android de l'application
// - action : réglage système à ouvrir (si pas de pkg)
// - href   : lien direct (ex. tel:)
// Les tuiles sans pkg/action/href affichent « À configurer ».
// Le nom de paquet de l'application Radio dépend de ton autoradio :
// renseigne-le ici quand tu le connais.
// ---------------------------------------------------------------
const APPS = [
  { name: "Navigation", icon: "🧭", pkg: "com.google.android.apps.maps" },
  { name: "Waze",       icon: "🚗", pkg: "com.waze" },
  { name: "Musique",    icon: "🎵", pkg: "com.google.android.apps.youtube.music" },
  { name: "Spotify",    icon: "🎧", pkg: "com.spotify.music" },
  { name: "Téléphone",  icon: "📞", href: "tel:" },
  { name: "Radio",      icon: "📻", pkg: "" },
  { name: "Bluetooth",  icon: "🔵", action: "android.settings.BLUETOOTH_SETTINGS" },
  { name: "Réglages",   icon: "⚙️", action: "android.settings.SETTINGS" }
];

const ACCENTS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

// ---------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) { /* stockage indisponible : on continue sans */ }
  return null;
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function buildLink(app) {
  if (app.href) return app.href;
  if (app.pkg) return "intent://#Intent;package=" + app.pkg + ";end";
  if (app.action) return "intent://#Intent;action=" + app.action + ";end";
  return null;
}

// ---------------------------------------------------------------
// 2) HORLOGE, DATE ET SALUTATION
// ---------------------------------------------------------------
function pad(n) { return String(n).padStart(2, "0"); }

function tick() {
  const now = new Date();
  const h = now.getHours();
  $("time").textContent = pad(h) + ":" + pad(now.getMinutes());
  $("date").textContent = now.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long"
  });
  $("greeting").textContent = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  if (themeMode === "auto") applyTheme();
}

// ---------------------------------------------------------------
// 3) THÈME JOUR / NUIT (auto, jour, nuit)
// ---------------------------------------------------------------
const MODES = ["auto", "day", "night"];
const MODE_LABEL = { auto: "Auto", day: "Jour", night: "Nuit" };
let themeMode = MODES.includes(store("awos-theme")) ? store("awos-theme") : "auto";

function applyTheme() {
  let theme = themeMode;
  if (themeMode === "auto") {
    const h = new Date().getHours();
    theme = h >= 6 && h < 18 ? "day" : "night";
  }
  document.documentElement.setAttribute("data-theme", theme);
  $("themeBtn").textContent = MODE_LABEL[themeMode];
}

$("themeBtn").addEventListener("click", () => {
  themeMode = MODES[(MODES.indexOf(themeMode) + 1) % MODES.length];
  store("awos-theme", themeMode);
  applyTheme();
});

// ---------------------------------------------------------------
// 4) COULEUR D'AMBIANCE
// ---------------------------------------------------------------
function setAccent(color) {
  document.documentElement.style.setProperty("--accent", color);
  store("awos-accent", color);
  document.querySelectorAll("#accents button").forEach((b) => {
    b.classList.toggle("active", b.dataset.color === color);
  });
}

function buildAccents() {
  const box = $("accents");
  ACCENTS.forEach((color) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.color = color;
    b.style.background = color;
    b.setAttribute("aria-label", "Couleur " + color);
    b.addEventListener("click", () => setAccent(color));
    box.appendChild(b);
  });
  const saved = store("awos-accent");
  setAccent(ACCENTS.includes(saved) ? saved : ACCENTS[0]);
}

// ---------------------------------------------------------------
// 5) TUILES D'APPLICATIONS
// ---------------------------------------------------------------
function buildApps() {
  const box = $("apps");
  APPS.forEach((app) => {
    const link = buildLink(app);
    const tile = document.createElement("a");
    tile.className = "tile";
    tile.innerHTML = '<span class="ico">' + app.icon + "</span><span>" + app.name + "</span>";
    if (link) {
      tile.href = link;
    } else {
      tile.href = "#";
      tile.addEventListener("click", (e) => {
        e.preventDefault();
        toast(app.name + " : à configurer dans js/app.js");
      });
    }
    box.appendChild(tile);
  });
}

$("navBtn").addEventListener("click", () => {
  window.location.href = buildLink(APPS[0]);
});

// ---------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------
buildAccents();
buildApps();
applyTheme();
tick();
setInterval(tick, 1000);
