# Jour 2 Récap — Exploration d’un store Redux minimal

Le [récapitulatif du support du jour 2](https://training.dercetech.com/trainings/javascript-vanilla-devtools/day-2.html#recap) présente le contexte de l’exercice, le `switch` du reducer et un premier aperçu de `try`, `catch` et `finally`.

Ce dossier contient une seule application exploratoire déjà fonctionnelle. Elle
utilise JavaScript vanilla et un store Redux minimal ; Vite sert uniquement à
lancer le projet et à produire une version statique.

Commencez par la liste de repères `BP-xx` placée en tête de `src/app.js`, puis
posez les breakpoints correspondants dans `app.js`, `store.js` et `storage.js`.
L’objectif est d’observer le trajet d’une action, l’immutabilité du reducer, le
rendu du DOM et la persistance, pas de compléter une liste de fonctionnalités.
Les notes reçoivent des identifiants séquentiels. Le dernier numéro attribué est
conservé dans `localStorage` avec la clé `day2_redux_last_note_id`.

## Installer et lancer le lab

```bash
cd lab
npm install
npm run dev
```

Ouvrez ensuite <http://localhost:5175/>.

## Créer une version exportable

Depuis le dossier `lab` :

```bash
npm run build
```

Le dossier `dist` contient la version statique. Pour la vérifier localement :

```bash
npm run preview
```
