import { Block } from 'foldkit'

const ApplicationBlock = Block.make('Application', { key: ApplicationKey, Model, Message, Init })
const { makeRequiredFieldBinding } = ApplicationBlock
makeRequiredFieldBinding(ChildBlock, { field: 'child' }).withOutMessagePolicy({ forward: () => undefined })
