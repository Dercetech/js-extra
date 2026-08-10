const NOTES_KEY = "day2_redux_notes";
const VISITS_KEY = "day2_redux_visits";
const LAST_NOTE_ID_KEY = "day2_redux_last_note_id";
const MAX_SEQUENTIAL_NOTE_ID = 999_999_999;

// Le stockage contient du texte. Cette fonction accepte seulement les identifiants
// positifs, courts et représentables sans perte de précision par JavaScript.
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
  // BP-09 — Inspectez storedValue, puis avancez dans try, catch et finally.
  // Pour tester catch, remplacez la valeur de day2_redux_notes par { invalide
  // dans DevTools > Application > Local Storage, puis rafraîchissez la page.
  const storedValue = localStorage.getItem(NOTES_KEY);
  let notes = [];

  // JSON.parse peut lever une exception : try protège le démarrage de l'application.
  try {
    if (storedValue !== null) {
      notes = JSON.parse(storedValue);
    }
  } catch (error) {
    // Sur le chemin d'erreur, inspectez error dans Scope.
    notes = [];
  } finally {
    // finally s'exécute après try ou catch. Cette normalisation est sans danger :
    // loadNotes() rend toujours un tableau, même si le JSON décrit un objet.
    notes = Array.isArray(notes) ? notes : [];
  }

  return notes;
}

export function saveNotes(notes) {
  // BP-13 — Comparez le tableau notes avec la chaîne produite par JSON.stringify.
  // localStorage n'enregistre que du texte et conserve cette valeur après recharge.
  const serializedNotes = JSON.stringify(notes);
  localStorage.setItem(NOTES_KEY, serializedNotes);
}

export function createNextNoteId(notes) {
  // BP-11 — Inspectez notes, highestNoteId, storedLastId puis nextId.
  // reduce parcourt les notes ; Math.max garde le plus grand identifiant valide.
  const highestNoteId = notes.reduce(
    (highestId, note) => Math.max(highestId, toPositiveSafeInteger(note?.id)),
    0,
  );

  // Le compteur séparé évite de réutiliser l'identifiant d'une note supprimée.
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
  // BP-02 — getItem renvoie une chaîne ou null. Inspectez storedValue, puis count.
  // sessionStorage survit au rafraîchissement mais reste lié à la session de l'onglet.
  const storedValue = sessionStorage.getItem(VISITS_KEY);
  const count = Number(storedValue);

  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export function incrementVisitCount() {
  // BP-04 — Comparez la valeur lue avec nextCount, puis observez setItem().
  // String() rend explicite la conversion exigée par le stockage du navigateur.
  const nextCount = loadVisitCount() + 1;
  sessionStorage.setItem(VISITS_KEY, String(nextCount));
  return nextCount;
}
