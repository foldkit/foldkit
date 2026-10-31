import type { Mount } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'

import type { Dialog } from '@foldkit/ui'

import type { Message } from '../message'

export type ApplicationViewBuilder = HtmlBuilder<
  Message,
  Mount.RequirementsOf<(typeof Dialog.Dialog.Mount)[number]>
>
