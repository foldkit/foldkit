import { Match as M, Schema as S } from 'effect'
import { html } from 'foldkit/html'

const Idle = S.TaggedStruct('Idle', {})
const Loading = S.TaggedStruct('Loading', {})
const Failed = S.TaggedStruct('Failed', { error: S.String })
const Loaded = S.TaggedStruct('Loaded', { greeting: S.String })

const Status = S.Union(Idle, Loading, Failed, Loaded)
type Status = typeof Status.Type

const { div, p, empty } = html()

const greetingView = (status: Status) =>
  div(
    [],
    [
      M.value(status).pipe(
        M.tagsExhaustive({
          Idle: () => empty,
          Loading: () => p([], ['Loading…']),
          Failed: ({ error }) => p([], [`Sorry: ${error}`]),
          Loaded: ({ greeting }) => p([], [greeting]),
        }),
      ),
    ],
  )
