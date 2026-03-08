import { Effect, Match as M, Option, Record } from 'effect'
import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'

import { GotDisclosureMessage, type Message } from './message'
import type { Model } from './model'

export type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotDisclosureMessage: ({ id, message }) =>
        Option.match(Record.get(model, id), {
          onNone: () => [model, []],
          onSome: disclosure => {
            const [nextDisclosure, commands] = Ui.Disclosure.update(disclosure, message)

            return [
              Record.set(model, id, nextDisclosure),
              commands.map(Effect.map(message => GotDisclosureMessage({ id, message }))),
            ]
          },
        }),
    }),
  )
