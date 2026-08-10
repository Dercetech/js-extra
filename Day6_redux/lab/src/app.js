/*
 * JOUR 6 — LAB FONCTIONNEL ET VOLONTAIREMENT MONOLITHIQUE
 *
 * Ne réécrivez pas l’application. Extrayez progressivement les sept régions
 * marquées ci-dessous, sans modifier le comportement observable.
 */

// ─────────────────────────────────────────────────────────────────────────────
// RÉGION 1/7 À EXTRAIRE → logic/notes.js (fonctions pures et sélecteurs)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_FILTERS = new Set(["all", "pinned", "unpinned"]);

function cleanText(value, maximumLength) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function validTimestamp(value, fallback) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? new Date(value).toISOString()
    : fallback;
}

function normalizeNoteCollection(value, options = {}) {
  const { now = new Date().toISOString(), reassignIds = false } = options;
  if (!Array.isArray(value)) return [];

  const usedIds = new Set();
  let generatedId = 1;

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];

    const title = cleanText(candidate.title, 120);
    const content = cleanText(candidate.content, 10_000);
    if (!title || !content) return [];

    let id = Number(candidate.id);
    if (reassignIds || !Number.isSafeInteger(id) || id < 1 || usedIds.has(id)) {
      while (usedIds.has(generatedId)) generatedId += 1;
      id = generatedId;
    }

    usedIds.add(id);
    generatedId = Math.max(generatedId, id + 1);
    const createdAt = validTimestamp(candidate.createdAt, now);

    return [{
      id,
      title,
      content,
      pinned: Boolean(candidate.pinned),
      createdAt,
      updatedAt: validTimestamp(candidate.updatedAt, createdAt),
    }];
  });
}

function createSeedNotes(now = new Date().toISOString()) {
  return normalizeNoteCollection([
    {
      id: 1,
      title: "Tracer une action",
      content: "Poser un breakpoint dans dispatch, puis suivre le reducer et le rendu.",
      pinned: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      title: "Cartographier les responsabilités",
      content: "Repérer l’état, la logique pure, le stockage, la vue et l’orchestration.",
      pinned: false,
      createdAt: now,
      updatedAt: now,
    },
  ], { now });
}

function prepareImportedNotes(value, now = new Date().toISOString()) {
  const collection = Array.isArray(value) ? value : value?.notes;
  const notes = normalizeNoteCollection(collection, { now, reassignIds: true });
  if (notes.length === 0) {
    throw new TypeError("Le fichier importé ne contient aucune note valide.");
  }
  return {
    notes,
    nextNoteId: Math.max(...notes.map((note) => note.id)) + 1,
  };
}

function selectVisibleNotes(state) {
  const query = state.query.trim().toLocaleLowerCase("fr");
  return state.notes.filter((note) => {
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "pinned" && note.pinned) ||
      (state.filter === "unpinned" && !note.pinned);
    if (!matchesFilter) return false;
    if (!query) return true;
    return `${note.title} ${note.content}`.toLocaleLowerCase("fr").includes(query);
  });
}

function selectSelectedNote(state) {
  return state.notes.find((note) => note.id === state.selectedId) ?? null;
}

