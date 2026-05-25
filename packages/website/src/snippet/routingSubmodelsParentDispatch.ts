import { Array, Effect, Match as M } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { People } from './page'

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedUrl: ({ url }) => {
        const route = urlToAppRoute(url)
        const modelWithRoute = evo(model, { route: () => route })

        return M.value(route).pipe(
          M.tag('People', peopleRoute =>
            liftPeopleResult(
              modelWithRoute,
              People.update(
                modelWithRoute.peoplePage,
                People.ChangedRoute({ route: peopleRoute }),
              ),
            ),
          ),
          M.orElse(() => [modelWithRoute, []]),
        )
      },

      GotPeopleMessage: ({ message }) =>
        liftPeopleResult(model, People.update(model.peoplePage, message)),
    }),
  )

const liftPeopleResult = (
  model: Model,
  result: readonly [
    People.Model,
    ReadonlyArray<Command.Command<People.Message>>,
  ],
): UpdateReturn => {
  const [nextPeoplePage, peopleCommands] = result
  return [
    evo(model, { peoplePage: () => nextPeoplePage }),
    Array.map(
      peopleCommands,
      Command.mapEffect(Effect.map(message => GotPeopleMessage({ message }))),
    ),
  ]
}
