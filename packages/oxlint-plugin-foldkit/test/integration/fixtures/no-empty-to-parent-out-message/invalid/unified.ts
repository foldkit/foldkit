import { Block } from 'foldkit'

const ApplicationBlock = Block.make('Application', { key: ApplicationKey, Model, Message, Init })
const { makeBinding } = ApplicationBlock
makeBinding(ChildBlock, { field: 'child' }).withOutMessagePolicy({ forward: () => undefined })
