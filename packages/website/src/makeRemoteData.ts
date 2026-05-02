import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

export const makeRemoteData = <EA, EI, DA, DI>(
  error: S.Codec<EA, EI>,
  data: S.Codec<DA, DI>,
) => {
  const NotAsked = ts('NotAsked')
  const Loading = ts('Loading')
  const Failure = ts('Failure', { error })
  const Ok = ts('Ok', { data })

  return {
    NotAsked,
    Loading,
    Failure,
    Ok,
    Union: S.Union([NotAsked, Loading, Failure, Ok]),
  }
}
