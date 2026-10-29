import { Schema } from 'effect'

export const FixtureConfig = Schema.Struct({
  scrollMode: Schema.Literals(['Self', 'Ancestor', 'Window']),
  layout: Schema.Literals(['Spacers', 'Absolute', 'Table']),
  isDynamic: Schema.Boolean,
  isShort: Schema.Boolean,
})
export type FixtureConfig = typeof FixtureConfig.Type

export const SHORT_ROW_COUNT = 3
export const ROW_COUNT = 300
export const ROW_HEIGHT_PX = 40
