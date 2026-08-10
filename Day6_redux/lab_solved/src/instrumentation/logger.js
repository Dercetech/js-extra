export function createActivityLog(onChange, maximumEntries = 18) {
  if (typeof onChange !== "function") {
    throw new TypeError("Le journal attend une fonction de rendu.");
  }

  let entries = [];

  function publish() {
    onChange([...entries]);
  }

  function add(kind, message) {
    entries = [
      ...entries,
      {
        id: `${Date.now()}-${Math.random()}`,
        kind,
        message,
        time: new Date().toLocaleTimeString("fr-BE"),
      },
    ].slice(-maximumEntries);
    publish();
  }

  function clear() {
    entries = [];
    publish();
  }

  function getEntries() {
    return [...entries];
  }

  return { add, clear, getEntries };
}

// Fonction d’ordre supérieur : elle reçoit une fonction d’écriture,
// retourne une fonction qui reçoit dispatch, puis retourne le dispatch instrumenté.
export function createDispatchWrapper(writeEntry) {
  if (typeof writeEntry !== "function") {
    throw new TypeError("Le wrapper attend une fonction d’écriture.");
  }

  return function wrapDispatch(dispatch) {
    if (typeof dispatch !== "function") {
      throw new TypeError("Le wrapper attend une fonction dispatch.");
    }

    return function dispatchWithLog(action) {
      writeEntry(action);
      return dispatch(action);
    };
  };
}
