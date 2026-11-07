// AUTO WILL OS V2 — logique de l'écran d'accueil
//
// Les données du véhicule passent toutes par une seule porte d'entrée :
//
//   window.AUTOWILL.update({
//     speed: 52,                                   // km/h
//     coolant: 88,                                 // °C
//     doors: { fl: false, fr: true, rl: false, rr: false, hood: false, trunk: false },
//     media: { title: "...", artist: "...", playing: true,
//              playlist: ["...", "..."], index: 0 }
//   });
//
// Aujourd'hui : seule la vitesse est réelle (GPS du navigateur).
// Le reste s'active quand une application Android (ou un pont) appelle update().
// Le mode « Démo » simule toutes les données pour voir le rendu.

// ---------------------------------------------------------------
// 1) APPLICATIONS (barre du bas)
// - pkg    : nom du paquet Android de l'application
// - action : réglage système à ouvrir (si pas de pkg)
// - href   : lien direct (ex. tel:)
// Sans pkg/action/href, la tuile affiche « À configurer ».
// Les paquets Radio et CarPlay dépendent de ton autoradio.
// ---------------------------------------------------------------
const APPS = [
  { name: "Navigation", icon: "🧭", pkg: "com.google.android.apps.maps" },
  { name: "Waze",       icon: "🚗", pkg: "com.waze" },
  { name: "Musique",    icon: "🎵", pkg: "com.google.android.apps.youtube.music" },
  { name: "Spotify",    icon: "🎧", pkg: "com.spotify.music" },
  { name: "Téléphone",  icon: "📞", href: "tel:" },
  { name: "Radio",      icon: "📻", pkg: "" },
  { name: "CarPlay",    icon: "📱", pkg: "" },
  { name: "Bluetooth",  icon: "🔵", action: "android.settings.BLUETOOTH_SETTINGS" },
  { name: "Réglages",   icon: "⚙️", action: "android.settings.SETTINGS" }
];

const ACCENTS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

const DOOR_NAMES = {
  fl: "porte avant gauche", fr: "porte avant droite",
  rl: "porte arrière gauche", rr: "porte arrière droite",
  hood: "capot", trunk: "coffre"
};

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
  toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}

function buildLink(app) {
  if (app.href) return app.href;
  if (app.pkg) return "intent://#Intent;package=" + app.pkg + ";end";
  if (app.action) return "intent://#Intent;action=" + app.action + ";end";
  return null;
}

// ---------------------------------------------------------------
// 2) ÉTAT DU VÉHICULE ET AFFICHAGE
// ---------------------------------------------------------------
function freshState() {
  return {
    speed: null,
    speedSrc: "GPS en attente…",
    coolant: null,
    doors: { fl: false, fr: false, rl: false, rr: false, hood: false, trunk: false },
    doorsKnown: false,
    media: { title: "", artist: "", playing: false, playlist: [], index: -1 }
  };
}

let state = freshState();
let bridgeSpeedAt = 0;

function render() {
  // Vitesse
  $("speed").textContent = state.speed === null ? "--" : state.speed;
  $("speedSrc").textContent = state.speedSrc;

  // Température moteur
  const t = state.coolant;
  $("coolant").textContent = t === null ? "-- °C" : Math.round(t) + " °C";
  const pct = t === null ? 0 : Math.max(0, Math.min(1, (t - 40) / 80)) * 100;
  const fill = $("gaugeFill");
  fill.style.width = pct + "%";
  fill.style.background = t === null ? "#64748b" : t < 70 ? "#38bdf8" : t <= 105 ? "#22c55e" : "#ef4444";
  $("tempWarn").textContent = t === null ? "Aucune donnée moteur" : t < 70 ? "Moteur en chauffe" : t > 105 ? "Température élevée" : "Température normale";

  // Portes
  const open = [];
  Object.keys(DOOR_NAMES).forEach((k) => {
    const el = $("d-" + k);
    const isOpen = !!state.doors[k];
    el.classList.toggle("open", isOpen);
    if (isOpen) open.push(DOOR_NAMES[k]);
  });
  const st = $("doorStatus");
  if (!state.doorsKnown) {
    st.textContent = "Aucune donnée du véhicule";
    st.classList.remove("alert");
  } else if (open.length === 0) {
    st.textContent = "Toutes les portes sont fermées";
    st.classList.remove("alert");
  } else {
    st.textContent = "Ouvert : " + open.join(", ");
    st.classList.add("alert");
  }

  // Musique
  const m = state.media;
  const current = m.index >= 0 ? m.playlist[m.index] : "";
  $("trackTitle").textContent = m.title || current || "Aucune musique";
  $("trackArtist").textContent = m.artist || (m.title || current ? "" : "Connecte ton téléphone en Bluetooth");
  $("playBtn").textContent = m.playing ? "⏸" : "▶";

  const list = $("playlist");
  list.innerHTML = "";
  if (!m.playlist.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Playlist vide";
    list.appendChild(li);
  } else {
    m.playlist.slice(0, 5).forEach((name, i) => {
      const li = document.createElement("li");
      li.textContent = (i + 1) + ". " + name;
      if (i === m.index) li.className = "current";
      list.appendChild(li);
    });
  }
}

