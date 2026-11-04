import { ApplicationBlock } from './definition'
import { ReaderBlock } from './reader'

const ReaderBinding = ApplicationBlock.makeBinding(ReaderBlock, {
  field: 'reader',
  delivery: {
    toUpdateContext: model => [model.authority === 'Confirmed'],
  },
})
