import { Array, Record, pipe } from 'effect'

import { ComingFromReactComposition } from './definition'
import { FAQ_IDS } from './faq'
import type { Model } from './model'

export const init = ComingFromReactComposition.makeInit(() => {
  const disclosures: Model = pipe(
    FAQ_IDS,
    Array.map(id => [id, false] as const),
    Record.fromEntries,
  )

  return { model: disclosures }
})
