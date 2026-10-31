import { Equal, Option, Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Transition, defineRouteUnion } from 'foldkit/route'

const ApplicationRoute = defineRouteUnion({
  Home: {},
  People: { searchText: Schema.Option(Schema.String) },
  NotFound: { path: Schema.String },
})
type ApplicationRoute = typeof ApplicationRoute.Type
type PeopleRoute = typeof ApplicationRoute.People.Type

const Message = defineMessageUnion({
  SucceededFetchPeople: { names: Schema.Array(Schema.String) },
  FailedFetchPeople: {},
})

const FetchPeople = Command.define('FetchPeople', {
  args: { searchText: Schema.String },
  messages: [Message.SucceededFetchPeople, Message.FailedFetchPeople],
})

type PeopleCommands = ReadonlyArray<ReturnType<typeof FetchPeople>>

const loadPeople = (route: PeopleRoute): PeopleCommands => [
  FetchPeople({ searchText: Option.getOrElse(route.searchText, () => '') }),
]

const commandsForPeopleRoute = (
  transition: Transition.Transition<ApplicationRoute>,
): PeopleCommands =>
  Transition.matchOrElse<PeopleCommands>()(
    transition,
    'People',
    {
      Entered: loadPeople,
      Stayed: ({ previousRoute, nextRoute }) =>
        Equal.equals(previousRoute.searchText, nextRoute.searchText)
          ? []
          : loadPeople(nextRoute),
    },
    () => [],
  )
