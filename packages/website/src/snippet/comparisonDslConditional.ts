import { Match as M, Schema as S } from 'effect'
import { html } from 'foldkit/html'

const Idle = S.TaggedStruct('Idle', {})
const Loading = S.TaggedStruct('Loading', {})
const Failed = S.TaggedStruct('Failed', { error: S.String })
const Loaded = S.TaggedStruct('Loaded', { greeting: S.String })

const Status = S.Union([Idle, Loading, Failed, Loaded])
type Status = typeof Status.Type

const greetingView = (status: Status) => {
  const h = html()

  return h.keyed('div')(
    status._tag,
    [],
    [
      M.value(status).pipe(
        M.tagsExhaustive({
          Idle: () => h.empty,
          Loading: () => h.p([], ['Loading…']),
          Failed: ({ error }) => h.p([], [`Sorry: ${error}`]),
          Loaded: ({ greeting }) => h.p([], [greeting]),
        }),
      ),
    ],
  )
}
