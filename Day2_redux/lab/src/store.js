export function createStore(reducer, initialState) {
  // state et listeners restent accessibles aux méthodes ci-dessous : createStore
  // crée une closure qui protège ces deux variables internes.
  let state = initialState;
  const listeners = [];

  return {
    getState() {
      return state;
    },
    dispatch(action) {
      // BP-05 — Inspectez action et state, puis entrez dans reducer().
      // Toutes les modifications passent ici : le flux reste centralisé et prévisible.
      state = reducer(state, action);

      // Le prochain état est installé avant de prévenir les abonnés.
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      // listeners n'appartient pas à l'état applicatif : cette liste interne peut
      // donc être modifiée sans enfreindre l'immutabilité imposée au reducer.
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
// Il ne lit ni le DOM, ni l'heure, ni localStorage ou sessionStorage.
export function reducer(state, action) {
  // BP-06 — Inspectez l'ancien state et action.type avant de choisir une branche.
  // Avec les mêmes arguments, un reducer pur doit toujours produire le même résultat.
  switch (action.type) {
    case "notes/loaded":
      // ...state crée un nouvel objet ; ...action.payload crée un nouveau tableau.
      // L'ancien état reste ainsi disponible dans l'inspecteur.
      return {
        ...state,
        notes: [...action.payload],
      };

    case "note/added":
      // BP-12 — Inspectez state.notes avant ce return. Après le dispatch, comparez
      // state.notes à previousState.notes : les deux références doivent différer.
      return {
        ...state,
        // On ajoute à une copie au lieu d'utiliser push() sur le tableau précédent.
        notes: [...state.notes, action.payload],
      };

    case "note/selected":
      return {
        ...state,
        // Seule cette propriété change ; le tableau notes peut être réutilisé.
        selectedId: action.payload,
      };

    case "visits/incremented":
      return {
        ...state,
        visitCount: state.visitCount + 1,
      };

    default:
      // Une action inconnue ne change rien : on rend exactement la même référence.
      return state;
  }
}
