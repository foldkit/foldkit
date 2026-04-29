import { Data, Match } from 'effect'

type Status = Data.TaggedEnum<{
  Idle: {}
  Loading: {}
  Failed: { error: string }
  Loaded: { greeting: string }
}>

const Status = Data.taggedEnum<Status>()

function Greeting({ status }: { status: Status }) {
  return (
    <div>
      {Match.value(status).pipe(
        Match.tagsExhaustive({
          Idle: () => null,
          Loading: () => <p>Loading…</p>,
          Failed: ({ error }) => <p>Sorry: {error}</p>,
          Loaded: ({ greeting }) => <p>{greeting}</p>,
        }),
      )}
    </div>
  )
}
