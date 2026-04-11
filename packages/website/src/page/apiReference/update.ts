import { Array, Effect, Match as M, Option, Record, pipe } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import { loadApiData } from './command'
import {
  SIGNATURE_COLLAPSE_THRESHOLD,
  scopedId,
  signaturesLength,
} from './domain'
import { GotDisclosureMessage, type Message } from './message'
import {
  type ApiData,
  ApiDataRemoteData,
  type Disclosures,
  type Model,
} from './model'

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const disclosuresForApiData = (apiData: ApiData): Disclosures =>
  pipe(
    apiData.parsedApi.modules,
    Array.flatMap(module =>
      pipe(
        module.functions,
        Array.filter(
          apiFunction =>
            signaturesLength(apiFunction) > SIGNATURE_COLLAPSE_THRESHOLD,
        ),
        Array.map(apiFunction => {
          const id = scopedId('function', module.name, apiFunction.name)
          return [id, Ui.Disclosure.init({ id })] as const
        }),
      ),
    ),
    Record.fromEntries,
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      StartedLoadApiData: () =>
        M.value(model.apiData).pipe(
          withUpdateReturn,
          M.tag('NotAsked', 'Failure', () => [
            evo(model, { apiData: () => ApiDataRemoteData.Loading() }),
            [loadApiData],
          ]),
          M.orElse(() => [model, []]),
        ),

      SucceededLoadApiData: ({ apiData }) => [
        evo(model, {
          apiData: () => ApiDataRemoteData.Ok({ data: apiData }),
          disclosures: () => disclosuresForApiData(apiData),
        }),
        [],
      ],

      FailedLoadApiData: ({ error }) => [
        evo(model, {
          apiData: () => ApiDataRemoteData.Failure({ error }),
        }),
        [],
      ],

      GotDisclosureMessage: ({ id, message }) =>
        Option.match(Record.get(model.disclosures, id), {
          onNone: () => [model, []],
          onSome: disclosure => {
            const [nextDisclosure, commands] = Ui.Disclosure.update(
              disclosure,
              message,
            )

            return [
              evo(model, {
                disclosures: disclosures =>
                  Record.set(disclosures, id, nextDisclosure),
              }),
              commands.map(
                Command.mapEffect(
                  Effect.map(message => GotDisclosureMessage({ id, message })),
                ),
              ),
            ]
          },
        }),
    }),
  )
