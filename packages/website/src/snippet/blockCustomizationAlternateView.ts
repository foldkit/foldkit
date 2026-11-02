import { SettingsComposition } from './blockDefinition'
import { ApplicationComposition, SettingsBinding } from './blockProfile'

type CompactViewInputs = Readonly<{
  heading: string
}>

const compactSettingsView =
  SettingsComposition.makeView.withInputs<CompactViewInputs>(
    (model, { heading }, h) =>
      h.section([], [h.h2([], [heading]), h.p([], [`Theme: ${model.theme}`])]),
  )

export const compactProfileView = ApplicationComposition.makeView(
  (model, h) => ({
    title: `${model.displayName}'s profile`,
    body: h.block(
      SettingsBinding.embedView({
        slotId: 'compact-settings',
        model: model.settings,
        view: compactSettingsView,
        viewInputs: { heading: `${model.displayName}'s appearance` },
      }),
    ),
  }),
)
