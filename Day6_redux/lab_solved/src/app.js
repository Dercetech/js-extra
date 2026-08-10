import { createActivityLog, createDispatchWrapper } from "./instrumentation/logger.js";
import {
  prepareImportedNotes,
  selectSelectedNote,
  selectVisibleNotes,
} from "./logic/notes.js";
import { createStorage, parseImportedJson } from "./persistence/storage.js";
import { ActionTypes, createInitialState, reducer } from "./state/reducer.js";
import { createStore } from "./state/store.js";
import { createView } from "./view/view.js";

const persistence = createStorage(window.localStorage);
const recoveredSnapshot = persistence.loadSnapshot();
const store = createStore(reducer, createInitialState(recoveredSnapshot));

let statusMessage = recoveredSnapshot.warnings.length
  ? recoveredSnapshot.warnings.join(" ")
  : "Application prête. Toutes les commandes sont utilisables au clavier.";
let activityLog;
let dispatch;

const view = createView({
  onAdd: ({ title, content }) => {
    if (!String(title).trim() || !String(content).trim()) {
      statusMessage = "Le titre et le contenu ne peuvent pas contenir uniquement des espaces.";
      render();
      return false;
    }

    dispatch({
      type: ActionTypes.NOTE_ADDED,
      payload: { title, content, now: new Date().toISOString() },
    });
    return true;
  },
  onSelect: (id) => {
    dispatch({ type: ActionTypes.NOTE_SELECTED, payload: { id } });
  },
  onEdit: ({ title, content }) => {
    if (!String(title).trim() || !String(content).trim()) {
      statusMessage = "Le titre et le contenu ne peuvent pas contenir uniquement des espaces.";
      render();
      return;
    }
    const id = store.getState().selectedId;
    if (id === null) return;
    dispatch({
      type: ActionTypes.NOTE_UPDATED,
      payload: { id, title, content, now: new Date().toISOString() },
    });
  },
  onDelete: () => {
    const id = store.getState().selectedId;
    if (id !== null) {
      dispatch({ type: ActionTypes.NOTE_DELETED, payload: { id } });
    }
  },
  onTogglePin: () => {
    const id = store.getState().selectedId;
    if (id !== null) {
      dispatch({
        type: ActionTypes.NOTE_PIN_TOGGLED,
        payload: { id, now: new Date().toISOString() },
      });
    }
  },
  onSearch: (query) => {
    dispatch({ type: ActionTypes.SEARCH_CHANGED, payload: { query } });
  },
  onFilter: (filter) => {
    dispatch({ type: ActionTypes.FILTER_CHANGED, payload: { filter } });
  },
  onExport: () => {
    view.downloadJson(store.getState().notes);
    activityLog.add("action", "export/json");
    statusMessage = "Export JSON préparé.";
    render();
  },
  onImport: importNotes,
  onClearLog: () => activityLog.clear(),
});

activityLog = createActivityLog(view.renderLog);
dispatch = createDispatchWrapper((action) => {
  activityLog.add("action", action.type);
})(store.dispatch);

const localStateActions = new Set([
  ActionTypes.NOTE_ADDED,
  ActionTypes.NOTE_UPDATED,
  ActionTypes.NOTE_DELETED,
  ActionTypes.NOTE_PIN_TOGGLED,
  ActionTypes.NOTES_IMPORTED,
]);

store.subscribe(({ state, action }) => {
  statusMessage = messageForAction(action, state);

  if (localStateActions.has(action.type)) {
    const result = persistence.saveLocalState(state);
    if (!result.ok) {
      statusMessage += ` Sauvegarde locale impossible : ${result.error}`;
    }
  }

  render();
});

function messageForAction(action, state) {
  const messages = {
    [ActionTypes.NOTE_ADDED]: "Note ajoutée et sauvegardée localement.",
    [ActionTypes.NOTE_SELECTED]: "Note sélectionnée.",
    [ActionTypes.NOTE_UPDATED]: "Modifications enregistrées.",
    [ActionTypes.NOTE_DELETED]: "Note supprimée.",
    [ActionTypes.NOTE_PIN_TOGGLED]: "Épinglage mis à jour.",
    [ActionTypes.NOTES_IMPORTED]: `${state.notes.length} note(s) importée(s).`,
    [ActionTypes.SEARCH_CHANGED]: "Résultats de recherche mis à jour.",
    [ActionTypes.FILTER_CHANGED]: "Filtre appliqué.",
  };

  return messages[action.type] ?? `Action ${action.type} traitée.`;
}

function render() {
  const state = store.getState();
  view.render({
    state,
    previousState: store.getPreviousState(),
    selectedNote: selectSelectedNote(state),
    statusMessage,
    visibleNotes: selectVisibleNotes(state),
  });
}

async function importNotes(file) {
  try {
    const parsed = parseImportedJson(await file.text());
    const imported = prepareImportedNotes(parsed, new Date().toISOString());
    dispatch({ type: ActionTypes.NOTES_IMPORTED, payload: imported });
  } catch (error) {
    activityLog.add("action", "notes/importFailed");
    statusMessage = error instanceof Error ? error.message : String(error);
    render();
  }
}

[
  "state/reducer.js",
  "state/store.js",
  "logic/notes.js",
  "persistence/storage.js",
  "view/view.js",
  "instrumentation/logger.js",
].forEach((moduleName) => activityLog.add("module", `module chargé · ${moduleName}`));

persistence.saveLocalState(store.getState());
render();
