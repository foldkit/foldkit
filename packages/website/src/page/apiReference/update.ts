import { Array, Match as M, Option, Record, pipe } from 'effect'
import { AsyncData, Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Disclosure } from '@foldkit/ui'

import { LoadApiData } from './command'
import {
  SIGNATURE_COLLAPSE_THRESHOLD,
  scopedId,
  signaturesLength,
} from './domain'
import { GotDisclosureMessage, type Message, RequestedApiData } from './message'
import {
  type ApiData,
  ApiDataAsyncData,
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
          return [id, Disclosure.init({ id })] as const
        }),
      ),
    ),
    Record.fromEntries,
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      RequestedApiData: () =>
        Option.match(AsyncData.loadIfMissing(model.apiData), {
          onNone: () => [model, []],
          onSome: apiData => [
            evo(model, { apiData: () => apiData }),
            [LoadApiData()],
          ],
        }),

      SucceededLoadApiData: ({ apiData }) => [
        evo(model, {
          apiData: () => ApiDataAsyncData.Success({ data: apiData }),
          disclosures: () => disclosuresForApiData(apiData),
        }),
        [],
      ],

      FailedLoadApiData: ({ error }) => [
        evo(model, {
          apiData: () => ApiDataAsyncData.Failure({ error }),
        }),
        [],
      ],

      GotDisclosureMessage: ({ id, message }) =>
        Option.match(Record.get(model.disclosures, id), {
          onNone: () => [model, []],
          onSome: disclosure => {
            const [nextDisclosure, commands] = Disclosure.update(
              disclosure,
              message,
            )

            return [
              evo(model, {
                disclosures: disclosures =>
                  Record.set(disclosures, id, nextDisclosure),
              }),
              Command.mapMessages(commands, message =>
                GotDisclosureMessage({ id, message }),
              ),
            ]
          },
        }),
    }),
  )

export const informRouteChanged = (model: Model) =>
  update(model, RequestedApiData())
