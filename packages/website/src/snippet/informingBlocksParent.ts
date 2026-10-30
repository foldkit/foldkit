import { Effect, Match, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Send } from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

import { People } from './informingBlocksChild'
import { ApplicationRoute, urlToApplicationRoute } from './informingBlocksRoute'

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model: Schema.Struct({ route: ApplicationRoute, people: People }),
    Message: defineMessageUnion({ ChangedUrl: { url: Url } }),
  },
) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const route = urlToApplicationRoute(url)

    const initialPeopleRoute = Match.value(route).pipe(
      Match.tag('People', peopleRoute => peopleRoute),
      Match.orElse(() =>
        ApplicationRoute.People({ searchText: Option.none() }),
      ),
    )

    const people = yield* new People('people', { route: initialPeopleRoute })

    return {
      model: { route, people },

      update: {
        ChangedUrl: (model, { url: nextUrl }) => {
          const nextRoute = urlToApplicationRoute(nextUrl)

          const transition = Transition.make(model.route, nextRoute)
          const peopleMessages = Transition.matchOrElse<ReadonlyArray<Send>>()(
            transition,
            'People',
            {
              Entered: peopleRoute => [
                model.people.send(
                  People.Message.InformedOfRouteChange({ route: peopleRoute }),
                ),
              ],
              Stayed: ({ nextRoute: nextPeopleRoute }) => [
                model.people.send(
                  People.Message.InformedOfRouteChange({
                    route: nextPeopleRoute,
                  }),
                ),
              ],
            },
            () => [],
          )

          return {
            model: modifyFields(model, { route: () => nextRoute }),
            messages: peopleMessages,
          }
        },
      },
    }
  }),
)
