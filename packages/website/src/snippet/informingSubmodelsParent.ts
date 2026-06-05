import { Match as M } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { People } from './page'

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const modelWithNextRoute = evo(model, { route: () => nextRoute })

        return M.value(nextRoute).pipe(
          M.tag('People', peopleRoute => {
            const [nextPeoplePage, peopleCommands] = People.informRouteChanged(
              modelWithNextRoute.peoplePage,
              peopleRoute,
            )
            return [
              evo(modelWithNextRoute, { peoplePage: () => nextPeoplePage }),
              Command.mapMessages(peopleCommands, childMessage =>
                GotPeopleMessage({ message: childMessage }),
              ),
            ]
          }),
          M.orElse(() => [modelWithNextRoute, []]),
        )
      },

      GotPeopleMessage: ({ message }) => {
        const [nextPeoplePage, peopleCommands] = People.update(
          model.peoplePage,
          message,
        )
        return [
          evo(model, { peoplePage: () => nextPeoplePage }),
          Command.mapMessages(peopleCommands, childMessage =>
            GotPeopleMessage({ message: childMessage }),
          ),
        ]
      },
    }),
  )
