/*
Base lab – déjà fonctionnel.
Les 12 features supplémentaires sont dans lab_solved/.
Chaque feature est volontairement petite pour qu’un junior puisse en prendre une ou deux.
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
  const state = store.getState();

  visitCount.textContent = String(state.visitCount);
  renderNotes(state);
  renderDetails(state);
}

function renderStateInspector(currentState, stateBeforeDispatch) {
  currentStateOutput.textContent = JSON.stringify(currentState, null, 2);
  previousStateOutput.textContent = JSON.stringify(stateBeforeDispatch, null, 2);
}

store.subscribe(() => {
  const state = store.getState();

  if (state.notes !== previousNotes) {
    saveNotes(state.notes);
    previousNotes = state.notes;
  }

  render();
  renderStateInspector(state, previousState);
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
  const newNote = {
    id: createNextNoteId(store.getState().notes),
    title,
    content,
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };

  store.dispatch({ type: "note/added", payload: newNote });
  store.dispatch({ type: "note/selected", payload: newNote.id });

  noteForm.reset();
  titleInput.focus();
});

incrementVisitCount();
store.dispatch({ type: "visits/incremented" });
store.dispatch({ type: "notes/loaded", payload: loadNotes() });
