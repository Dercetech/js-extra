# Jour 3 Récap — Faire évoluer l’application de notes

Le [récapitulatif du support du jour 3](https://training.dercetech.com/trainings/javascript-vanilla-devtools/day-3.html#recap) propose de faire évoluer l’application de notes avec le DOM, les événements et le store Redux minimal découvert au jour 2.

Ce dossier contient deux versions de la même application :

- `lab` : base déjà fonctionnelle ;
- `lab_solved` : base complétée avec les 12 fonctionnalités supplémentaires.

Les deux versions utilisent JavaScript vanilla et un store Redux minimal. Vite
sert uniquement à lancer le projet et à produire une version statique.
Les notes reçoivent des identifiants séquentiels. Le dernier numéro attribué est
conservé dans `localStorage` avec la clé `day3_redux_last_note_id`.

## Installer et lancer le lab

```bash
cd lab
npm install
npm run dev
```

Ouvrez ensuite <http://localhost:5177/>.

## Créer une version exportable

Depuis le dossier de la version choisie :

```bash
npm run build
```

Le dossier `dist` contient la version statique. Pour la vérifier localement :

```bash
npm run preview
```

## Utiliser la version résolue

```bash
cd ../lab_solved
npm install
npm run dev
```

La version résolue est disponible sur <http://localhost:5178/>.
