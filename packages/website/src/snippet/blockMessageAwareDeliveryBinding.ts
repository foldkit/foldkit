import { makeRequiredFieldBinding } from './block'
import { ReaderBlock } from './reader'

const ReaderBinding = makeRequiredFieldBinding(ReaderBlock, {
  field: 'reader',
  delivery: {
    toUpdateContext: model => [model.authority === 'Confirmed'],
  },
})
