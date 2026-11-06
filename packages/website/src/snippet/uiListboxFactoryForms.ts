import { Schema } from 'effect'

import { Listbox } from '@foldkit/ui'

const StringListboxBlock = Listbox.makeBlock()

const Plan = Schema.Literals(['Free', 'Pro', 'Enterprise'])
type Plan = typeof Plan.Type
const PlanListboxBlock = Listbox.makeBlock(Plan)

const PlanOption = Schema.Struct({
  value: Plan,
  label: Schema.String,
})
type PlanOption = typeof PlanOption.Type
const PlanOptionListboxBlock = Listbox.makeBlock(PlanOption, Plan)
