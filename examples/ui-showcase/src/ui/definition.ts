import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'

import { Message } from './message'
import { Model } from './model'

export const Ui = Block.define('Ui', { Model, Message, Startup: CalendarDate })
