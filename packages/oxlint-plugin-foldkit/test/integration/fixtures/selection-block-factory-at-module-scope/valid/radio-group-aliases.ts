import { Schema } from 'effect'

import { RadioGroup as Plans } from '@foldkit/ui'
import { makeBlock as makePlan } from '@foldkit/ui/radioGroup'

const Plan = Schema.Literals(['Basic', 'Pro'])

export const PlanRadioGroup = Plans.makeBlock(Plan)
export const SubpathPlanRadioGroup = makePlan(Plan)
