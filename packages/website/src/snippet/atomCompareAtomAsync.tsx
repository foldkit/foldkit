import { Cause, Effect } from 'effect'

import { Atom, Result, useAtomValue } from '@effect-atom/atom-react'

const runtime = Atom.runtime(Api.Default)

// An async atom evaluates an Effect and exposes a Result.
const userAtom = runtime.atom(
  Effect.gen(function* () {
    const api = yield* Api
    return yield* api.getUser()
  }),
)

const UserCard = () => {
  const user = useAtomValue(userAtom)

  return Result.builder(user)
    .onInitial(() => <Spinner />)
    .onFailure(cause => <ErrorBanner message={Cause.pretty(cause)} />)
    .onSuccess(user => <Profile user={user} />)
    .render()
}
