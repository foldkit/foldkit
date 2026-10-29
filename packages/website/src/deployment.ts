import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { PreviewRelease, decodePreviewRelease } from './previewRelease'

export const Deployment = defineTaggedUnion({
  Production: {},
  Canary: { commit: Schema.NonEmptyString },
  Preview: { release: PreviewRelease },
})
export type Deployment = typeof Deployment.Type

export const deploymentFromCanaryCommit = (
  canaryCommit: string | undefined,
): Deployment => {
  if (canaryCommit === undefined) {
    return Deployment.Production()
  } else {
    return Deployment.Canary({
      commit: Schema.decodeSync(Schema.NonEmptyString)(canaryCommit),
    })
  }
}

export const deploymentFromEnvironment = (
  canaryCommit: string | undefined,
  previewRelease: string | undefined,
): Deployment => {
  if (canaryCommit !== undefined && previewRelease !== undefined) {
    throw new Error('A website build cannot be both canary and preview')
  }
  if (previewRelease !== undefined) {
    return Deployment.Preview({
      release: decodePreviewRelease(previewRelease),
    })
  }

  return deploymentFromCanaryCommit(canaryCommit)
}

export const isTelemetryEnabled = (deployment: Deployment): boolean =>
  Deployment.match(deployment, {
    Production: () => true,
    Canary: () => false,
    Preview: () => false,
  })

export const deployment = deploymentFromEnvironment(
  import.meta.env.VITE_FOLDKIT_CANARY_COMMIT,
  import.meta.env.VITE_FOLDKIT_PREVIEW_RELEASE,
)
