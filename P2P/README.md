# Chat P2P simple avec Vue

Cet exemple volontairement minimal montre comment ouvrir un canal de données
PeerJS, envoyer du texte et détecter la déconnexion de l’autre navigateur.

## Lancer l’exemple

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:4200> dans deux onglets ou deux fenêtres.

1. Chaque navigateur reçoit son propre **identifiant**.
2. Copiez un identifiant dans le champ **Identifiant de l’autre personne** de
   l’autre navigateur.
3. Cliquez sur **Se connecter**.
4. Lorsque les deux côtés indiquent **Connecté**, envoyez des messages.
5. Cliquez sur **Se déconnecter**, fermez un onglet ou rechargez-le pour voir la
   fermeture du canal dans l’autre navigateur.

La console des outils de développement affiche les mêmes événements de
connexion ainsi que les messages envoyés et reçus.

## Séquence complète

Au montage du composant, PeerJS demande d’abord un identifiant unique au serveur
par HTTPS, puis ouvre une connexion WebSocket sécurisée de signalisation avec
cet identifiant. L’utilisateur le transmet à l’autre navigateur ; lorsque
celui-ci clique sur
**Se connecter**, `peer.connect()` demande au serveur de mettre les deux pairs
en relation et PeerJS réalise en arrière-plan la négociation WebRTC, notamment
les échanges SDP et ICE. Quand le canal de données est prêt, l’événement `open`
est déclenché des deux côtés : `send()` peut alors expédier un texte, que
l’autre navigateur reçoit dans l’événement `data`. Un clic sur **Se
déconnecter**, la fermeture ou le rechargement de la page ferme la connexion et
provoque normalement l’événement `close` chez l’autre pair ; une coupure réseau
brutale peut toutefois prendre un certain temps à être détectée. Le serveur sert
donc à présenter les navigateurs, tandis que les messages passent ensuite
directement par le canal de données WebRTC.

## Où placer les points d’arrêt ?

Dans les outils de développement du navigateur, ouvrez l’onglet **Sources**,
puis le fichier `src/App.vue`. Recherchez un marqueur `[BP-...]` et placez le
point d’arrêt sur la première instruction exécutable située juste en dessous du
commentaire. Les marqueurs restent valables même si les numéros de ligne
changent.

| Marqueur | Étape observée | Valeurs intéressantes à inspecter |
| --- | --- | --- |
| `[BP-01-CREATION]` | Création du Peer et ouverture de la signalisation | Les options `host`, `port`, `path`, `key` et `secure`, puis `peer` après avoir avancé d’une instruction |
| `[BP-02-ID]` | Identifiant attribué par le serveur | `id`, `peer.id` et `peer.open` |
| `[BP-03-CONNECT-OUT]` | Clic sortant sur **Se connecter** | `otherId.value`, `id` et `peer.open` |
| `[BP-04-CONNECT-IN]` | Connexion reçue dans l’autre navigateur | `connection.peer` et `connection.open` |
| `[BP-05-ATTACH]` | Installation de la connexion active et de ses écouteurs | `connection`, `activeConnection.value` et l’ancienne connexion éventuelle |
| `[BP-06-OPEN]` | DataChannel réellement prêt | `connection.open`, `connection.peer`, `isConnected.value` avant et après l’affectation |
| `[BP-07-SEND]` | Envoi d’un texte | `text`, `isConnected.value` et `activeConnection.value.open` |
| `[BP-08-RECEIVE]` | Réception du texte dans l’autre navigateur | `data` et `messages.value` avant et après `push()` |
| `[BP-09-DISCONNECT]` | Déconnexion demandée par le bouton | `connection`, puis avancer pas à pas sur `connection.close()` |
| `[BP-10-CLOSE]` | Fermeture du canal détectée localement ou à distance | `connection.peer`, `activeConnection.value` et `isConnected.value` |
| `[BP-11-UNLOAD]` | Rechargement, fermeture d’onglet ou démontage Vue | `activeConnection.value`, `peer.open` et `peer.destroyed` |
| `[BP-12-SIGNAL-LOST]` | Perte du serveur de signalisation | `peer.disconnected` et `isConnected.value` |
| `[BP-13-CONNECTION-ERROR]` | Erreur propre au canal de données | `error.name`, `error.message`, `connection.peer` et `connection.peerConnection?.iceConnectionState` |
| `[BP-14-PEER-ERROR]` | Erreur générale PeerJS, par exemple un pair absent | `error.type`, `error.message`, `peer.open` et `peer.id` |

### Parcours de débogage conseillé

Ouvrez les outils de développement dans les deux fenêtres afin d’observer le
côté sortant et le côté entrant en parallèle. Commencez par `[BP-01-CREATION]`
et `[BP-02-ID]`, puis placez `[BP-03-CONNECT-OUT]` dans la première fenêtre et
`[BP-04-CONNECT-IN]` dans la seconde. Continuez avec `[BP-05-ATTACH]` et
`[BP-06-OPEN]` des deux côtés. Pour un message, utilisez `[BP-07-SEND]` chez
l’expéditeur et `[BP-08-RECEIVE]` chez le destinataire. Testez ensuite le bouton
avec `[BP-09-DISCONNECT]` et `[BP-10-CLOSE]`. Enfin, reconnectez les pairs,
placez `[BP-11-UNLOAD]` dans l’onglet qui sera rechargé et `[BP-10-CLOSE]` dans
l’autre. `[BP-10-CLOSE]` peut aussi suspendre l’onglet qui ferme le canal :
reprenez alors l’exécution pour observer ensuite le côté distant.

Quelques conseils :

- Activez **Preserve log** dans la console pour conserver les traces après un
  rechargement.
- Placez les points d’arrêt dans le corps des callbacks, pas sur l’appel
  `connection.on(...)`, car cet appel ne fait qu’enregistrer l’écouteur.
- Sur `[BP-11-UNLOAD]`, reprenez rapidement l’exécution : une longue pause
  retarderait artificiellement la déconnexion observée par l’autre navigateur.
- Pour déclencher `[BP-14-PEER-ERROR]` sans perturber le serveur, essayez de vous
  connecter à un identifiant inexistant.
- Une perte brutale de réseau n’est pas toujours instantanée : WebRTC peut avoir
  besoin d’un délai avant de déclarer le canal fermé.

## Rôle du serveur

`peerjs` utilise ce service de signalisation :

```text
host: p2p.blackthornwinter.com
port: 443
path: /rtc
key:  peerjs
```

PeerJS ajoute lui-même la partie `/peerjs` à l’URL WebSocket. Une fois la
négociation terminée, les messages du chat ne transitent plus par cette
WebSocket : ils passent directement entre les navigateurs via le DataChannel
WebRTC.

Le service accepte volontairement cet exemple depuis
`http://localhost:4200` ou `http://127.0.0.1:4200`. Le port Vite est donc fixé
dans `vite.config.js`, avec `strictPort: true` afin d’éviter un changement de
port silencieux.
