import { Effect, Match as M, Option, Record } from 'effect'
import { Command, Ui } from 'foldkit'

import { GotFaqDisclosureMessage, type Message } from './message'
import type { Model } from './model'

export type UpdateReturn = [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotFaqDisclosureMessage: ({ id, message }) =>
        Option.match(Record.get(model, id), {
          onNone: () => [model, []],
          onSome: disclosure => {
            const [nextDisclosure, commands] = Ui.Disclosure.update(
              disclosure,
              message,
            )

            return [
              Record.set(model, id, nextDisclosure),
              commands.map(
                Command.mapEffect(
                  Effect.map(message =>
                    GotFaqDisclosureMessage({ id, message }),
                  ),
                ),
              ),
            ]
          },
        }),
    }),
  )
