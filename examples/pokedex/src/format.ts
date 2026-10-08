import { Array, String, pipe } from 'effect'

export const displayName = (name: string): string =>
  pipe(name, String.split('-'), Array.map(String.capitalize), Array.join(' '))
