import { ChildBlock } from './child'
import { ApplicationDefinition, makeStep } from './definition'

const ChildBinding = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'child',
})

// ❌ Bad
// The parent constructs a local child Message instead of invoking its operation.
const badRouting = () => ChildBlock.Message.RequestedSave()

const requestSave = ChildBlock.Message.RequestedSave
const badAliasRouting = () => requestSave()

// ✅ Good
// The parent invokes the operation projected by its child Binding.
const goodRoutingStep = makeStep(() => ChildBinding.requestSave())
