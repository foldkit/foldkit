import { Array, Record, pipe } from 'effect'
import { type Update } from 'foldkit'

import { FAQ_IDS } from './faq'
import type { Message } from './message'
import type { Model } from './model'

export type InitReturn = Update.Return<Model, Message>

export const init = (): InitReturn => {
  const disclosures: Model = pipe(
    FAQ_IDS,
    Array.map(id => [id, false] as const),
    Record.fromEntries,
  )

  return { model: disclosures }
}
