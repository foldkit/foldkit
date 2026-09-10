const Date = {
  now: () => 0,
}
const Math = {
  random: () => 0,
}
const performance = {
  now: () => 0,
}
const crypto = {
  randomUUID: () => 'fixed',
  getRandomValues: (value: Uint8Array) => value,
}
const globalThis = { Date, Math, performance, crypto }
const window = { crypto }

export const localTime = Date.now()
export const localRandom = Math.random()
export const localPerformance = performance.now()
export const localId = crypto.randomUUID()
export const localBytes = crypto.getRandomValues(new Uint8Array(8))
export const nestedTime = globalThis.Date.now()
export const nestedId = window.crypto.randomUUID()
