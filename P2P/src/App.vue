<script setup>
// Séquence d’établissement et de fermeture de la connexion P2P :
// 1. Vue monte le composant et crée un objet PeerJS.
// 2. PeerJS demande un identifiant unique au serveur par HTTPS.
// 3. PeerJS ouvre ensuite une WebSocket de signalisation avec cet identifiant.
// 4. Un utilisateur communique son identifiant à l’autre utilisateur.
// 5. L’autre utilisateur saisit cet identifiant et clique sur « Se connecter ».
// 6. peer.connect() lance la négociation WebRTC via le serveur de signalisation.
// 7. Le navigateur distant reçoit connection et installe les écouteurs du canal.
// 8. L’événement open confirme que le DataChannel direct est prêt.
// 9. send() envoie le texte ; l’événement data le reçoit chez l’autre pair.
// 10. close() ferme le canal lors d’une déconnexion ou d’un rechargement.
// 11. Les événements close/error mettent enfin l’interface à jour.

import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import Peer from "peerjs";

// État réactif affiché par le template Vue.
const myId = ref("Attribution d’un identifiant…");
const otherId = ref("");
const message = ref("");
const messages = ref([]);
const status = ref("Connexion au serveur de signalisation…");
const statusType = ref("waiting");

// shallowRef réagit au remplacement de la connexion sans tenter de rendre
// tout l’objet PeerJS réactif. PeerJS conserve ainsi le contrôle de son objet.
const activeConnection = shallowRef(null);
const isConnected = ref(false);

let peer = null;

const canDisconnect = computed(() => activeConnection.value !== null);

function errorText(error) {
  return error?.message || error?.type || String(error);
}

// Cette fonction centralise le cycle de vie d’un canal de données, qu’il soit
// entrant ou sortant. L’exemple garde volontairement une seule connexion active.
function addConnection(connection) {
  // [BP-05-ATTACH] Inspecter connection.peer et activeConnection.value.
  if (activeConnection.value && activeConnection.value !== connection) {
    activeConnection.value.close();
  }

  activeConnection.value = connection;
  isConnected.value = false;
  status.value = `Connexion à ${connection.peer}…`;
  statusType.value = "waiting";

  // open signifie que la négociation WebRTC est terminée et que le DataChannel
  // peut réellement transporter des messages.
  connection.on("open", () => {
    // [BP-06-OPEN] Inspecter connection.open, connection.peer et activeConnection.value.
    if (activeConnection.value !== connection) return;
    isConnected.value = true;
    status.value = `Connecté à ${connection.peer}`;
    statusType.value = "connected";
    console.log("Connexion P2P établie avec :", connection.peer);
  });

  // data transporte ici le texte directement par le canal WebRTC.
  connection.on("data", (data) => {
    // [BP-08-RECEIVE] Inspecter data avant son ajout dans messages.value.
    console.log("Reçu :", data);
    messages.value.push({ from: connection.peer, text: String(data) });
  });

  // close est déclenché après une fermeture locale ou distante. Une coupure
  // réseau brutale peut prendre plus de temps à être détectée par WebRTC.
  connection.on("close", () => {
    // [BP-10-CLOSE] Inspecter connection.peer puis avancer pas à pas.
    console.log("Connexion P2P fermée :", connection.peer);
    if (activeConnection.value !== connection) return;
    activeConnection.value = null;
    isConnected.value = false;
    status.value = `${connection.peer} s’est déconnecté`;
    statusType.value = "disconnected";
  });

  connection.on("error", (error) => {
    // [BP-13-CONNECTION-ERROR] Inspecter error.name, error.message et connection.peer.
    console.error("Erreur de connexion P2P :", error);
    if (activeConnection.value !== connection) return;
    isConnected.value = false;
    status.value = `Erreur de connexion : ${errorText(error)}`;
    statusType.value = "disconnected";
  });
}

// Connexion sortante : l’utilisateur fournit l’identifiant de l’autre pair.
function connect() {
  const id = otherId.value.trim();
  // [BP-03-CONNECT-OUT] Inspecter otherId.value, id et peer.open.
  if (!peer?.open || !id) return;

  if (id === myId.value) {
    status.value = "Saisissez l’identifiant de l’autre navigateur";
    statusType.value = "disconnected";
    return;
  }

  console.log("Connexion à :", id);

  // peer.connect lance la signalisation puis la négociation WebRTC.
  addConnection(peer.connect(id, { reliable: true }));
}

