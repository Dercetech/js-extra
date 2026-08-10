<script setup>
// Séquence d’établissement et de fermeture des connexions P2P :
// 1. Vue monte le composant et crée un objet PeerJS.
// 2. PeerJS reçoit un identifiant et ouvre la WebSocket de signalisation.
// 3. L’utilisateur partage son identifiant avec plusieurs autres navigateurs.
// 4. Chaque identifiant saisi crée son propre DataConnection WebRTC.
// 5. Chaque connexion entrante ou sortante est rangée dans la Map connections.
// 6. L’événement open marque uniquement le canal concerné comme connecté.
// 7. Les étapes 3 à 6 peuvent être répétées pour ajouter plusieurs pairs.
// 8. Envoyer à tous parcourt chaque canal ouvert et appelle send() sur chacun.
// 9. data reçoit le texte avec l’identifiant du pair qui l’a envoyé.
// 10. Un pair peut être déconnecté seul, ou tous les canaux peuvent être fermés.
// 11. close/error retire uniquement la connexion concernée de la Map.
// 12. Au rechargement, tous les canaux sont fermés puis le Peer est détruit.

import { computed, markRaw, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import Peer from "peerjs";

// État réactif affiché par le template Vue.
const myId = ref("Attribution d’un identifiant…");
const otherId = ref("");
const message = ref("");
const messages = ref([]);
const status = ref("Connexion au serveur de signalisation…");
const statusType = ref("waiting");
const peerReady = ref(false);

// La Map associe chaque identifiant distant à sa propre DataConnection.
// markRaw(), utilisé plus bas, empêche Vue de transformer les objets PeerJS.
const connections = reactive(new Map());

let peer = null;

const connectionList = computed(() => Array.from(connections.values()));
const connectedConnections = computed(() =>
  connectionList.value.filter((entry) => entry.state === "connected"),
);
const connectedCount = computed(() => connectedConnections.value.length);
const isConnected = computed(() => connectedCount.value > 0);
const canDisconnectAll = computed(() => connections.size > 0);

function errorText(error) {
  return error?.message || error?.type || String(error);
}

function connectedLabel(count = connectedCount.value) {
  return `${count} pair${count > 1 ? "s" : ""} connecté${count > 1 ? "s" : ""}`;
}

function updateStatus(prefix = "") {
  if (connectedCount.value > 0) {
    status.value = prefix ? `${prefix} — ${connectedLabel()}` : connectedLabel();
    statusType.value = "connected";
    return;
  }

  status.value = prefix || "Prêt — partagez votre identifiant";
  statusType.value = prefix ? "disconnected" : "ready";
}

function removeConnection(connection) {
  const current = connections.get(connection.peer);
  if (current?.connection !== connection) return false;
  connections.delete(connection.peer);
  return true;
}

// Si deux navigateurs cliquent simultanément, cette règle conserve le même
// canal des deux côtés au lieu de fermer accidentellement les deux doublons.
function preferredDirection(peerId) {
  if (!peer?.id) return "incoming";
  return peer.id < peerId ? "outgoing" : "incoming";
}

// Cette fonction installe le cycle de vie d’un canal entrant ou sortant.
function addConnection(connection, direction) {
  const peerId = connection.peer;
  const existing = connections.get(peerId);

  // [BP-05-ATTACH] Inspecter peerId, direction, existing et connections.
  if (existing?.connection === connection) return;

  if (existing) {
    const preferred = preferredDirection(peerId);
    const keepExisting = existing.direction === preferred || direction !== preferred;

    if (keepExisting) {
      console.warn("Connexion en double ignorée pour :", peerId);
      connection.close();
      return;
    }

    connections.delete(peerId);
    existing.connection.close();
  }

  connections.set(peerId, {
    peerId,
    connection: markRaw(connection),
    direction,
    state: connection.open ? "connected" : "connecting",
  });

  const previousCount = connectedCount.value;
  status.value = previousCount
    ? `Connexion avec ${peerId}… — ${connectedLabel(previousCount)}`
    : `Connexion avec ${peerId}…`;
  statusType.value = "waiting";

  // open signifie que ce DataChannel précis peut transporter des messages.
  connection.on("open", () => {
    const current = connections.get(peerId);
    // [BP-06-OPEN] Inspecter current, connection.open et connectedCount.value.
    if (current?.connection !== connection) return;
    current.state = "connected";
    updateStatus();
    console.log("Connexion P2P établie avec :", peerId);
  });

  connection.on("data", (data) => {
    const current = connections.get(peerId);
    if (current?.connection !== connection) return;
    // [BP-08-RECEIVE] Inspecter peerId, data et messages.value.
    console.log(`Reçu de ${peerId} :`, data);
    messages.value.push({ from: peerId, text: String(data) });
  });

  connection.on("close", () => {
    // [BP-10-CLOSE] Vérifier que seul peerId est retiré de connections.
    if (!removeConnection(connection)) return;
    console.log("Connexion P2P fermée :", peerId);
    updateStatus(`${peerId} s’est déconnecté`);
  });

  connection.on("error", (error) => {
    // [BP-13-CONNECTION-ERROR] Inspecter peerId, error et connections.
    if (!removeConnection(connection)) return;
    connection.close();
    console.error(`Erreur de connexion P2P avec ${peerId} :`, error);
    updateStatus(`Erreur avec ${peerId} : ${errorText(error)}`);
  });

  if (connection.open) updateStatus();
}

// Connexion sortante : chaque nouvel identifiant ajoute un pair à la Map.
function connect() {
  const id = otherId.value.trim();
  // [BP-03-CONNECT-OUT] Inspecter id, peerReady.value et connections.
  if (!peerReady.value || !id) return;

  if (id === myId.value) {
    status.value = "Saisissez l’identifiant d’un autre navigateur";
    statusType.value = "disconnected";
    return;
  }

  if (connections.has(id)) {
    status.value = `Une connexion avec ${id} existe déjà`;
    statusType.value = "waiting";
    return;
  }

  console.log("Connexion à :", id);
  const connection = peer.connect(id, { reliable: true });
  addConnection(connection, "outgoing");
  otherId.value = "";
}

// Un message de groupe est ici une boucle sur plusieurs canaux individuels.
// Il ne s’agit pas d’un DataChannel unique partagé entre tous les pairs.
function sendMessage() {
  const text = message.value.trim();
  const targets = connectedConnections.value.map((entry) => entry.connection);
  if (!text || targets.length === 0) return;

  // [BP-07-SEND] Inspecter text, targets et targets.length.
  let sentCount = 0;
  for (const connection of targets) {
    if (!connection.open) continue;
    connection.send(text);
    sentCount += 1;
    console.log(`Envoyé à ${connection.peer} :`, text);
  }

  if (sentCount > 0) {
    messages.value.push({ from: `Vous → tous (${sentCount})`, text });
    message.value = "";
  }
}

// Retire l’entrée avant close(), car une connexion encore en négociation
// n’émet pas toujours l’événement close de PeerJS.
function disconnectPeer(peerId, announce = true) {
  const entry = connections.get(peerId);
  if (!entry) return;

  // [BP-09-DISCONNECT] Inspecter peerId, entry et connections avant delete().
  connections.delete(peerId);
  entry.connection.close();
  console.log("Déconnecté de :", peerId);

  if (announce) updateStatus(`Déconnecté de ${peerId}`);
}

function disconnectAll() {
  const peerIds = Array.from(connections.keys());
  if (peerIds.length === 0) return;

  // [BP-15-DISCONNECT-ALL] Inspecter peerIds avant de fermer chaque canal.
  for (const peerId of peerIds) disconnectPeer(peerId, false);
  status.value = "Toutes les connexions sont fermées";
  statusType.value = "disconnected";
}

// Lors d’un reload, la Map est vidée avant les fermetures afin que les callbacks
// tardifs d’un canal ne puissent pas supprimer une nouvelle connexion.
function closeEverything() {
  const entries = Array.from(connections.values());
  // [BP-11-UNLOAD] Inspecter entries, connections.size et peer.
  connections.clear();
  for (const entry of entries) entry.connection.close();
  peer?.destroy();
  peerReady.value = false;
}

onMounted(() => {
  // Configuration Blackthorn disponible, mais inactive dans la ligne actuelle.
  const btwPeer = {
    host: "p2p.blackthornwinter.com",
    port: 443,
    path: "/rtc",
    key: "peerjs",
    secure: true,
    debug: 2,
  };

  // [BP-01-CREATION] Comparer les deux configurations avant de créer le Peer.
  // peer = new Peer(undefined, btwPeer); // à réactiver lorsque cette origine est autorisée
  peer = new Peer(); // choix actuel : serveur public par défaut de PeerJS

  peer.on("open", (id) => {
    // [BP-02-ID] Inspecter id, peer.id et peer.open.
    peerReady.value = true;
    myId.value = id;
    updateStatus();
    console.log("Votre identifiant PeerJS :", id);
  });

  peer.on("connection", (connection) => {
    // [BP-04-CONNECT-IN] Inspecter connection.peer et connections.size.
    console.log("Connexion entrante de :", connection.peer);
    addConnection(connection, "incoming");
  });

  // La perte de signalisation ne ferme pas les DataChannels déjà ouverts.
  peer.on("disconnected", () => {
    // [BP-12-SIGNAL-LOST] Inspecter peer.disconnected et connectedCount.value.
    peerReady.value = false;
    console.warn("Connexion au serveur de signalisation perdue");
    updateStatus("Connexion au serveur de signalisation perdue");
  });

  peer.on("error", (error) => {
    // [BP-14-PEER-ERROR] Inspecter error.type, error.message et connections.
    console.error("Erreur PeerJS :", error);
    updateStatus(`Erreur : ${errorText(error)}`);
  });

  window.addEventListener("beforeunload", closeEverything);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", closeEverything);
  closeEverything();
});
</script>

<template>
  <main>
    <h1>Chat P2P simple</h1>

    <p class="your-id">
      Votre identifiant :
      <strong data-testid="my-id">{{ myId }}</strong>
    </p>

    <p class="status" :class="statusType" role="status">
      {{ status }}
    </p>

    <!-- prevent empêche le formulaire de recharger toute la page. -->
    <form class="row" @submit.prevent="connect">
      <label for="other-id">Identifiant de l’autre personne</label>
      <input id="other-id" v-model="otherId" autocomplete="off" placeholder="Collez son identifiant" />
      <button type="submit" :disabled="!peerReady || !otherId.trim()">Ajouter ce pair</button>
    </form>

    <section>
      <div class="section-heading">
        <h2>Connexions ({{ connectionList.length }})</h2>
        <button type="button" class="secondary small" :disabled="!canDisconnectAll" @click="disconnectAll">
          Tout déconnecter
        </button>
      </div>

      <p v-if="connectionList.length === 0" class="empty">Aucun pair pour le moment.</p>
      <ul v-else class="peer-list" data-testid="peer-list">
        <li v-for="entry in connectionList" :key="entry.peerId">
          <span class="peer-details">
            <strong>{{ entry.peerId }}</strong>
            <small>
              {{ entry.state === "connected" ? "Connecté" : "Connexion…" }}
              · {{ entry.direction === "incoming" ? "entrant" : "sortant" }}
            </small>
          </span>
          <button
            type="button"
            class="secondary small"
            :aria-label="`Déconnecter ${entry.peerId}`"
            @click="disconnectPeer(entry.peerId)"
          >
            Déconnecter
          </button>
        </li>
      </ul>
    </section>

    <form class="row" @submit.prevent="sendMessage">
      <label for="message">Votre message à tous les pairs connectés</label>
      <input id="message" v-model="message" autocomplete="off" placeholder="Bonjour !" />
      <button type="submit" :disabled="!isConnected || !message.trim()">Envoyer à tous</button>
    </form>

    <section>
      <h2>Messages</h2>
      <p v-if="messages.length === 0" class="empty">Aucun message pour le moment.</p>
      <ul v-else data-testid="messages">
        <li v-for="(item, index) in messages" :key="index">
          <strong>{{ item.from }}:</strong> {{ item.text }}
        </li>
      </ul>
    </section>
  </main>
</template>
