# Jour 2 Extra — Notes et store Redux minimal

Le [récapitulatif du support du jour 2](https://training.dercetech.com/trainings/javascript-vanilla-devtools/day-2.html#recap) présente le contexte de l’exercice, le `switch` du reducer et un premier aperçu de `try`, `catch` et `finally`.

Ce dossier contient deux versions de la même application :

- `lab` : base déjà fonctionnelle ;
- `lab_solved` : base complétée avec les 12 fonctionnalités supplémentaires.

Les deux versions utilisent JavaScript vanilla et un store Redux minimal. Vite
sert uniquement à lancer le projet et à produire une version statique.
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

La version résolue est disponible sur <http://localhost:5176/>.
