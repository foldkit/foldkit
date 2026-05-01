// @ts-nocheck
import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

export const makeRemoteData = <EA, EI, DA, DI>(
  error: S.Codec<EA, EI>,
  data: S.Codec<DA, DI>,
) => {
  const Idle = ts('Idle')
  const Loading = ts('Loading')
  const Error = ts('Error', { error })
  const Ok = ts('Ok', { data })

  return {
    Idle,
    Loading,
    Error,
    Ok,
    Union: S.Union([Idle, Loading, Error, Ok]),
  }
}
