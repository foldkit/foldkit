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

const setRoute = (nextRoute: typeof ApplicationRoute.Type) =>
  ApplicationDefinition.makeFieldsStep(() => ({ route: () => nextRoute }))

const keepModel = ApplicationDefinition.makeNoopStep()

type InformPeopleRouteStep =
  | typeof keepModel
  | ReturnType<typeof PeopleBinding.informRouteChanged>

export const update = ApplicationComposition.makeUpdate({
  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)

    const transition = Transition.make(model.route, nextRoute)
    const informPeopleRoute = Transition.matchOrElse<InformPeopleRouteStep>()(
      transition,
      'People',
      {
        Entered: peopleRoute =>
          PeopleBinding.informRouteChanged({ route: peopleRoute }),
        Stayed: ({ nextRoute }) =>
          PeopleBinding.informRouteChanged({ route: nextRoute }),
      },
      () => keepModel,
    )

    return Update.combineSteps(model, [setRoute(nextRoute), informPeopleRoute])
  },
})
