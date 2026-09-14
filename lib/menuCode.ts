/**
 * The code for a new breakfast menu, chosen for the kitchen rather than typed
 * by it. Codes are what the kitchen sheet prints ("2× A") and what every
 * booking points at, so they must be short, stable and unique; nobody should
 * have to invent one.
 *
 * Single letters first, in order, skipping any in use — so a kitchen with A,
 * B and D gets C. After Z, a second letter: AA, AB, …
 */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function nextMenuCode(existing: readonly string[]): string {
  const taken = new Set(existing.map(c => c.trim().toUpperCase()))
  for (const letter of LETTERS) if (!taken.has(letter)) return letter
  for (const first of LETTERS) {
    for (const second of LETTERS) {
      const code = first + second
      if (!taken.has(code)) return code
    }
  }
  return `M${existing.length + 1}`
}
