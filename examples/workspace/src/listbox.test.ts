import { Option } from 'effect'
import * as Story from 'foldkit/story'
import { describe, expect, expectTypeOf, test } from 'vitest'

import type { Listbox } from '@foldkit/ui'

import type { IssuePriority, IssueStatus } from './domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  StatusListboxOption,
  listboxViewInputs,
} from './listbox'

describe('Workspace Listbox types', () => {
  test('shares rendering while preserving the domain selection', () => {
    const options: ReadonlyArray<typeof StatusListboxOption.Type> = [
      { value: 'Todo', label: 'Todo' },
      { value: 'Done', label: 'Done' },
    ]

    const viewInputs = listboxViewInputs({ value: 'Todo', options })

    expectTypeOf(viewInputs).toExtend<
      Listbox.ViewInputs<
        typeof StatusListboxOption.Type,
        typeof IssueStatus.Type
      >
    >()
    expectTypeOf(viewInputs.maybeSelectedValue).toEqualTypeOf<
      Option.Option<typeof IssueStatus.Type>
    >()
    expectTypeOf(
      StatusListboxBlock.OutMessage.Selected({ value: 'Done' }).value,
    ).toEqualTypeOf<typeof IssueStatus.Type>()
    expectTypeOf(
      PriorityListboxBlock.OutMessage.Selected({ value: 'High' }).value,
    ).toEqualTypeOf<typeof IssuePriority.Type>()

    expect(viewInputs.maybeSelectedValue).toEqual(Option.some('Todo'))
  })
})

if (false) {
  const invalidStatusSelection = Story.withBlock(
    StatusListboxBlock,
    statusListbox => {
      const statusInit = statusListbox.init({ id: 'typed-status' })
      // @ts-expect-error Status operations retain the domain value type.
      statusListbox.operations.requestSelectItem(statusInit.model, 'Blocked')
    },
  )
  const invalidPrioritySelection = Story.withBlock(
    PriorityListboxBlock,
    priorityListbox => {
      const priorityInit = priorityListbox.init({ id: 'typed-priority' })
      // @ts-expect-error Priority operations reject status values.
      priorityListbox.operations.requestSelectItem(priorityInit.model, 'Done')
    },
  )

  void invalidStatusSelection
  void invalidPrioritySelection

  const acceptStatusView = (
    inputs: Listbox.ViewInputs<
      typeof StatusListboxOption.Type,
      typeof IssueStatus.Type
    >,
  ) => inputs

  // @ts-expect-error Shared rendering retains the domain's allowed values.
  acceptStatusView(listboxViewInputs({ value: 'Other', options: [] }))
}
