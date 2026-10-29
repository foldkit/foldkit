import { Menu, Tabs } from '@foldkit/ui'

import { Step } from './domain'

export const StepMenuBlock = Menu.makeBlock<Step.Step>()
export const StepTabsBlock = Tabs.makeBlock<Step.Step>()
