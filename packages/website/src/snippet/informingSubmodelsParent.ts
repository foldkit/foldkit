import { Option } from 'effect'
import { Update } from 'foldkit'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

import { People } from './page'

type Step = Update.Step<Model, Message>

const foldPeople = Update.foldChild({
  update: People.update,
  read: (model: Model) => Option.some(model.peoplePage),
  write: (model, nextPeoplePage) =>
    modifyFields(model, { peoplePage: () => nextPeoplePage }),
  toParentMessage: message => Message.GotPeopleMessage({ message }),
})

const foldPeopleRouteChanged = Update.foldChild({
  update: People.informRouteChanged,
  read: (model: Model) => Option.some(model.peoplePage),
  write: (model, nextPeoplePage) =>
    modifyFields(model, { peoplePage: () => nextPeoplePage }),
  toParentMessage: message => Message.GotPeopleMessage({ message }),
})

const setRoute =
  (nextRoute: AppRoute): Step =>
  model => ({ model: modifyFields(model, { route: () => nextRoute }) })

const keepModel: Step = model => ({ model })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedUrl: ({ url }) => {
      const nextRoute = urlToAppRoute(url)

      const transition = Transition.make(model.route, nextRoute)
      const informPeopleRoute = Transition.matchOrElse<Step>()(
        transition,
        'People',
        {
          Entered: peopleRoute => foldPeopleRouteChanged(peopleRoute),
          Stayed: ({ nextRoute }) => foldPeopleRouteChanged(nextRoute),
        },
        () => keepModel,
      )

      return Update.combine(model, [setRoute(nextRoute), informPeopleRoute])
    },

    GotPeopleMessage: ({ message }) => foldPeople(model, message),
  })
