export const STORAGE_KEYS = Object.freeze({
  notes: "day6_redux_notes",
  nextNoteId: "day6_redux_next_note_id",
});

function parseJson(value, fallback) {
  if (value === null) {
    return fallback;
  }

  return JSON.parse(value);
}

export function createStorage(storage) {
  if (!storage) {
    throw new TypeError("Une implémentation de stockage est requise.");
  }

  function loadSnapshot() {
    const warnings = [];

    function safelyRead(key, fallback) {
      try {
        return parseJson(storage.getItem(key), fallback);
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
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  function saveLocalState(state) {
    return writeEntries([
      [STORAGE_KEYS.notes, state.notes],
      [STORAGE_KEYS.nextNoteId, state.nextNoteId],
    ]);
  }

  return {
    loadSnapshot,
    saveLocalState,
  };
}

export function parseImportedJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new TypeError("Le fichier sélectionné n’est pas un JSON valide.");
  }
}
