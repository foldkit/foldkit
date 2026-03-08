import { Array, Record, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'

import {
  type ApiModule,
  SIGNATURE_COLLAPSE_THRESHOLD,
  scopedId,
  signaturesLength,
} from './domain'
import type { Message } from './message'
import type { Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Command<Message>>]

export const init = (modules: ReadonlyArray<ApiModule>): InitReturn => {
  const disclosures: Model = pipe(
    modules,
    Array.flatMap(module =>
      pipe(
        module.functions,
        Array.filter(
          apiFunction => signaturesLength(apiFunction) > SIGNATURE_COLLAPSE_THRESHOLD,
        ),
        Array.map(apiFunction => {
          const id = scopedId('function', module.name, apiFunction.name)
          return [id, Ui.Disclosure.init({ id })] as const
        }),
      ),
    ),
    Record.fromEntries,
  )

  return [disclosures, []]
}
