import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Child } from './child'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({
  ClickedDirectRecord: {},
  ClickedContextRecord: {},
})
const Definition = Block.makeDefinition('ParentRecordOwnership', {
  Model,
  Message,
})
const Composition = Definition.makeComposition()

Composition.makeUpdate({
  ClickedDirectRecord: model => {
    Child.Message.ClickedFromDirectRecord()
    return { model }
  },
  ClickedContextRecord: model => ({ model }),
})

Composition.makeUpdate.withContext((_context: string) => ({
  ClickedDirectRecord: model => ({ model }),
  ClickedContextRecord: model => {
    Child.Message.ClickedFromContextRecord()
    return { model }
  },
}))

const unrelated = {
  makeUpdate: Object.assign((cases: unknown) => cases, {
    withContext: (createCases: unknown) => createCases,
  }),
}

unrelated.makeUpdate({
  ClickedDirectRecord: () => Child.Message.ClickedFromUnrelatedRecord(),
})

unrelated.makeUpdate.withContext(() => ({
  ClickedContextRecord: () =>
    Child.Message.ClickedFromUnrelatedContextRecord(),
}))
