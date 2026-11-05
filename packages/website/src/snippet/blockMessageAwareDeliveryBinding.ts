import { makeBinding } from './block'
import { ReaderBlock } from './reader'

const ReaderBinding = makeBinding(ReaderBlock, {
  field: 'reader',
  delivery: {
    toUpdateContext: model => [model.authority === 'Confirmed'],
  },
})