// Porte d'entrée des données réelles (application Android, pont, etc.)
function update(data) {
  if (!data || demo) return;
  if ("speed" in data && data.speed !== null) {
    state.speed = Math.round(Number(data.speed));
    state.speedSrc = "Véhicule";
    bridgeSpeedAt = Date.now();
  }
  if ("coolant" in data) state.coolant = data.coolant === null ? null : Number(data.coolant);
  if (data.doors) {
    Object.assign(state.doors, data.doors);
    state.doorsKnown = true;
  }
  if (data.media) Object.assign(state.media, data.media);
  render();
}

window.AUTOWILL = { update: update, getState: () => state };

// ---------------------------------------------------------------
// 3) VITESSE PAR GPS (réelle dès maintenant, si le GPS est disponible)
// ---------------------------------------------------------------
function startGps() {
  if (!("geolocation" in navigator)) {
    state.speedSrc = "GPS indisponible";
    render();
    return;
  }
  navigator.geolocation.watchPosition(
    (pos) => {
      if (demo || Date.now() - bridgeSpeedAt < 5000) return;
      const v = pos.coords.speed;
      if (v === null || isNaN(v)) {
        state.speed = null;
        state.speedSrc = "GPS : vitesse indisponible";
      } else {
        const kmh = v * 3.6;
        state.speed = kmh < 3 ? 0 : Math.round(kmh);
        state.speedSrc = "GPS";
      }
      render();
    },
    () => {
      if (demo) return;
      state.speed = null;
      state.speedSrc = "GPS refusé ou indisponible";
      render();
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
  );
}

// ---------------------------------------------------------------
// 4) COMMANDES MUSIQUE
// Avec l'application Android, window.AndroidBridge.mediaCommand(cmd)
// envoie la commande au lecteur Bluetooth. Sans elle, seul le mode
// Démo répond.
// ---------------------------------------------------------------
function mediaCommand(cmd) {
  if (demo) {
    const m = state.media;
    if (cmd === "playpause") m.playing = !m.playing;
    if (cmd === "next" && m.playlist.length) m.index = (m.index + 1) % m.playlist.length;
    if (cmd === "previous" && m.playlist.length) m.index = (m.index - 1 + m.playlist.length) % m.playlist.length;
    m.title = m.playlist[m.index] || "";
    render();
    return;
  }
  if (window.AndroidBridge && typeof window.AndroidBridge.mediaCommand === "function") {
    window.AndroidBridge.mediaCommand(cmd);
  } else {
    toast("Commandes musique : disponibles avec l'application Android");
  }
}

document.querySelectorAll(".player button").forEach((b) => {
  b.addEventListener("click", () => mediaCommand(b.dataset.cmd));
});

// ---------------------------------------------------------------
// 5) MODE DÉMO
// ---------------------------------------------------------------
let demo = false;
let demoTimer = null;
let demoTick = 0;

function demoStep() {
  demoTick++;
  const s = state;
  s.speed = Math.max(0, Math.min(120, Math.round((s.speed || 0) + (Math.random() * 18 - 6))));
  s.speedSrc = "Démo";
  s.coolant = Math.min(95, (s.coolant === null ? 55 : s.coolant) + 1.5);
  s.doorsKnown = true;
  if (demoTick % 4 === 0) {
    const keys = Object.keys(DOOR_NAMES);
    const k = keys[Math.floor(Math.random() * keys.length)];
    s.doors[k] = !s.doors[k];
  }
  if (demoTick === 1) {
    s.media = {
      title: "Titre d'exemple", artist: "Artiste d'exemple", playing: true,
      playlist: ["Titre d'exemple", "Deuxième titre", "Troisième titre", "Quatrième titre"],
      index: 0
    };
  }
  render();
}

$("demoBtn").addEventListener("click", () => {
  demo = !demo;
  $("demoBtn").textContent = "Démo : " + (demo ? "oui" : "non");
  $("demoBtn").classList.toggle("on", demo);
  if (demo) {
    state = freshState();
    demoTick = 0;
    demoStep();
    demoTimer = setInterval(demoStep, 1500);
  } else {
    clearInterval(demoTimer);
    state = freshState();
    render();
  }
});

// ---------------------------------------------------------------
// 6) HORLOGE, DATE ET SALUTATION
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
// 7) THÈME JOUR / NUIT (auto, jour, nuit)
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
// 8) COULEUR D'AMBIANCE
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
// 9) BARRE D'APPLICATIONS
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

// ---------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------
buildAccents();
buildApps();
applyTheme();
tick();
render();
startGps();
setInterval(tick, 1000);
