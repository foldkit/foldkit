import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Transition } from 'foldkit/route'
import { Url } from 'foldkit/url'

import * as People from './informingBlocksIndex'
import { ApplicationRoute, urlToApplicationRoute } from './informingBlocksRoute'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  people: People.PeopleBlock.Model,
})

export const Message = defineMessageUnion({
  ChangedUrl: { url: Url },
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = ApplicationDefinition

export const PeopleBinding = ApplicationDefinition.makeBinding(
  People.PeopleBlock,
  {
    field: 'people',
    init: false,
  },
)

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [PeopleBinding],
})

const setRouteStep = (nextRoute: typeof ApplicationRoute.Type) =>
  makeFieldsStep(() => ({ route: () => nextRoute }))

const keepModelStep = makeNoopStep()

type InformPeopleRouteStep =
  | typeof keepModelStep
  | ReturnType<typeof PeopleBinding.informRouteChanged>

export const update = ApplicationComposition.makeUpdate({
  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)

    const transition = Transition.make(model.route, nextRoute)
    const informPeopleRouteStep =
      Transition.matchOrElse<InformPeopleRouteStep>()(
        transition,
        'People',
        {
          Entered: peopleRoute =>
            PeopleBinding.informRouteChanged({ route: peopleRoute }),
          Stayed: ({ nextRoute }) =>
            PeopleBinding.informRouteChanged({ route: nextRoute }),
        },
        () => keepModelStep,
      )

    return Update.combineSteps(model, [
      setRouteStep(nextRoute),
      informPeopleRouteStep,
    ])
  },
})
