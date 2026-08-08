const jsdomWindow = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom?.window

const jsdomLocalStorage = jsdomWindow?.localStorage
if (jsdomLocalStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomLocalStorage,
    configurable: true,
    writable: true,
  })
}

const jsdomSessionStorage = jsdomWindow?.sessionStorage
if (jsdomSessionStorage) {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: jsdomSessionStorage,
    configurable: true,
    writable: true,
  })
}
