const NOTES_KEY = "day2_redux_notes";
const VISITS_KEY = "day2_redux_visits";
const SELECTED_ID_KEY = "day2_redux_selected_id";
const LAST_NOTE_ID_KEY = "day2_redux_last_note_id";
const MAX_SEQUENTIAL_NOTE_ID = 999_999_999;

function asPositiveSafeInteger(value) {
  if (typeof value === "string" && value.trim() === "") return null;

  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= MAX_SEQUENTIAL_NOTE_ID
    ? number
    : null;
}

export function createNextNoteId(notes) {
  // Les identifiants numériques importés, même écrits comme texte, participent à la suite.
  const highestNoteId = (Array.isArray(notes) ? notes : []).reduce((highestId, note) => {
    const noteId = asPositiveSafeInteger(note?.id);
    return noteId === null ? highestId : Math.max(highestId, noteId);
  }, 0);
  const storedId = asPositiveSafeInteger(localStorage.getItem(LAST_NOTE_ID_KEY)) ?? 0;
  const nextId = Math.max(highestNoteId, storedId) + 1;

  if (nextId > MAX_SEQUENTIAL_NOTE_ID) {
    throw new RangeError("Impossible de créer un nouvel identifiant de note court.");
  }

  // Les anciens identifiants longs ne pilotent pas cette nouvelle suite.
  // Ce compteur persistant empêche la réutilisation d'un identifiant après une suppression.
  localStorage.setItem(LAST_NOTE_ID_KEY, String(nextId));
  return nextId;
}

export function loadNotes() {
  const savedNotes = localStorage.getItem(NOTES_KEY);
  if (!savedNotes) return [];

  try {
    const notes = JSON.parse(savedNotes);
    if (!Array.isArray(notes)) return [];

    // Le passage par JSON produit une copie profonde au moment de la restauration.
    return JSON.parse(JSON.stringify(notes));
  } catch (error) {
    console.warn("Les notes enregistrées ne sont pas lisibles.", error);
    return [];
  }
}

export function saveNotes(notes) {
  // La persistance est isolée ici et ne modifie pas le tableau reçu.
  const copy = JSON.parse(JSON.stringify(notes));
  localStorage.setItem(NOTES_KEY, JSON.stringify(copy));
}

export function loadVisitCount() {
  const value = Number.parseInt(sessionStorage.getItem(VISITS_KEY), 10);
  return Number.isFinite(value) ? value : 0;
}

export function incrementVisitCount() {
  const nextValue = loadVisitCount() + 1;
  sessionStorage.setItem(VISITS_KEY, String(nextValue));
  return nextValue;
}

export function loadSelectedId() {
  const savedValue = sessionStorage.getItem(SELECTED_ID_KEY);

  if (savedValue === null) {
    return null;
  }

  try {
    // JSON conserve le type de l'identifiant : nombre ou chaîne.
    return JSON.parse(savedValue);
  } catch {
    // Compatibilité avec une ancienne valeur enregistrée comme texte simple.
    return savedValue;
  }
}

export function saveSelectedId(selectedId) {
  if (selectedId === null) {
    sessionStorage.removeItem(SELECTED_ID_KEY);
    return;
  }

  sessionStorage.setItem(SELECTED_ID_KEY, JSON.stringify(selectedId));
}
