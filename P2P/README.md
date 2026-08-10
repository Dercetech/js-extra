# Chat P2P multi-pairs avec Vue

Cet exemple Vue/Vite permet à un navigateur de conserver plusieurs connexions
PeerJS en même temps. Chaque pair possède son propre DataChannel WebRTC. Un
message peut être diffusé à tous les canaux ouverts, sans fermer les connexions
déjà établies lorsqu’un nouveau pair arrive.

## Lancer l’exemple

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:4200> dans trois onglets ou trois fenêtres, nommés par
exemple A, B et C.

1. Chaque navigateur reçoit son propre identifiant.
2. Dans A, collez l’identifiant de B puis cliquez sur **Ajouter ce pair**.
3. Dans A, collez ensuite l’identifiant de C et cliquez à nouveau sur
   **Ajouter ce pair**.
4. A doit maintenant afficher deux connexions simultanées. B et C affichent
   chacun leur connexion avec A.
5. **Envoyer à tous** depuis A envoie le texte une fois à B et une fois à C.
6. Le bouton **Déconnecter** d’une ligne ferme uniquement ce pair.
7. **Tout déconnecter** ferme tous les canaux, mais conserve l’identifiant local
   afin de pouvoir recevoir de nouvelles connexions.

La console affiche les ouvertures, envois, réceptions et fermetures avec
l’identifiant du pair concerné.

## Séquence complète

Au montage du composant, PeerJS reçoit un identifiant et ouvre sa connexion au
serveur de signalisation. Chaque identifiant distant fourni à `peer.connect()`
crée ensuite une `DataConnection` indépendante, stockée dans la `Map`
`connections` sous l’identifiant du pair. Les connexions entrantes suivent le
même chemin grâce à l’événement `peer.on("connection")`. Lorsque l’événement
`open` d’un canal est déclenché, seule l’entrée correspondante passe à l’état
`connected`, ce qui permet de répéter le processus sans fermer les autres
pairs. **Envoyer à tous** prend un instantané des entrées connectées et appelle
`send()` séparément sur chaque DataChannel ; il ne s’agit donc pas d’un canal de
groupe unique. Une fermeture ou une erreur retire uniquement l’entrée concernée,
tandis que la déconnexion globale parcourt toutes les entrées. En cas de
rechargement, tous les canaux sont fermés avant la destruction du Peer.

### Topologie obtenue

Si A est connecté à B et C, A peut diffuser un message aux deux. En revanche, B
et C ne sont pas automatiquement connectés entre eux et A ne relaie pas leurs
messages. Un message envoyé par B atteint donc A, mais pas C, sauf si B ouvre
aussi directement une connexion avec C.

## Où placer les points d’arrêt ?

`BP` signifie **Breakpoint**, ou **point d’arrêt**. Dans les outils de
développement du navigateur, ouvrez **Sources**, puis `src/App.vue`. Recherchez
un marqueur `[BP-...]` et placez le point d’arrêt sur la première instruction
exécutable située juste en dessous du commentaire.

