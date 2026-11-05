import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Transition } from 'foldkit/route'
import { Url } from 'foldkit/url'

import * as People from './informingBlocksIndex'
import { ApplicationRoute, urlToApplicationRoute } from './informingBlocksRoute'
import { PeopleDirectory } from './informingBlocksService'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  people: People.PeopleBlock.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedUrl: { url: Url },
})
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  effects: { services: [PeopleDirectory] },
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep, makeBinding, makeComposition } =
  ApplicationBlock

export const PeopleBinding = makeBinding(People.PeopleBlock, {
  field: 'people',
  init: false,
})

export const ApplicationComposition = makeComposition({
  bindings: [PeopleBinding],
})

const setRoute = (nextRoute: ApplicationRoute) =>
  makeFieldsStep(() => ({ route: () => nextRoute }))

const keepModel = makeNoopStep()

type InformPeopleRouteStep =
  | typeof keepModel
  | ReturnType<typeof PeopleBinding.informRouteChange>

export const update = ApplicationComposition.makeUpdate({
  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)

    const transition = Transition.make(model.route, nextRoute)
    const informPeopleRoute = Transition.matchOrElse<InformPeopleRouteStep>()(
      transition,
      'People',
      {
        Entered: peopleRoute =>
          PeopleBinding.informRouteChange({ route: peopleRoute }),
        Stayed: ({ nextRoute }) =>
          PeopleBinding.informRouteChange({ route: nextRoute }),
      },
      () => keepModel,
    )

    return Update.combineSteps(model, [setRoute(nextRoute), informPeopleRoute])
  },
})
