/*
Application exploratoire – déjà fonctionnelle.
Il n’y a volontairement pas de corrigé au jour 2 : utilisez les DevTools pour
observer le code, formuler une hypothèse, puis la vérifier pas à pas.

PARCOURS DE BREAKPOINTS – JOUR 2
Posez les breakpoints phase par phase dans DevTools > Sources :

Démarrage (rafraîchissez la page)
- BP-01 : construire l'état initial à partir du stockage de session ;
- BP-02 : lire sessionStorage ;
- BP-03 : suivre les trois opérations de démarrage ;
- BP-04 : incrémenter puis écrire le compteur de session ;
- BP-05 : faire entrer une action dans dispatch ;
- BP-06 : calculer le prochain état dans le reducer ;
- BP-07 : recevoir le nouvel état dans l'abonnement ;
- BP-08 : rendre l'interface depuis le store ;
- BP-09 : lire localStorage et suivre try / catch / finally autour de JSON.parse.

Ajout d'une note (remplissez puis envoyez le formulaire)
- BP-10 : construire la nouvelle note et son action ;
- BP-11 : calculer un identifiant séquentiel ;
- BP-12 : créer un nouvel état et un nouveau tableau sans mutation ;
- BP-13 : convertir les notes en JSON puis les enregistrer.

Sélection d'une note (cliquez sur une note)
- BP-14 : envoyer l'action depuis le gestionnaire de clic ;
- BP-15 : retrouver la note sélectionnée et afficher ses détails.

À chaque arrêt, observez action, state, previousState et les valeurs dans Scope.
BP-05 à BP-08 se répètent pour chaque dispatch : désactivez-les après avoir
compris un passage si vous voulez avancer plus vite.
*/

import { createStore, initialState, reducer } from "./store.js";
import {
  createNextNoteId,
  incrementVisitCount,
  loadNotes,
  loadVisitCount,
  saveNotes,
} from "./storage.js";

const notesList = document.querySelector("#notes-list");
const emptyList = document.querySelector("#empty-list");
const noteDetails = document.querySelector("#note-details");
const visitCount = document.querySelector("#visit-count");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#note-title");
const contentInput = document.querySelector("#note-content");
const currentStateOutput = document.querySelector("#current-state");
const previousStateOutput = document.querySelector("#previous-state");

// BP-01 — Arrêtez-vous sur la ligne suivante, puis entrez dans loadVisitCount().
// Le spread part de l'état initial et remplace seulement le compteur mémorisé.
const storedVisitCount = loadVisitCount();
const store = createStore(reducer, {
  ...initialState,
  visitCount: storedVisitCount,
});

let previousNotes = store.getState().notes;
let previousState = store.getState();

function formatDate(date) {
  return new Date(date).toLocaleString("fr-FR");
}

function renderNotes(state) {
  // La liste est entièrement dérivée du store : aucun second tableau de notes
  // n'est conservé à côté de state.notes.
  notesList.replaceChildren();
  emptyList.hidden = state.notes.length > 0;

  state.notes.forEach((note) => {
    const item = document.createElement("li");
    const button = document.createElement("button");

    button.type = "button";
    button.className = "note-button";
    button.textContent = note.title;
    button.classList.toggle("is-selected", note.id === state.selectedId);
    button.setAttribute("aria-pressed", String(note.id === state.selectedId));
    button.addEventListener("click", () => {
      // BP-14 — La fonction fléchée garde l'accès à note grâce à une closure.
      // Inspectez note.id : le clic décrit le changement, dispatch l'effectue.
      store.dispatch({ type: "note/selected", payload: note.id });
    });

    item.append(button);
    notesList.append(item);
  });
}

function createDateRow(label, value) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");

  term.textContent = label;
  description.textContent = formatDate(value);

  return [term, description];
}

function renderDetails(state) {
  // BP-15 — Inspectez state.selectedId, puis le résultat de find().
  // Cette fonction lit l'état ; elle ne modifie ni la note ni le store.
  const selectedNote = state.notes.find((note) => note.id === state.selectedId);

  if (!selectedNote) {
    const message = document.createElement("p");
    message.textContent = "Sélectionnez une note dans la liste.";
    noteDetails.replaceChildren(message);
    return;
  }

  const title = document.createElement("h3");
  const content = document.createElement("p");
  const dates = document.createElement("dl");

  title.textContent = selectedNote.title;
  content.className = "note-content";
  content.textContent = selectedNote.content;
  dates.className = "dates";
  dates.append(
    ...createDateRow("Créée le", selectedNote.createdAt),
    ...createDateRow("Modifiée le", selectedNote.updatedAt),
  );

  noteDetails.replaceChildren(title, content, dates);
}

function render() {
  // BP-08 — Après un dispatch, l'interface relit l'unique source de vérité.
  // Avancez dans renderNotes() puis renderDetails() pour suivre le rendu.
  const state = store.getState();

  visitCount.textContent = String(state.visitCount);
  renderNotes(state);
  renderDetails(state);
}

function renderStateInspector(currentState, stateBeforeDispatch) {
  // Le troisième argument de JSON.stringify indente l'affichage sur deux espaces.
  // Cette conversion sert uniquement à visualiser les états ; elle ne les modifie pas.
  currentStateOutput.textContent = JSON.stringify(currentState, null, 2);
  previousStateOutput.textContent = JSON.stringify(stateBeforeDispatch, null, 2);
}

store.subscribe(() => {
  // BP-07 — state est le résultat du reducer ; previousState est encore l'ancien.
  // Comparez dans la Console :
  // state === previousState
  // state.notes === previousState.notes
  const state = store.getState();

  // Ce test de référence fonctionne parce que le reducer crée un nouveau tableau
  // uniquement quand les notes changent. Une simple sélection ne sauvegarde rien.
  if (state.notes !== previousNotes) {
    saveNotes(state.notes);
    previousNotes = state.notes;
  }

  render();
  renderStateInspector(state, previousState);

  // L'état actuel deviendra l'état précédent lors du prochain dispatch.
  previousState = state;
});

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    return;
  }

  const now = new Date().toISOString();

  // BP-10 — Inspectez title, content et now, puis entrez dans createNextNoteId().
  // La date et l'identifiant sont créés hors du reducer pour que celui-ci reste pur.
  const newNote = {
    id: createNextNoteId(store.getState().notes),
    title,
    content,
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };

  // Deux dispatch produisent deux transitions visibles : ajout, puis sélection.
  store.dispatch({ type: "note/added", payload: newNote });
  store.dispatch({ type: "note/selected", payload: newNote.id });

  noteForm.reset();
  titleInput.focus();
});

// BP-03 — Point de départ après l'installation des gestionnaires et abonnements.
// Avancez ligne par ligne : stockage de session, store, puis notes persistées.
incrementVisitCount();
store.dispatch({ type: "visits/incremented" });

// JavaScript évalue loadNotes() avant d'appeler dispatch avec son résultat.
store.dispatch({ type: "notes/loaded", payload: loadNotes() });