function nextIdFor(notes) {
  return notes.reduce((highest, note) => Math.max(highest, note.id), 0) + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉGION 2/7 À EXTRAIRE → state/reducer.js (état initial + reducer pur)
// ─────────────────────────────────────────────────────────────────────────────

const ActionTypes = Object.freeze({
  NOTE_ADDED: "note/added",
  NOTE_SELECTED: "note/selected",
  NOTE_UPDATED: "note/updated",
  NOTE_DELETED: "note/deleted",
  NOTE_PIN_TOGGLED: "note/pinToggled",
  NOTES_IMPORTED: "notes/imported",
  SEARCH_CHANGED: "filters/searchChanged",
  FILTER_CHANGED: "filters/filterChanged",
});

function createInitialState(snapshot = {}, now = new Date().toISOString()) {
  const hasStoredCollection = Array.isArray(snapshot.notes);
  const notes = hasStoredCollection
    ? normalizeNoteCollection(snapshot.notes, { now })
    : createSeedNotes(now);
  const computedNextId = nextIdFor(notes);
  const recoveredNextId = Number(snapshot.nextNoteId);
  const nextNoteId =
    Number.isSafeInteger(recoveredNextId) && recoveredNextId >= computedNextId
      ? recoveredNextId
      : computedNextId;

  return {
    notes,
    selectedId: notes[0]?.id ?? null,
    query: "",
    filter: "all",
    nextNoteId,
  };
}

function addNote(state, payload) {
  const title = cleanText(payload.title, 120);
  const content = cleanText(payload.content, 10_000);
  if (!title || !content) return state;

  const note = {
    id: state.nextNoteId,
    title,
    content,
    pinned: Boolean(payload.pinned),
    createdAt: payload.now,
    updatedAt: payload.now,
  };
  return {
    ...state,
    notes: [note, ...state.notes],
    selectedId: note.id,
    nextNoteId: state.nextNoteId + 1,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.NOTE_ADDED:
      return addNote(state, action.payload);

    case ActionTypes.NOTE_SELECTED: {
      const id = Number(action.payload.id);
      return state.notes.some((note) => note.id === id)
        ? { ...state, selectedId: id }
        : state;
    }

    case ActionTypes.NOTE_UPDATED: {
      const id = Number(action.payload.id);
      const title = cleanText(action.payload.title, 120);
      const content = cleanText(action.payload.content, 10_000);
      if (!title || !content || !state.notes.some((note) => note.id === id)) return state;
      return {
        ...state,
        notes: state.notes.map((note) => note.id === id
          ? { ...note, title, content, updatedAt: action.payload.now }
          : note),
      };
    }

    case ActionTypes.NOTE_DELETED: {
      const id = Number(action.payload.id);
      const notes = state.notes.filter((note) => note.id !== id);
      if (notes.length === state.notes.length) return state;
      return {
        ...state,
        notes,
        selectedId: state.selectedId === id ? (notes[0]?.id ?? null) : state.selectedId,
      };
    }

    case ActionTypes.NOTE_PIN_TOGGLED: {
      const id = Number(action.payload.id);
      return {
        ...state,
        notes: state.notes.map((note) => note.id === id
          ? { ...note, pinned: !note.pinned, updatedAt: action.payload.now }
          : note),
      };
    }

    case ActionTypes.NOTES_IMPORTED:
      return {
        ...state,
        notes: action.payload.notes,
        selectedId: action.payload.notes[0]?.id ?? null,
        nextNoteId: action.payload.nextNoteId,
        query: "",
        filter: "all",
      };

    case ActionTypes.SEARCH_CHANGED:
      return { ...state, query: String(action.payload.query ?? "") };

    case ActionTypes.FILTER_CHANGED:
      return {
        ...state,
        filter: VALID_FILTERS.has(action.payload.filter) ? action.payload.filter : "all",
      };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉGION 3/7 À EXTRAIRE → state/store.js (source de vérité observable)
// ─────────────────────────────────────────────────────────────────────────────

function createStore(reducerFunction, initialState) {
  if (typeof reducerFunction !== "function") {
    throw new TypeError("Le reducer du store doit être une fonction.");
  }

  let currentState = initialState;
  let previousState = null;
  const listeners = new Set();

  function dispatch(action) {
    if (!action || typeof action.type !== "string") {
      throw new TypeError("Une action doit posséder une propriété type.");
    }
    previousState = currentState;
    currentState = reducerFunction(currentState, action);
    for (const listener of listeners) {
      listener({ state: currentState, previousState, action });
    }
    return action;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    dispatch,
    subscribe,
    getState: () => currentState,
    getPreviousState: () => previousState,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉGION 4/7 À EXTRAIRE → persistence/storage.js
// (frontière avec localStorage et le JSON importé)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEYS = Object.freeze({
  notes: "day6_redux_notes",
  nextNoteId: "day6_redux_next_note_id",
});

function createStorage(storage) {
  function loadSnapshot() {
    const warnings = [];
    function safelyRead(key, fallback) {
      try {
        const value = storage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        warnings.push(`La clé ${key} a été ignorée car son contenu est invalide.`);
        return fallback;
      }
    }
    return {
      notes: safelyRead(STORAGE_KEYS.notes, null),
      nextNoteId: safelyRead(STORAGE_KEYS.nextNoteId, null),
      warnings,
    };
  }

  function writeEntries(entries) {
    try {
      for (const [key, value] of entries) {
        storage.setItem(key, JSON.stringify(value));
      }
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  return {
    loadSnapshot,
    saveLocalState: (state) => writeEntries([
      [STORAGE_KEYS.notes, state.notes],
      [STORAGE_KEYS.nextNoteId, state.nextNoteId],
    ]),
  };
}

function parseImportedJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new TypeError("Le fichier sélectionné n’est pas un JSON valide.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉGION 5/7 À EXTRAIRE → instrumentation/logger.js (fonction d’ordre supérieur)
// ─────────────────────────────────────────────────────────────────────────────

function createActivityLog(onChange, maximumEntries = 18) {
  let entries = [];
  function publish() {
    onChange([...entries]);
  }
  function add(kind, message) {
    entries = [...entries, {
      id: `${Date.now()}-${Math.random()}`,
      kind,
      message,
      time: new Date().toLocaleTimeString("fr-BE"),
    }].slice(-maximumEntries);
    publish();
  }
  function clear() {
    entries = [];
    publish();
  }
  return { add, clear, getEntries: () => [...entries] };
}

// Reçoit une fonction, puis retourne une fonction qui retourne une fonction.
function createDispatchWrapper(writeEntry) {
  return function wrapDispatch(dispatchFunction) {
    return function dispatchWithLog(action) {
      writeEntry(action);
      return dispatchFunction(action);
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉGION 6/7 À EXTRAIRE → view/view.js (DOM, événements et rendu)
// ─────────────────────────────────────────────────────────────────────────────

function requiredElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Élément DOM introuvable : ${selector}`);
  return element;
}

function formatDate(value) {
  if (!value) return "jamais";
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function shortcutSubmits(form) {
  form.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    }
  });
}

function createView(handlers) {
  const elements = {
    variantBadge: requiredElement("#variant-badge"),
    status: requiredElement("#status"),
    notesCount: requiredElement("#notes-count"),
    search: requiredElement("#search"),
    filter: requiredElement("#filter"),
    emptyList: requiredElement("#empty-list"),
    notesList: requiredElement("#notes-list"),
    addForm: requiredElement("#add-form"),
    newTitle: requiredElement("#new-title"),
    noSelection: requiredElement("#no-selection"),
    noteEditor: requiredElement("#note-editor"),
    editForm: requiredElement("#edit-form"),
    editTitle: requiredElement("#edit-title"),
    editContent: requiredElement("#edit-content"),
    togglePin: requiredElement("#toggle-pin"),
    deleteNote: requiredElement("#delete-note"),
    pinIndicator: requiredElement("#pin-indicator"),
    noteDates: requiredElement("#note-dates"),
    exportNotes: requiredElement("#export-notes"),
    importNotes: requiredElement("#import-notes"),
    architectureSummary: requiredElement("#architecture-summary"),
    previousState: requiredElement("#previous-state"),
    currentState: requiredElement("#current-state"),
    clearLog: requiredElement("#clear-log"),
    activityLog: requiredElement("#activity-log"),
  };
  let selectedVersion = null;

  elements.variantBadge.textContent = "Lab · monolithe fonctionnel";
  elements.architectureSummary.textContent =
    "src/app.js · 7 régions à extraire sans modifier le comportement";

  // Délégation : un seul écouteur gère tous les boutons de notes, même recréés.
  elements.notesList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-note-id]");
    if (button) handlers.onSelect(Number(button.dataset.noteId));
  });
  elements.search.addEventListener("input", () => handlers.onSearch(elements.search.value));
  elements.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.search.value) {
      event.preventDefault();
      elements.search.value = "";
      handlers.onSearch("");
    }
  });
  elements.filter.addEventListener("change", () => handlers.onFilter(elements.filter.value));

  elements.addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.addForm);
    const accepted = handlers.onAdd({
      title: formData.get("title"),
      content: formData.get("content"),
    });
    if (accepted !== false) {
      elements.addForm.reset();
      elements.newTitle.focus();
    }
  });
  elements.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.editForm);
    handlers.onEdit({
      title: formData.get("title"),
      content: formData.get("content"),
    });
  });
  shortcutSubmits(elements.addForm);
  shortcutSubmits(elements.editForm);

  elements.togglePin.addEventListener("click", handlers.onTogglePin);
  elements.deleteNote.addEventListener("click", () => {
    if (window.confirm("Supprimer définitivement cette note ?")) handlers.onDelete();
  });
  elements.exportNotes.addEventListener("click", handlers.onExport);
  elements.importNotes.addEventListener("change", () => {
    const [file] = elements.importNotes.files;
    if (file) handlers.onImport(file);
    elements.importNotes.value = "";
  });
  elements.clearLog.addEventListener("click", handlers.onClearLog);

  function renderNotes(visibleNotes, selectedId) {
    const items = visibleNotes.map((note) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const title = document.createElement("span");
      const marker = document.createElement("span");
      const preview = document.createElement("span");

      button.type = "button";
      button.className = "note-select";
      button.dataset.noteId = String(note.id);
      button.setAttribute("aria-current", String(note.id === selectedId));
      button.setAttribute("aria-label", `${note.title}${note.pinned ? ", épinglée" : ""}`);
      title.className = "note-title";
      title.textContent = note.title;
      marker.className = "note-marker";
      marker.textContent = note.pinned ? "Épinglée" : `#${note.id}`;
      preview.className = "note-preview";
      preview.textContent = note.content;
      button.append(title, marker, preview);
      item.append(button);
      return item;
    });
    elements.notesList.replaceChildren(...items);
    elements.emptyList.hidden = visibleNotes.length > 0;
  }

  function renderEditor(note) {
    elements.noSelection.hidden = Boolean(note);
    elements.noteEditor.hidden = !note;
    elements.pinIndicator.hidden = !note?.pinned;
    if (!note) {
      selectedVersion = null;
      return;
    }

    const version = `${note.id}:${note.updatedAt}`;
    if (version !== selectedVersion) {
      elements.editTitle.value = note.title;
      elements.editContent.value = note.content;
      selectedVersion = version;
    }
    elements.togglePin.textContent = note.pinned ? "Désépingler" : "Épingler";
    elements.togglePin.setAttribute("aria-pressed", String(note.pinned));
    elements.noteDates.textContent =
      `Créée ${formatDate(note.createdAt)} · modifiée ${formatDate(note.updatedAt)}`;
  }

  function render(viewModel) {
    const { state, previousState, selectedNote, statusMessage, visibleNotes } = viewModel;
    elements.status.textContent = statusMessage;
    elements.notesCount.textContent = visibleNotes.length === state.notes.length
      ? `${state.notes.length} note${state.notes.length > 1 ? "s" : ""}`
      : `${visibleNotes.length} sur ${state.notes.length}`;
    elements.search.value = state.query;
    elements.filter.value = state.filter;
    renderNotes(visibleNotes, state.selectedId);
    renderEditor(selectedNote);
    elements.previousState.textContent = previousState
      ? JSON.stringify(previousState, null, 2)
      : "— aucune action précédente —";
    elements.currentState.textContent = JSON.stringify(state, null, 2);
  }

  function renderLog(entries) {
    const items = entries.map((entry) => {
      const item = document.createElement("li");
      item.className = `log-${entry.kind}`;
      item.textContent = `${entry.time} · ${entry.message}`;
      return item;
    });
    elements.activityLog.replaceChildren(...items);
    elements.activityLog.scrollTop = elements.activityLog.scrollHeight;
  }

  function downloadJson(notes) {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), notes }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "notes-jour-6.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return { downloadJson, render, renderLog };
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉGION 7/7 À CONSERVER MINCE → app.js (orchestration des dépendances)
// ─────────────────────────────────────────────────────────────────────────────

function bootstrap() {
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
    onSelect: (id) => dispatch({ type: ActionTypes.NOTE_SELECTED, payload: { id } }),
    onEdit: ({ title, content }) => {
      if (!String(title).trim() || !String(content).trim()) {
        statusMessage = "Le titre et le contenu ne peuvent pas contenir uniquement des espaces.";
        render();
        return;
      }
      const id = store.getState().selectedId;
      if (id !== null) {
        dispatch({
          type: ActionTypes.NOTE_UPDATED,
          payload: { id, title, content, now: new Date().toISOString() },
        });
      }
    },
    onDelete: () => {
      const id = store.getState().selectedId;
      if (id !== null) dispatch({ type: ActionTypes.NOTE_DELETED, payload: { id } });
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
    onSearch: (query) => dispatch({ type: ActionTypes.SEARCH_CHANGED, payload: { query } }),
    onFilter: (filter) => dispatch({ type: ActionTypes.FILTER_CHANGED, payload: { filter } }),
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
      if (!result.ok) statusMessage += ` Sauvegarde locale impossible : ${result.error}`;
    }
    render();
  });

  function messageForAction(action, state) {
    return ({
      [ActionTypes.NOTE_ADDED]: "Note ajoutée et sauvegardée localement.",
      [ActionTypes.NOTE_SELECTED]: "Note sélectionnée.",
      [ActionTypes.NOTE_UPDATED]: "Modifications enregistrées.",
      [ActionTypes.NOTE_DELETED]: "Note supprimée.",
      [ActionTypes.NOTE_PIN_TOGGLED]: "Épinglage mis à jour.",
      [ActionTypes.NOTES_IMPORTED]: `${state.notes.length} note(s) importée(s).`,
      [ActionTypes.SEARCH_CHANGED]: "Résultats de recherche mis à jour.",
      [ActionTypes.FILTER_CHANGED]: "Filtre appliqué.",
    })[action.type] ?? `Action ${action.type} traitée.`;
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
      dispatch({
        type: ActionTypes.NOTES_IMPORTED,
        payload: prepareImportedNotes(parsed, new Date().toISOString()),
      });
    } catch (error) {
      activityLog.add("action", "notes/importFailed");
      statusMessage = error instanceof Error ? error.message : String(error);
      render();
    }
  }

  [
    "1 · logique pure / sélecteurs",
    "2 · état / reducer",
    "3 · store",
    "4 · stockage / import JSON",
    "5 · instrumentation HOF",
    "6 · vue DOM",
    "7 · orchestration",
  ].forEach((region) => activityLog.add("module", `région repérée · ${region}`));

  persistence.saveLocalState(store.getState());
  render();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  bootstrap();
}

export {
  ActionTypes,
  createDispatchWrapper,
  createInitialState,
  createStore,
  normalizeNoteCollection,
  prepareImportedNotes,
  reducer,
  selectSelectedNote,
  selectVisibleNotes,
};
