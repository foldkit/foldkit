import { Cause, Effect } from 'effect'
import { AsyncResult, Atom } from 'effect/unstable/reactivity'

import { useAtomValue } from '@effect/atom-react'

const runtime = Atom.runtime(Api.Default)

// An async atom evaluates an Effect and exposes an AsyncResult.
const userAtom = runtime.atom(
  Effect.gen(function* () {
    const api = yield* Api
    return yield* api.getUser()
  }),
)

const UserCard = () => {
  const user = useAtomValue(userAtom)

  return AsyncResult.builder(user)
    .onInitial(() => <Spinner />)
    .onFailure(cause => <ErrorBanner message={Cause.pretty(cause)} />)
    .onSuccess(user => <Profile user={user} />)
    .render()
}