function sendMessage() {
  const text = message.value.trim();
  if (!isConnected.value || !text) return;

  // [BP-07-SEND] Inspecter text, isConnected.value et activeConnection.value.open.
  activeConnection.value.send(text);
  console.log("Envoyé :", text);
  messages.value.push({ from: "Vous", text });
  message.value = "";
}

// Ferme uniquement le canal courant. Le Peer et son identifiant restent prêts
// pour recevoir une nouvelle connexion.
function disconnect() {
  const connection = activeConnection.value;
  if (!connection) return;

  activeConnection.value = null;
  isConnected.value = false;

  // [BP-09-DISCONNECT] Inspecter connection puis avancer sur close().
  connection.close();
  status.value = `Déconnecté de ${connection.peer}`;
  statusType.value = "disconnected";
  console.log("Déconnecté de :", connection.peer);
}

// Utilisé lors d’un rechargement, d’une fermeture d’onglet ou du démontage du
// composant. destroy ferme aussi la WebSocket vers le serveur de signalisation.
function closeEverything() {
  // [BP-11-UNLOAD] Inspecter activeConnection.value et peer, puis reprendre vite
  // l’exécution pour ne pas retarder artificiellement la fermeture de la page.
  activeConnection.value?.close();
  peer?.destroy();
}

onMounted(() => {
  const btwPeer = {
    host: "p2p.blackthornwinter.com",
    port: 443,
    path: "/rtc",
    key: "peerjs",
    secure: true,
    debug: 2,
  };

  // [BP-01-CREATION] Inspecter les options avant de construire le Peer.
  // peer = new Peer(undefined, btwPeer); // won't work on web deployment
  peer = new Peer(); // utliser le serveur de signalisation par défaut de PeerJS pour les tests locaux

  // PeerJS a d’abord obtenu l’identifiant par HTTPS, puis a ouvert la WebSocket.
  peer.on("open", (id) => {
    // [BP-02-ID] Inspecter id, peer.id et peer.open.
    myId.value = id;
    status.value = "Prêt — partagez votre identifiant";
    statusType.value = "ready";
    console.log("Votre identifiant PeerJS :", id);
  });

  // Ce callback est l’équivalent entrant de peer.connect().
  peer.on("connection", (connection) => {
    // [BP-04-CONNECT-IN] Inspecter connection.peer et connection.open.
    console.log("Connexion entrante de :", connection.peer);
    addConnection(connection);
  });

  // Attention : disconnected concerne la signalisation. Un DataChannel déjà
  // ouvert peut continuer à fonctionner sans le serveur de signalisation.
  peer.on("disconnected", () => {
    // [BP-12-SIGNAL-LOST] Inspecter peer.disconnected et isConnected.value.
    console.warn("Connexion au serveur de signalisation perdue");
    if (!isConnected.value) {
      status.value = "Connexion au serveur de signalisation perdue";
      statusType.value = "disconnected";
    }
  });

  peer.on("error", (error) => {
    // [BP-14-PEER-ERROR] Inspecter error.type et error.message.
    console.error("Erreur PeerJS :", error);
    status.value = `Erreur : ${errorText(error)}`;
    statusType.value = "disconnected";
  });

  // beforeunload couvre le rechargement et la fermeture normale de l’onglet.
  window.addEventListener("beforeunload", closeEverything);
});

// Ce nettoyage est également exécuté si Vue démonte le composant.
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
      <button type="submit" :disabled="!peer?.open || !otherId.trim()">Se connecter</button>
      <button type="button" class="secondary" :disabled="!canDisconnect" @click="disconnect">Se déconnecter</button>
    </form>

    <form class="row" @submit.prevent="sendMessage">
      <label for="message">Votre message</label>
      <input id="message" v-model="message" autocomplete="off" placeholder="Bonjour !" />
      <button type="submit" :disabled="!isConnected || !message.trim()">Envoyer</button>
    </form>

    <section>
      <h2>Messages</h2>
      <p v-if="messages.length === 0" class="empty">Aucun message pour le moment.</p>
      <ul v-else>
        <li v-for="(item, index) in messages" :key="index">
          <strong>{{ item.from }}:</strong> {{ item.text }}
        </li>
      </ul>
    </section>
  </main>
</template>
