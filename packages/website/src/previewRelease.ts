import { Schema } from 'effect'

export const PreviewRelease = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  channel: Schema.Literal('canary'),
  sourceCommit: Schema.NonEmptyString,
  uploadTag: Schema.NonEmptyString,
  packages: Schema.Record(Schema.String, Schema.NonEmptyString),
})
export type PreviewRelease = typeof PreviewRelease.Type

export const decodePreviewRelease = (encoded: string): PreviewRelease =>
  Schema.decodeUnknownSync(PreviewRelease)(JSON.parse(encoded))

export const scaffoldCommand = (release: PreviewRelease): string => {
  const version = release.packages['create-foldkit-app']

  if (version === undefined) {
    throw new Error('Preview release has no create-foldkit-app package')
  }

  return `npx create-foldkit-app@${version}`
}
