const VALID_FILTERS = new Set(["all", "pinned", "unpinned"]);

function cleanText(value, maximumLength) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function validTimestamp(value, fallback) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return fallback;
  }

  return new Date(value).toISOString();
}

export function normalizeNoteCollection(value, options = {}) {
  const { now = new Date().toISOString(), reassignIds = false } = options;

  if (!Array.isArray(value)) {
    return [];
  }

  const usedIds = new Set();
  let generatedId = 1;

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return [];
    }

    const title = cleanText(candidate.title, 120);
    const content = cleanText(candidate.content, 10_000);

    if (!title || !content) {
      return [];
    }

    let id = Number(candidate.id);
    if (reassignIds || !Number.isSafeInteger(id) || id < 1 || usedIds.has(id)) {
      while (usedIds.has(generatedId)) {
        generatedId += 1;
      }
      id = generatedId;
    }

    usedIds.add(id);
    generatedId = Math.max(generatedId, id + 1);

    const createdAt = validTimestamp(candidate.createdAt, now);

    return [
      {
        id,
        title,
        content,
        pinned: Boolean(candidate.pinned),
        createdAt,
        updatedAt: validTimestamp(candidate.updatedAt, createdAt),
      },
    ];
  });
}

export function createSeedNotes(now = new Date().toISOString()) {
  return normalizeNoteCollection(
    [
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
    ],
    { now },
  );
}

export function prepareImportedNotes(value, now = new Date().toISOString()) {
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

export function selectVisibleNotes(state) {
  const query = state.query.trim().toLocaleLowerCase("fr");

  return state.notes.filter((note) => {
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "pinned" && note.pinned) ||
      (state.filter === "unpinned" && !note.pinned);

    if (!matchesFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    return `${note.title} ${note.content}`.toLocaleLowerCase("fr").includes(query);
  });
}

export function selectSelectedNote(state) {
  return state.notes.find((note) => note.id === state.selectedId) ?? null;
}

export function sanitizeFilter(value) {
  return VALID_FILTERS.has(value) ? value : "all";
}

export function nextIdFor(notes) {
  return notes.reduce((highest, note) => Math.max(highest, note.id), 0) + 1;
}
