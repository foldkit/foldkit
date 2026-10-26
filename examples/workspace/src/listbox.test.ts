import { Option } from 'effect'
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
  const statusInit = StatusListboxBlock.init({ id: 'typed-status' })
  const priorityInit = PriorityListboxBlock.init({ id: 'typed-priority' })

  // @ts-expect-error Status operations retain the domain value type.
  StatusListboxBlock.operations.requestSelectItem(statusInit.model, 'Blocked')

  // @ts-expect-error Priority operations reject status values.
  PriorityListboxBlock.operations.requestSelectItem(priorityInit.model, 'Done')

  const acceptStatusView = (
    inputs: Listbox.ViewInputs<
      typeof StatusListboxOption.Type,
      typeof IssueStatus.Type
    >,
  ) => inputs

  // @ts-expect-error Shared rendering retains the domain's allowed values.
  acceptStatusView(listboxViewInputs({ value: 'Other', options: [] }))
}
