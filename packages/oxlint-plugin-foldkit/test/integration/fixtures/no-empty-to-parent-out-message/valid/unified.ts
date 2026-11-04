import { Block } from 'foldkit'

const ApplicationBlock = Block.make('Application', { key: ApplicationKey, Model, Message, Init })
ApplicationBlock.makeBinding(ChildBlock, { field: 'child' }).withOutMessagePolicy({ ignore: true })
