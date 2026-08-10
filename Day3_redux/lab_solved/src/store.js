export function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = [];

  return {
    getState() {
      return state;
    },
    dispatch(action) {
      // Toutes les modifications passent par dispatch : le flux reste centralisé et prévisible.
      state = reducer(state, action);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.push(listener);

      // La fonction retournée permet d'arrêter l'abonnement.
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
  };
}

export const initialState = {
  notes: [],
  selectedId: null,
  visitCount: 0,
  filter: "all",
  search: ""
};

export function reducer(state, action) {
  // Un reducer reste pur : il calcule le prochain état sans effet secondaire.
  switch (action.type) {
    case "notes/loaded": {
      const selectedNote =
        state.selectedId === null
          ? null
          : action.payload.find(note => String(note.id) === String(state.selectedId));

      // Le spread crée un nouvel objet : l'ancien état n'est jamais modifié.
      return {
        ...state,
        notes: [...action.payload],
        selectedId: selectedNote?.id ?? null
      };
    }

    case "note/added":
      return {
        ...state,
        notes: [...state.notes, action.payload],
        selectedId: action.payload.id
      };

    case "note/selected":
      return {
        ...state,
        selectedId: action.payload
      };

    case "visits/incremented":
      return {
        ...state,
        visitCount: state.visitCount + 1
      };

    case "note/deleted":
      return {
        ...state,
        notes: state.notes.filter(note => note.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId
      };

    case "note/updated":
      return {
        ...state,
        notes: state.notes.map(note =>
          note.id === action.payload.id
            ? {
                ...note,
                title: action.payload.title,
                content: action.payload.content,
                updatedAt: action.payload.updatedAt
              }
            : note
        )
      };

    case "note/toggledPin":
      return {
        ...state,
        notes: state.notes.map(note =>
          note.id === action.payload.id
            ? {
                ...note,
                pinned: !note.pinned,
                updatedAt: action.payload.updatedAt
              }
            : note
        )
      };

    case "filter/set":
      return {
        ...state,
        filter: action.payload
      };

    case "search/set":
      return {
        ...state,
        search: action.payload
      };

    case "notes/imported": {
      const knownIds = new Set(state.notes.map(note => String(note.id)));
      const importedNotes = action.payload.filter(note => {
        const id = String(note.id);
        if (knownIds.has(id)) return false;
        knownIds.add(id);
        return true;
      });

      return {
        ...state,
        notes: [...state.notes, ...importedNotes]
      };
    }

    case "notes/cleared":
      return {
        ...state,
        notes: [],
        selectedId: null
      };

    default:
      return state;
  }
}
