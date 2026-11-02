// Before: Composition-authored update with Definition-owned Steps.
import { modifyFields } from 'foldkit/struct'

import {
  OutMessage,
  SaveTheme,
  SettingsComposition,
  type Theme,
  makeNoopStep,
  makeStep,
} from './definition'

const changeThemeStep = makeStep((model, theme: Theme) => ({
  model: modifyFields(model, { theme: () => theme }),
  commands: [SaveTheme({ theme })],
  outMessage: OutMessage.ChangedTheme({ theme }),
}))

export const update = SettingsComposition.makeUpdate({
  ClickedTheme: (model, { theme }) => changeThemeStep(model, theme),
  RequestedReset: model => changeThemeStep(model, 'System'),
  CompletedSaveTheme: makeNoopStep(),
  FailedSaveTheme: makeNoopStep(),
})
