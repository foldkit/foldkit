import { defineMessageUnion } from 'foldkit/message'

import { SlowWarningReport } from './model'

export const Message = defineMessageUnion({
  ClickedRunUpdateWork: {},
  ClickedRunViewWork: {},
  ClickedRunPatchWork: {},
  ClickedRunSubscriptionDependenciesWork: {},
  ClickedClearWarnings: {},
  RecordedSlowWarning: { report: SlowWarningReport },
})
export type Message = typeof Message.Type
