// core/testPanelState.ts
type Listener = (active: boolean) => void;

let testPanelActive = false;
const listeners = new Set<Listener>();

export function isTestPanelActive() {
  console.log("[testPanelState] isTestPanelActive() ->", testPanelActive);
  return testPanelActive;
}

export function setTestPanelActive(value: boolean) {
  console.log("[testPanelState] setTestPanelActive ->", value);
  testPanelActive = value;
  // notify all subscribers (e.g. NavBar)
  listeners.forEach((fn) => fn(testPanelActive));
}

export function subscribeTestPanelActive(listener: Listener) {
  listeners.add(listener);
  // immediately sync the current value
  listener(testPanelActive);
  return () => {
    listeners.delete(listener);
  };
}
