import { Match, Option, Schema } from 'effect'

// CONSTANT

const KANTO_FIRST_ID = 1
const JOHTO_FIRST_ID = 152
const HOENN_FIRST_ID = 252
const HOENN_LAST_ID = 386

export const POKEDEX_SIZE = HOENN_LAST_ID

// REGION

export const Region = Schema.Literals(['All', 'Kanto', 'Johto', 'Hoenn'])
export type Region = typeof Region.Type

type IdRange = readonly [first: number, last: number]

export const regionIdRange = (region: Region): Option.Option<IdRange> =>
  Match.value(region).pipe(
    Match.withReturnType<Option.Option<IdRange>>(),
    Match.when('All', () => Option.none()),
    Match.when('Kanto', () =>
      Option.some([KANTO_FIRST_ID, JOHTO_FIRST_ID - 1]),
    ),
    Match.when('Johto', () =>
      Option.some([JOHTO_FIRST_ID, HOENN_FIRST_ID - 1]),
    ),
    Match.when('Hoenn', () => Option.some([HOENN_FIRST_ID, HOENN_LAST_ID])),
    Match.exhaustive,
  )
