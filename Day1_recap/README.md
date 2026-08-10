# Day 1 Recap — Canon

Ce dossier contient deux versions du même exercice :

- `cannon` : version à réparer ;
- `cannon_solved` : version corrigée.

## Installer et lancer la version à réparer

```bash
cd cannon
npm install
npm run dev
```

Ouvrez ensuite <http://localhost:5173/>. Modifiez uniquement `src/student.js`.
À chaque chargement, le canon adopte immédiatement les valeurs `power`, `angle`
et `wind` avant le premier tir.

## Créer une version exportable

Dans `cannon`, le build ne réussit qu’après la correction des sept bugs. Un échec avant la fin de l’exercice est donc attendu.

```bash
npm run build
```

Le dossier `dist` contient la version statique à copier vers l’emplacement de votre choix. Pour la vérifier localement :

```bash
npm run preview
```

## Utiliser la version corrigée

Exécutez les mêmes commandes depuis le dossier `cannon_solved` :

```bash
cd ../cannon_solved
npm install
npm run dev
```

La version corrigée est alors disponible sur <http://localhost:5174/>.
