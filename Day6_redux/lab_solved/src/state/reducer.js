import {
  createSeedNotes,
  nextIdFor,
  normalizeNoteCollection,
  sanitizeFilter,
} from "../logic/notes.js";

export const ActionTypes = Object.freeze({
  NOTE_ADDED: "note/added",
  NOTE_SELECTED: "note/selected",
  NOTE_UPDATED: "note/updated",
  NOTE_DELETED: "note/deleted",
  NOTE_PIN_TOGGLED: "note/pinToggled",
  NOTES_IMPORTED: "notes/imported",
  SEARCH_CHANGED: "filters/searchChanged",
  FILTER_CHANGED: "filters/filterChanged",
});

export function createInitialState(snapshot = {}, now = new Date().toISOString()) {
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

function cleanPayloadText(value, maximumLength) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function addNote(state, payload) {
  const title = cleanPayloadText(payload.title, 120);
  const content = cleanPayloadText(payload.content, 10_000);

  if (!title || !content) {
    return state;
  }

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

export function reducer(state, action) {
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
      const title = cleanPayloadText(action.payload.title, 120);
      const content = cleanPayloadText(action.payload.content, 10_000);

      if (!title || !content || !state.notes.some((note) => note.id === id)) {
        return state;
      }

      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === id
            ? { ...note, title, content, updatedAt: action.payload.now }
            : note,
        ),
      };
    }

    case ActionTypes.NOTE_DELETED: {
      const id = Number(action.payload.id);
      const notes = state.notes.filter((note) => note.id !== id);

      if (notes.length === state.notes.length) {
        return state;
      }

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
        notes: state.notes.map((note) =>
          note.id === id
            ? { ...note, pinned: !note.pinned, updatedAt: action.payload.now }
            : note,
        ),
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
      return { ...state, filter: sanitizeFilter(action.payload.filter) };

    default:
      return state;
  }
}
