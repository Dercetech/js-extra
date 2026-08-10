/*
Version résolue : le store reste l'unique source de vérité.
Chaque modification passe par une action puis par le reducer.
*/

import { createStore, initialState, reducer } from "./store.js";
import {
  createNextNoteId,
  incrementVisitCount,
  loadNotes,
  loadSelectedId,
  loadVisitCount,
  saveNotes,
  saveSelectedId
} from "./storage.js";

const notesList = document.querySelector("#notes-list");
const totalCount = document.querySelector("#total-count");
const pinnedCount = document.querySelector("#pinned-count");
const visitCount = document.querySelector("#visit-count");
const searchInput = document.querySelector("#search");
const filterSelect = document.querySelector("#filter");

const noSelection = document.querySelector("#no-selection");
const noteDetails = document.querySelector("#note-details");
const detailTitle = document.querySelector("#detail-title");
const detailContent = document.querySelector("#detail-content");
const pinStatus = document.querySelector("#pin-status");
const createdAt = document.querySelector("#created-at");
const updatedAt = document.querySelector("#updated-at");
const togglePinButton = document.querySelector("#toggle-pin");
const deleteButton = document.querySelector("#delete-note");

const addForm = document.querySelector("#add-form");
const editForm = document.querySelector("#edit-form");
const editTitle = document.querySelector("#edit-title");
const editContent = document.querySelector("#edit-content");
const exportButton = document.querySelector("#export-notes");
const importInput = document.querySelector("#import-notes");
const clearButton = document.querySelector("#clear-notes");
const currentStateOutput = document.querySelector("#current-state");
const previousStateOutput = document.querySelector("#previous-state");

const dateFormatter = new Intl.DateTimeFormat("fr-BE", {
  dateStyle: "medium",
  timeStyle: "short"
});

const store = createStore(reducer, {
  ...initialState,
  selectedId: loadSelectedId(),
  visitCount: loadVisitCount()
});

// Le reducer crée de nouveaux objets : cette référence reste donc l’état d’avant le dispatch suivant.
let previousState = store.getState();
let previousNotes = previousState.notes;
let previousSelectedId = previousState.selectedId;

store.subscribe(() => {
  const state = store.getState();
  const stateBeforeDispatch = previousState;

  if (state.notes !== previousNotes) {
    saveNotes(state.notes);
    previousNotes = state.notes;
  }

  if (state.selectedId !== previousSelectedId) {
    saveSelectedId(state.selectedId);
    previousSelectedId = state.selectedId;
  }

  render();
  renderStateInspector(state, stateBeforeDispatch);
  previousState = state;
});

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : dateFormatter.format(date);
}

function timestamp(value) {
  const result = Date.parse(value);
  return Number.isNaN(result) ? 0 : result;
}

function getSelectedNote(state) {
  return state.notes.find(note => note.id === state.selectedId) ?? null;
}

function getVisibleNotes(state) {
  const query = state.search.trim().toLocaleLowerCase("fr");

  // Le spread crée un tableau séparé avant sort(), qui modifie son tableau.
  return [...state.notes]
    .filter(note => state.filter === "all" || note.pinned)
    .filter(note => String(note.title).toLocaleLowerCase("fr").includes(query))
    .sort((first, second) => timestamp(second.updatedAt) - timestamp(first.updatedAt));
}

function renderList(state) {
  const notes = getVisibleNotes(state);
  notesList.replaceChildren();

  if (notes.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-message";
    item.textContent = state.notes.length === 0 ? "Aucune note pour le moment." : "Aucune note trouvée.";
    notesList.append(item);
    return;
  }

  notes.forEach(note => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const isSelected = note.id === state.selectedId;

    button.type = "button";
    button.className = "note-button";
    button.dataset.noteId = note.id;
    button.textContent = note.title;
    button.classList.toggle("pinned", note.pinned);
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-current", String(isSelected));
    button.setAttribute("aria-label", note.pinned ? `${note.title}, note épinglée` : note.title);

    item.append(button);
    notesList.append(item);
  });
}

function renderDetails(state) {
  const note = getSelectedNote(state);
  noSelection.hidden = Boolean(note);
  noteDetails.hidden = !note;

  if (!note) return;

  detailTitle.textContent = note.title;
  detailContent.textContent = note.content;
  pinStatus.textContent = note.pinned ? "Épinglée" : "Non épinglée";
  createdAt.textContent = formatDate(note.createdAt);
  updatedAt.textContent = formatDate(note.updatedAt);
  togglePinButton.textContent = note.pinned ? "Désépingler" : "Épingler";
  editTitle.value = note.title;
  editContent.value = note.content;
}

function render() {
  const state = store.getState();
  const numberOfPinnedNotes = state.notes.filter(note => note.pinned).length;

  totalCount.textContent = `${state.notes.length} ${state.notes.length === 1 ? "note" : "notes"}`;
  pinnedCount.textContent = `${numberOfPinnedNotes} ${
    numberOfPinnedNotes === 1 ? "note épinglée" : "notes épinglées"
  }`;
  visitCount.textContent = `Visites cette session : ${state.visitCount}`;
  searchInput.value = state.search;
  filterSelect.value = state.filter;

  renderList(state);
  renderDetails(state);
}

