const NOTES_KEY = "day3_redux_notes";
const VISITS_KEY = "day3_redux_visits";
const LAST_NOTE_ID_KEY = "day3_redux_last_note_id";
const MAX_SEQUENTIAL_NOTE_ID = 999_999_999;

function toPositiveSafeInteger(value) {
  if (typeof value === "string" && value.trim() === "") {
    return 0;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= MAX_SEQUENTIAL_NOTE_ID
    ? number
    : 0;
}

export function loadNotes() {
  const storedValue = localStorage.getItem(NOTES_KEY);

  if (storedValue === null) {
    return [];
  }

  try {
    const notes = JSON.parse(storedValue);
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function createNextNoteId(notes) {
  const highestNoteId = notes.reduce(
    (highestId, note) => Math.max(highestId, toPositiveSafeInteger(note?.id)),
    0,
  );
  const storedLastId = toPositiveSafeInteger(
    localStorage.getItem(LAST_NOTE_ID_KEY),
  );
  const nextId = Math.max(highestNoteId, storedLastId) + 1;

  if (nextId > MAX_SEQUENTIAL_NOTE_ID) {
    throw new RangeError("Impossible de créer un nouvel identifiant de note court.");
  }

  // Les anciens identifiants longs ne pilotent pas cette nouvelle suite.
  // La création de l'identifiant garde son accès à localStorage isolé ici.
  localStorage.setItem(LAST_NOTE_ID_KEY, String(nextId));
  return nextId;
}

export function loadVisitCount() {
  const storedValue = sessionStorage.getItem(VISITS_KEY);
  const count = Number(storedValue);

  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export function incrementVisitCount() {
  const nextCount = loadVisitCount() + 1;
  sessionStorage.setItem(VISITS_KEY, String(nextCount));
  return nextCount;
}
