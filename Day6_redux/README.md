# Jour 6 Récap — Refactoriser l’application de notes en modules

Le [récapitulatif du support du jour 6](https://training.dercetech.com/trainings/javascript-vanilla-devtools/day-6.html#recap) conclut la progression de l’application de notes : le comportement reste en place, tandis que ses responsabilités deviennent des modules ES explicites et observables dans DevTools.

Ce dossier contient deux variantes visuellement et fonctionnellement équivalentes :

- `lab` : application complète, volontairement regroupée dans `src/app.js` ; sept régions commentées indiquent quoi extraire ;
- `lab_solved` : résultat du refactor, avec imports relatifs explicites et un `app.js` limité à l’orchestration.

Le lab n’est pas un squelette cassé. Avant, pendant et après chaque extraction, il doit continuer à charger, sauvegarder, ajouter, sélectionner, modifier, supprimer et épingler des notes. La recherche, les filtres, l’import/export JSON, les raccourcis clavier, l’inspecteur d’état et le journal doivent eux aussi rester utilisables.

## Lancer les deux variantes

Vite est fixé à la version `8.2.1`. Installez chaque variante séparément avec une version de Node.js compatible.

### Lab monolithique

```bash
cd lab
npm install
npm run dev
```

Ouvrez <http://localhost:5182/>. Le port est strict : Vite signale une collision au lieu d’en choisir un autre.

### Solution modulaire

Dans un second terminal :

```bash
cd lab_solved
npm install
npm run dev
```

Ouvrez <http://localhost:5183/>.

Pour produire puis vérifier une version statique depuis le dossier choisi :

```bash
npm run build
npm run preview
```

Les previews utilisent respectivement <http://localhost:4182/> et <http://localhost:4183/>. La configuration `base: "./"` permet aussi de servir chaque build depuis un sous-dossier.

## État de départ à préserver

Faites une courte recette avant le premier déplacement de code :

1. ajoutez une note avec le formulaire puis avec `Ctrl + Entrée` (`Cmd + Entrée` sur macOS) ;
2. sélectionnez une note au clavier, modifiez-la, épinglez-la puis recherchez-la ;
3. appliquez chacun des filtres et effacez la recherche avec `Échap` ;
4. exportez les notes, puis réimportez le fichier JSON ;
5. rechargez la page et vérifiez la persistance ;
6. comparez l’état précédent et l’état actuel dans le tableau de contrôle.

Les données utilisent uniquement ces clés :

- `day6_redux_notes` ;
- `day6_redux_next_note_id`.

Une liste vide (`[]`) est une sauvegarde valide : après avoir supprimé la dernière note, un rechargement ne doit pas recréer les notes de démonstration. Celles-ci apparaissent uniquement quand la clé des notes est absente ou illisible.

## Refactor incrémental en sept étapes

À chaque étape : déplacez une région, ajoutez ses `export`, importez-la avec un chemin relatif terminé par `.js`, rechargez la page et refaites une action avant de continuer. Évitez un déplacement global difficile à diagnostiquer.

### 1. Extraire la logique pure

Créez `src/logic/notes.js` et déplacez-y la normalisation, la préparation d’un import et les sélecteurs. Ces fonctions reçoivent leurs données en arguments et ne lisent ni le DOM, ni `localStorage`, ni le store.

Contrôle rapide dans la Console : pour un même état, `selectVisibleNotes(state)` doit toujours produire le même résultat sans modifier `state.notes`.

### 2. Extraire l’état et le reducer

Créez `src/state/reducer.js`. Déplacez `ActionTypes`, `createInitialState` et `reducer`. Le reducer reste synchrone et pur : les dates lui sont fournies dans les actions et `localStorage` n’y apparaît jamais.

Supprimez, modifiez et épinglez une note. Chaque transition doit produire un nouvel état sans modifier l’ancien objet affiché par l’inspecteur.

### 3. Extraire le store

Créez `src/state/store.js`. Le store conserve l’état actuel, l’état précédent et les abonnements. Il reste l’unique source de vérité de l’interface ; la vue et la persistance ne maintiennent pas une copie concurrente des notes.

Posez un breakpoint dans `dispatch`, puis vérifiez l’ordre `action → reducer → abonnés → rendu`.

### 4. Isoler la persistance

Créez `src/persistence/storage.js` pour lire et écrire les deux clés, ainsi que pour parser le JSON importé. Gardez la distinction entre une clé absente (`null`) et une collection vide valide (`[]`). Les erreurs de JSON ou de quota doivent revenir à l’orchestrateur sous une forme affichable.

### 5. Extraire l’instrumentation

Créez `src/instrumentation/logger.js`. Conservez le véritable motif de fonction d’ordre supérieur :

```js
const dispatch = createDispatchWrapper(writeEntry)(store.dispatch);
```

`createDispatchWrapper` reçoit la fonction `writeEntry`, retourne une fonction qui reçoit `dispatch`, puis retourne le dispatch instrumenté. Le wrapper journalise l’action sans connaître le reducer ou le DOM.

### 6. Extraire la vue DOM

Créez `src/view/view.js`. Déplacez la capture des éléments, les écouteurs et le rendu. Conservez :

- les formulaires, `FormData` et la validation HTML native ;
- la délégation de clic depuis la liste vers `button[data-note-id]` ;
- les boutons sémantiques, les libellés associés et le focus visible ;
- `Échap` pour vider la recherche et `Ctrl/Cmd + Entrée` pour soumettre les formulaires ;
- le statut visible associé à une région `aria-live`.

La vue reçoit un modèle préparé par l’orchestrateur ; elle n’importe pas le store.

### 7. Amincir l’orchestrateur

Conservez dans `src/app.js` uniquement la composition : créer les dépendances, connecter les gestionnaires, persister après les actions concernées et demander un rendu. Comparez avec `lab_solved/src/app.js` si nécessaire.

Le graphe attendu est :

```text
app.js
├── state/reducer.js ← logic/notes.js
├── state/store.js
├── persistence/storage.js
├── instrumentation/logger.js
└── view/view.js
```

## Vérifications dans DevTools

### Sources

1. Dans la solution, ouvrez **Sources** puis développez `src`.
2. Vérifiez que `logic`, `state`, `persistence`, `instrumentation` et `view` sont chargés séparément.
3. Posez un breakpoint dans `state/store.js` sur `dispatch` et dans `state/reducer.js` sur le `switch`.
4. Ajoutez ou épinglez une note et suivez la pile d’appels jusqu’à `app.js`, puis `view/view.js`.
5. Confirmez dans **Scope** que l’état précédent et le nouvel état sont deux objets distincts après une mutation.

### Network

1. Ouvrez **Network**, activez **Disable cache**, filtrez sur `JS`, puis rechargez la solution.
2. Vérifiez les requêtes distinctes pour `app.js`, `notes.js`, `reducer.js`, `store.js`, `storage.js`, `logger.js` et `view.js`.
3. Ouvrez l’onglet **Initiator** d’un module pour retrouver son import relatif.
4. Confirmez qu’aucune requête vers un CDN ou un domaine externe n’est émise.
5. Lancez `npm run build`, puis la preview : les modules peuvent être regroupés par Vite, mais le comportement doit rester identique.

Dans **Application → Local Storage**, contrôlez les deux clés `day6_redux_…`. Supprimez la dernière note, rechargez et vérifiez que `day6_redux_notes` contient toujours `[]`.

## Critères de fin

Le travail est terminé lorsque :

- `npm run build` réussit dans `lab` et `lab_solved` ;
- les deux interfaces offrent le même comportement et ne font aucune requête externe ;
- un rechargement restaure aussi bien une collection remplie qu’une collection volontairement vide ;
- toutes les mutations passent par `dispatch` et le reducer ;
- la logique pure est testable sans navigateur ;
- les erreurs de stockage et d’import donnent un message visible ;
- le tableau de contrôle montre l’état précédent, l’état actuel et les actions ;
- le graphe des modules est visible dans **Sources** et dans **Network** en développement ;
- `src/app.js` de la solution sert d’orchestrateur et ne contient plus le rendu DOM, le reducer ou l’accès direct à `localStorage`.