function renderStateInspector(currentState, stateBeforeDispatch) {
  currentStateOutput.textContent = JSON.stringify(currentState, null, 2);
  previousStateOutput.textContent = JSON.stringify(stateBeforeDispatch, null, 2);
}

function normalizeImportedNotes(value) {
  if (!Array.isArray(value)) {
    throw new Error("Le fichier doit contenir un tableau de notes.");
  }

  const normalizedNotes = value
    .map(note => {
      if (!note || typeof note !== "object") return null;

      const title = typeof note.title === "string" ? note.title.trim() : "";
      if (!title) return null;

      const now = new Date().toISOString();
      const created = Number.isNaN(Date.parse(note.createdAt)) ? now : note.createdAt;
      const updated = Number.isNaN(Date.parse(note.updatedAt)) ? created : note.updatedAt;

      return {
        // Un identifiant fourni dans le fichier reste inchangé.
        id: note.id === undefined || note.id === null ? null : note.id,
        title,
        content: typeof note.content === "string" ? note.content : "",
        createdAt: created,
        updatedAt: updated,
        pinned: Boolean(note.pinned)
      };
    })
    .filter(note => note !== null);

  // Les identifiants explicites sont connus avant de compléter les identifiants manquants.
  const notesUsedForIds = [
    ...store.getState().notes,
    ...normalizedNotes.filter(note => note.id !== null)
  ];

  return normalizedNotes.map(note => {
    if (note.id !== null) return note;

    const noteWithId = {
      ...note,
      id: createNextNoteId(notesUsedForIds)
    };
    notesUsedForIds.push(noteWithId);
    return noteWithId;
  });
}

notesList.addEventListener("click", event => {
  const button = event.target.closest("[data-note-id]");
  if (!button) return;

  const note = store
    .getState()
    .notes.find(currentNote => String(currentNote.id) === button.dataset.noteId);
  if (!note) return;

  store.dispatch({
    type: "note/selected",
    payload: note.id
  });
});

searchInput.addEventListener("input", event => {
  store.dispatch({
    type: "search/set",
    payload: event.target.value
  });
});

filterSelect.addEventListener("change", event => {
  store.dispatch({
    type: "filter/set",
    payload: event.target.value
  });
});

addForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(addForm);
  const title = String(data.get("title")).trim();
  const content = String(data.get("content")).trim();
  if (!title || !content) return;

  const now = new Date().toISOString();
  store.dispatch({
    type: "note/added",
    payload: {
      id: createNextNoteId(store.getState().notes),
      title,
      content,
      createdAt: now,
      updatedAt: now,
      pinned: false
    }
  });

  addForm.reset();
});

editForm.addEventListener("submit", event => {
  event.preventDefault();
  const note = getSelectedNote(store.getState());
  const title = editTitle.value.trim();
  const content = editContent.value.trim();
  if (!note || !title || !content) return;

  store.dispatch({
    type: "note/updated",
    payload: {
      id: note.id,
      title,
      content,
      updatedAt: new Date().toISOString()
    }
  });
});

togglePinButton.addEventListener("click", () => {
  const note = getSelectedNote(store.getState());
  if (!note) return;

  store.dispatch({
    type: "note/toggledPin",
    payload: {
      id: note.id,
      updatedAt: new Date().toISOString()
    }
  });
});

deleteButton.addEventListener("click", () => {
  const note = getSelectedNote(store.getState());
  if (!note) return;

  store.dispatch({
    type: "note/deleted",
    payload: note.id
  });
});

exportButton.addEventListener("click", () => {
  const json = JSON.stringify(store.getState().notes, null, 2);
  const file = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = "notes.json";
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const normalizedNotes = normalizeImportedNotes(JSON.parse(await file.text()));
    const knownIds = new Set(store.getState().notes.map(note => String(note.id)));
    const notes = normalizedNotes.filter(note => {
      const id = String(note.id);
      if (knownIds.has(id)) return false;
      knownIds.add(id);
      return true;
    });

    store.dispatch({
      type: "notes/imported",
      payload: notes
    });

    window.alert(`${notes.length} ${notes.length === 1 ? "note importée" : "notes importées"}.`);
  } catch (error) {
    console.warn("Import impossible.", error);
    window.alert("Le fichier JSON n'est pas valide.");
  } finally {
    event.target.value = "";
  }
});

clearButton.addEventListener("click", () => {
  const confirmed = window.confirm("Supprimer toutes les notes ? Cette action est définitive.");
  if (!confirmed) return;

  store.dispatch({ type: "notes/cleared" });
});

// Le compteur de session est incrémenté une fois à chaque ouverture de l'application.
incrementVisitCount();
store.dispatch({ type: "visits/incremented" });
store.dispatch({
  type: "notes/loaded",
  payload: loadNotes()
});
