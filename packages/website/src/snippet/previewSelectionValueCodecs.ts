const Action = Schema.Literals(['Edit', 'Archive'])
type Action = typeof Action.Type
const Section = Schema.Literals(['Overview', 'Activity'])
type Section = typeof Section.Type
const Plan = Schema.Literals(['Basic', 'Pro'])
type Plan = typeof Plan.Type

const ActionMenu = Menu.makeBlock(Action)
const SectionTabs = Tabs.makeBlock(Section)
const PlanRadioGroup = RadioGroup.makeBlock(Plan)
