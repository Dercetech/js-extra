function requiredElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Élément DOM introuvable : ${selector}`);
  }
  return element;
}

function formatDate(value) {
  if (!value) {
    return "jamais";
  }

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

export function createView(handlers) {
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

  elements.variantBadge.textContent = "Solution · modules ES";
  elements.architectureSummary.textContent =
    "app → store/reducer · logique pure · stockage · vue · instrumentation";

  elements.notesList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-note-id]");
    if (button) {
      handlers.onSelect(Number(button.dataset.noteId));
    }
  });

  elements.search.addEventListener("input", () => {
    handlers.onSearch(elements.search.value);
  });

  elements.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.search.value) {
      event.preventDefault();
      elements.search.value = "";
      handlers.onSearch("");
    }
  });

  elements.filter.addEventListener("change", () => {
    handlers.onFilter(elements.filter.value);
  });

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
    if (window.confirm("Supprimer définitivement cette note ?")) {
      handlers.onDelete();
    }
  });
  elements.exportNotes.addEventListener("click", handlers.onExport);
  elements.importNotes.addEventListener("change", () => {
    const [file] = elements.importNotes.files;
    if (file) {
      handlers.onImport(file);
    }
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
    const {
      state,
      previousState,
      selectedNote,
      statusMessage,
      visibleNotes,
    } = viewModel;

    elements.status.textContent = statusMessage;
    elements.notesCount.textContent =
      visibleNotes.length === state.notes.length
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
    const payload = JSON.stringify(
      { exportedAt: new Date().toISOString(), notes },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "notes-jour-6.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return { downloadJson, render, renderLog };
}
