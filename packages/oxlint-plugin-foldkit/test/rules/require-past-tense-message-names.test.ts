import { Array } from 'effect'
import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { requirePastTenseMessageNames } from '../../src/rules/require-past-tense-message-names.ts'

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)])

const runTag = (tag: string) =>
  Testing.runRule(requirePastTenseMessageNames, 'CallExpression', m(tag))

const runTagWithExtraVerbs = (tag: string, extraVerbs: ReadonlyArray<string>) =>
  Testing.runRule(requirePastTenseMessageNames, 'CallExpression', m(tag), {
    options: [{ extraVerbs }],
  })

const tagsWithDiagnostics = (tags: ReadonlyArray<string>) =>
  tags.filter(tag => Array.isReadonlyArrayNonEmpty(runTag(tag)))

const flagsExactlyOnceNamingTag = (tag: string): boolean => {
  const result = runTag(tag)
  return (
    result.length === 1 && result[0]?.diagnostic.message?.includes(tag) === true
  )
}

const tagsNotFlaggedOnce = (tags: ReadonlyArray<string>) =>
  tags.filter(tag => !flagsExactlyOnceNamingTag(tag))

describe('require-past-tense-message-names', () => {
  it('allows standard -ed Message tags', () => {
    const tags = [
      'ClickedSubmit',
      'UpdatedEmail',
      'PressedEscape',
      'SubmittedForm',
      'ToggledSidebar',
      'SucceededFetchUser',
      'FailedFetchUser',
      'CompletedFocusInput',
      'OpenedDialog',
      'ScrolledFeed',
    ]

    expect(tagsWithDiagnostics(tags)).toEqual([])
  })

  it('allows a bare single -ed word', () => {
    const result = runTag('Loaded')

    expect(result).toHaveLength(0)
  })

  it('allows the irregular past-tense allowlist', () => {
    const tags = [
      'GotWeather',
      'RanSourceBrief',
      'ChoseReviewDecision',
      'SetWritingStyleSourcesSelected',
      'ResetSourceBriefComposer',
      'SentInvite',
      'BeganDrag',
      'HidTooltip',
      'LeftCanvas',
    ]

    expect(tagsWithDiagnostics(tags)).toEqual([])
  })

  it('allows a bare irregular', () => {
    const result = runTag('Got')

    expect(result).toHaveLength(0)
  })

  it('allows arbitrary -ed verbs that appear in no list', () => {
    const tags = [
      'FlippedCard',
      'RenderedDiagrams',
      'ZoomedIn',
      'PinnedNote',
      'ArchivedThread',
      'RestoredDraft',
      'FilteredResults',
      'SortedColumn',
      'SearchedLibrary',
      'HighlightedRange',
      'RevealedAnswer',
      'CreatedTask',
      'DeletedThought',
      'ReceivedChatDelta',
      'CancelledReviewEdit',
      'CommittedTermEdit',
      'TimestampedMessage',
      'FrobnicatedWidget',
    ]

    expect(tagsWithDiagnostics(tags)).toEqual([])
  })

  it('leaves Changed* tags to no-changed-message-prefix', () => {
    expect(tagsWithDiagnostics(['ChangedRoute', 'ChangedEmail'])).toEqual([])
  })

  it('leaves NoOp to no-noop-message', () => {
    const result = runTag('NoOp')

    expect(result).toHaveLength(0)
  })

  it('admits an irregular listed in extraVerbs', () => {
    const result = runTagWithExtraVerbs('DrewCard', ['Drew'])

    expect(result).toHaveLength(0)
  })

  it('ignores calls whose callee is not m', () => {
    const result = Testing.runRule(
      requirePastTenseMessageNames,
      'CallExpression',
      Testing.callExpr('foo', [Testing.strLiteral('LoadUser')]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-string first arguments', () => {
    const result = Testing.runRule(
      requirePastTenseMessageNames,
      'CallExpression',
      Testing.callExpr('m', [Testing.numLiteral(0)]),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a present-tense verb', () => {
    const result = runTag('StartPractice')

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('StartPractice')
    expect(result[0]?.diagnostic.message).toContain('extraVerbs')
  })

  it('flags noun-first tags', () => {
    const tags = ['MentionCommitted', 'JotspotMutated', 'PiRuntimeTextCopied']

    expect(tagsNotFlaggedOnce(tags)).toEqual([])
  })

  it('flags non-past-tense first words', () => {
    const tags = [
      'ChangeEmail',
      'ChangingEmail',
      'EmailFocused',
      'MouseEnter',
      'LoadUser',
    ]

    expect(tagsNotFlaggedOnce(tags)).toEqual([])
  })

  it('flags a suffix embedded without ending the word', () => {
    const result = runTag('Loadedness')

    expect(result).toHaveLength(1)
  })

  it('flags Tick tags', () => {
    expect(tagsNotFlaggedOnce(['Tick', 'TickDemo'])).toEqual([])
  })

  it('flags an unknown irregular without the option', () => {
    const result = runTag('DrewCard')

    expect(result).toHaveLength(1)
  })

  it('matches extraVerbs against whole words only', () => {
    const result = runTagWithExtraVerbs('Drewbridge', ['Drew'])

    expect(result).toHaveLength(1)
  })

  it('flags a tag that does not start with an uppercase letter', () => {
    const result = runTag('clickedSubmit')

    expect(result).toHaveLength(1)
  })

  it('flags a first word that absorbs digits', () => {
    const result = runTag('Got2Fa')

    expect(result).toHaveLength(1)
  })
})
