export function createStore(reducer, initialState) {
  if (typeof reducer !== "function") {
    throw new TypeError("Le reducer du store doit être une fonction.");
  }

  let currentState = initialState;
  let previousState = null;
  const listeners = new Set();

  function getState() {
    return currentState;
  }

  function getPreviousState() {
    return previousState;
  }

  function dispatch(action) {
    if (!action || typeof action.type !== "string") {
      throw new TypeError("Une action doit posséder une propriété type.");
    }

    previousState = currentState;
    currentState = reducer(currentState, action);

    for (const listener of listeners) {
      listener({
        state: currentState,
        previousState,
        action,
      });
    }

    return action;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Un abonné du store doit être une fonction.");
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    dispatch,
    getPreviousState,
    getState,
    subscribe,
  };
}
