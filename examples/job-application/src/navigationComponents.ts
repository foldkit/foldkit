import { makeBlock as makeMenuBlock } from '@foldkit/ui/menu'
import { makeBlock as makeTabsBlock } from '@foldkit/ui/tabs'

import { Step } from './domain'

export const StepMenuBlock = makeMenuBlock<Step.Step>()
export const StepTabsBlock = makeTabsBlock<Step.Step>()
