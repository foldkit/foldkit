import { Match as M, Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { ts } from 'foldkit/schema'

const Idle = ts('Idle')
const Loading = ts('Loading')
const Failed = ts('Failed', { error: S.String })
const Loaded = ts('Loaded', { greeting: S.String })

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
