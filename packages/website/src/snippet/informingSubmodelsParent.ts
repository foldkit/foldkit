import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { People } from './page'

const foldPeople = Update.foldChild({
  update: People.update,
  read: (model: Model) => Option.some(model.peoplePage),
  write: (model, nextPeoplePage) =>
    evo(model, { peoplePage: () => nextPeoplePage }),
  toParentMessage: message => Message.GotPeopleMessage({ message }),
})

const foldPeopleRouteChanged = Update.foldChild({
  update: People.informRouteChanged,
  read: (model: Model) => Option.some(model.peoplePage),
  write: (model, nextPeoplePage) =>
    evo(model, { peoplePage: () => nextPeoplePage }),
  toParentMessage: message => Message.GotPeopleMessage({ message }),
})

const setRoute =
  (nextRoute: AppRoute): Update.Step<Model, Message> =>
  model => ({ model: evo(model, { route: () => nextRoute }) })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedUrl: ({ url }) => {
      const nextRoute = urlToAppRoute(url)

      const routeSteps = Match.value(nextRoute).pipe(
        Match.withReturnType<ReadonlyArray<Update.Step<Model, Message>>>(),
        Match.tag('People', peopleRoute => [
          foldPeopleRouteChanged(peopleRoute),
        ]),
        Match.orElse(() => []),
      )

      return Update.combine(model, [setRoute(nextRoute), ...routeSteps])
    },

    GotPeopleMessage: ({ message }) => foldPeople(model, message),
  })
