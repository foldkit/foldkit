import { describe, expect, test } from 'vitest'

import {
  Deployment,
  deploymentFromCanaryCommit,
  isTelemetryEnabled,
} from './deployment'

describe('deploymentFromCanaryCommit', () => {
  test('uses the production deployment without canary metadata', () => {
    expect(deploymentFromCanaryCommit(undefined)).toEqual({
      _tag: 'Production',
    })
  })

  test('identifies the canary commit', () => {
    expect(deploymentFromCanaryCommit('abc1234')).toEqual({
      _tag: 'Canary',
      commit: 'abc1234',
    })
  })

  test('rejects an empty canary commit', () => {
    expect(() => deploymentFromCanaryCommit('')).toThrow()
  })
})

describe('isTelemetryEnabled', () => {
  test('enables telemetry only in production', () => {
    expect(isTelemetryEnabled(Deployment.Production())).toBe(true)
    expect(isTelemetryEnabled(Deployment.Canary({ commit: 'abc1234' }))).toBe(
      false,
    )
  })
})