| Marqueur | Étape observée | Valeurs intéressantes à inspecter |
| --- | --- | --- |
| `[BP-01-CREATION]` | Création du Peer | `btwPeer`, la ligne `new Peer()` active, puis `peer` |
| `[BP-02-ID]` | Identifiant attribué | `id`, `peer.id`, `peer.open` et `peerReady.value` |
| `[BP-03-CONNECT-OUT]` | Ajout d’un pair sortant | `id`, `peerReady.value`, `connections.size` et `connections.has(id)` |
| `[BP-04-CONNECT-IN]` | Connexion entrante | `connection.peer` et `connections.size` |
| `[BP-05-ATTACH]` | Ajout ou arbitrage d’un canal dans la Map | `peerId`, `direction`, `existing` et `connections` |
| `[BP-06-OPEN]` | Un DataChannel devient prêt | `current`, `connection.open`, `current.state` et `connectedCount.value` |
| `[BP-07-SEND]` | Diffusion à tous les canaux ouverts | `text`, `targets`, `targets.length` et chaque `connection.peer` dans la boucle |
| `[BP-08-RECEIVE]` | Réception d’un texte | `peerId`, `data` et `messages.value` |
| `[BP-09-DISCONNECT]` | Déconnexion d’un seul pair | `peerId`, `entry` et `connections` avant et après `delete()` |
| `[BP-15-DISCONNECT-ALL]` | Déconnexion globale | `peerIds`, puis chaque passage dans `disconnectPeer()` |
| `[BP-10-CLOSE]` | Fermeture locale ou distante d’un canal | `connection.peer` et les autres entrées encore présentes dans `connections` |
| `[BP-11-UNLOAD]` | Rechargement ou fermeture de la page | `entries`, `connections.size`, `peer.open` et `peer.destroyed` |
| `[BP-12-SIGNAL-LOST]` | Perte du serveur de signalisation | `peer.disconnected` et `connectedCount.value` ; les DataChannels existants peuvent rester ouverts |
| `[BP-13-CONNECTION-ERROR]` | Erreur d’un seul canal | `peerId`, `error.message`, `connections` et les autres pairs encore actifs |
| `[BP-14-PEER-ERROR]` | Erreur générale PeerJS | `error.type`, `error.message`, `peer.open` et `connections` |

## Parcours de débogage conseillé avec trois fenêtres

1. Placez `[BP-01-CREATION]` et `[BP-02-ID]` dans A, B et C.
2. Connectez A à B puis A à C. Observez `[BP-03-CONNECT-OUT]` deux fois dans A,
   `[BP-04-CONNECT-IN]` dans B et C, puis `[BP-05-ATTACH]` et `[BP-06-OPEN]` aux
   quatre extrémités des deux canaux.
3. Envoyez `A vers tous` depuis A. À `[BP-07-SEND]`, `targets.length` doit valoir
   `2`. `[BP-08-RECEIVE]` doit ensuite se déclencher une fois dans B et une fois
   dans C.
4. Envoyez une réponse depuis B puis depuis C. A doit recevoir deux messages
   avec deux `peerId` différents. B ne doit pas recevoir le message de C.
5. Déconnectez uniquement B depuis A avec `[BP-09-DISCONNECT]`. À la fermeture,
   la connexion C doit rester dans la Map et continuer à recevoir les messages.
6. Reconnectez B, puis utilisez `[BP-15-DISCONNECT-ALL]`. L’instantané `peerIds`
   doit contenir B et C avant que la Map soit vidée.
7. Reconnectez les deux pairs et rechargez A avec `[BP-11-UNLOAD]`. B et C
   doivent chacun retirer A ; leurs autres connexions éventuelles restent
   intactes.

Conseils :

- Activez **Preserve log** pour conserver les traces après un rechargement.
- Placez les points d’arrêt dans le corps des callbacks, pas sur
  `connection.on(...)`, qui ne fait qu’enregistrer un écouteur.
- Reprenez rapidement l’exécution à `[BP-11-UNLOAD]` afin de ne pas retarder
  artificiellement la fermeture du navigateur.
- Une coupure réseau brutale peut prendre du temps à être détectée par WebRTC.
- Une entrée encore affichée comme **Connexion…** peut être retirée avec son
  bouton **Déconnecter**, par exemple si l’identifiant distant n’existe pas.

## Serveur de signalisation actuellement sélectionné

Le fichier `App.vue` conserve deux possibilités :

```js
// Configuration Blackthorn disponible, actuellement inactive :
// peer = new Peer(undefined, btwPeer)

// Ligne active : service public par défaut configuré par PeerJS.
peer = new Peer()
```

Le bloc `btwPeer` décrit cette autre configuration :

```text
host: p2p.blackthornwinter.com
port: 443
path: /rtc
key:  peerjs
```

La gestion multi-pairs fonctionne de la même manière avec l’une ou l’autre
configuration. Lorsque `new Peer(undefined, btwPeer)` est réactivé, l’origine
locale doit rester sur le port `4200`, car le relais Blackthorn autorise
`http://localhost:4200` et `http://127.0.0.1:4200`. `strictPort: true` empêche
Vite de choisir silencieusement un autre port.
