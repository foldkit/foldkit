import type { Update } from 'foldkit'

import { ApplicationBlock } from '../../src/test/apps/childInstances/block.js'
import { CounterBlock } from '../../src/test/apps/childInstances/counter.js'
import { addCounter } from '../../src/test/apps/childInstances/transitions.js'

export type Model = typeof ApplicationBlock.Model.Type
export type Instance = typeof CounterBlock.Instance.Type
export type Requirements = Update.RequirementsOf<ReturnType<typeof addCounter>>
export const readCount = (instance: Instance): number => instance.model.count
