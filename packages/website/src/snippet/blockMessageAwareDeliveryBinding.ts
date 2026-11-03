import { ApplicationDefinition } from './definition'
import { ReaderBlock } from './reader'

const ReaderBinding = ApplicationDefinition.makeBinding(ReaderBlock, {
  field: 'reader',
  delivery: {
    toUpdateContext: model => [model.authority === 'Confirmed'],
  },
})
