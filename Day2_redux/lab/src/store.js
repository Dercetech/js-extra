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
};

// Le reducer reste pur : il calcule le prochain état sans effet secondaire.
export function reducer(state, action) {
  switch (action.type) {
    case "notes/loaded":
      // Avec spread, on crée un nouvel objet au lieu de modifier l'état précédent.
      return {
        ...state,
        notes: [...action.payload],
      };

    case "note/added":
      return {
        ...state,
        notes: [...state.notes, action.payload],
      };

    case "note/selected":
      return {
        ...state,
        selectedId: action.payload,
      };

    case "visits/incremented":
      return {
        ...state,
        visitCount: state.visitCount + 1,
      };

    default:
      return state;
  }
}
