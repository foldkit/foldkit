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
  InitArgs: Schema.Tuple([]),
  effects: { services: [PeopleDirectory] },
  Model,
  Message,
})

const {
  makeFieldsStep,
  makeNoopStep,
  makeRequiredFieldBinding,
  makeComposition,
} = ApplicationBlock

export const PeopleBinding = makeRequiredFieldBinding(People.PeopleBlock, {
  field: 'people',
  init: false,
})

export const ApplicationComposition = makeComposition({
  bindings: [PeopleBinding],
})

const setRoute = (nextRoute: ApplicationRoute) =>
  makeFieldsStep(() => ({ route: () => nextRoute }))

const keepModel = makeNoopStep()

type InformPeopleOfRouteChange =
  | typeof keepModel
  | ReturnType<typeof PeopleBinding.informOfRouteChange>

export const update = ApplicationComposition.makeUpdate({
  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)

    const transition = Transition.make(model.route, nextRoute)
    const informPeopleOfRouteChange =
      Transition.matchOrElse<InformPeopleOfRouteChange>()(
        transition,
        'People',
        {
          Entered: peopleRoute =>
            PeopleBinding.informOfRouteChange({ route: peopleRoute }),
          Stayed: ({ nextRoute }) =>
            PeopleBinding.informOfRouteChange({ route: nextRoute }),
        },
        () => keepModel,
      )

    return Update.combineSteps(model, [
      setRoute(nextRoute),
      informPeopleOfRouteChange,
    ])
  },
})
