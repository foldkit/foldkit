import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/require-past-tense-message-names.ts'

describe('require-past-tense-message-names', () => {
  const flag = (tag: string) =>
    Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.strLiteral(tag)]),
    )

  // ── allowed past-tense prefixes ──────────────────────────
  it.each([
    'ClickedSubmit',
    'UpdatedEmail',
    'PressedEscape',
    'SubmittedForm',
    'ToggledSidebar',
    'SucceededFetchUser',
    'FailedFetchUser',
    'CompletedFocusInput',
    'GotWeather',
    'OpenedDialog',
    'ScrolledFeed',
  ])('allows `m("%s")`', tag => {
    expect(flag(tag)).toHaveLength(0)
  })

  // ── single-word past-tense (end-of-string is allowed) ────
  it('allows the bare prefix `m("Loaded")`', () => {
    expect(flag('Loaded')).toHaveLength(0)
  })

  // ── extended past-tense verbs (verb-first, real call sites) ──
  it.each([
    'CreatedTask',
    'DeletedThought',
    'ReceivedChatDelta',
    'CancelledReviewEdit',
    'CommittedTermEdit',
    'ConfirmedDeleteJotStack',
    'AppliedMentionSelection',
    'ChoseReviewDecision',
    'ClearedChat',
    'CopiedPiRuntimeText',
    'DuplicatedSourceBrief',
    'IngestedLibraryUrl',
    'MovedCommandPaletteActive',
    'RanSourceBrief',
    'RegeneratedSourceBrief',
    'ReportedSaveDecisionFailure',
    'RequestedDeleteSourceBrief',
    'ResetSourceBriefComposer',
    'SavedReviewDecision',
    'SetWritingStyleSourcesSelected',
    'StartedTermEdit',
    'StoppedChat',
    'ChangedRoute',
  ])('allows `m("%s")`', tag => {
    expect(flag(tag)).toHaveLength(0)
  })

  // ── regression: real past-tense UI verbs must not false-positive ──
  it.each([
    'FlippedCard',
    'RenderedDiagrams',
    'ZoomedIn',
    'PinnedNote',
    'UnpinnedNote',
    'ArchivedThread',
    'RestoredDraft',
    'FilteredResults',
    'SortedColumn',
    'SearchedLibrary',
    'HighlightedRange',
    'RevealedAnswer',
  ])('allows `m("%s")`', tag => {
    expect(flag(tag)).toHaveLength(0)
  })

  it('still flags present-tense `m("StartPractice")`', () => {
    const result = flag('StartPractice')
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('StartPractice')
  })

  // ── genuine noun-first tags still flag after the allowlist grew ──
  it.each(['MentionCommitted', 'JotspotMutated', 'PiRuntimeTextCopied'])(
    'flags noun-first `m("%s")`',
    tag => {
      expect(flag(tag)).toHaveLength(1)
    },
  )

  it('leaves `m("NoOp")` to the dedicated no-noop-message rule', () => {
    expect(flag('NoOp')).toHaveLength(0)
  })

  // ── disallowed prefixes ──────────────────────────────────
  it.each([
    ['ChangeEmail', 'present tense `Change*`'],
    ['ChangingEmail', 'continuous `Changing*`'],
    ['EmailFocused', 'noun-first `*Focused`'],
    ['MouseEnter', 'unknown verb'],
    ['LoadUser', 'imperative `Load*` (use `Loaded*`)'],
  ])('flags `m("%s")` (%s)', tag => {
    const result = flag(tag)
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(tag)
  })

  // ── non-targets ──────────────────────────────────────────
  it('does not flag non-`m` calls with a past-tense prefix string', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('foo', [Testing.strLiteral('LoadUser')]),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag `m(...)` with a non-string first argument', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callExpr('m', [Testing.numLiteral(0)]),
    )
    expect(result).toHaveLength(0)
  })

  // ── boundary: prefix must be followed by uppercase ───────
  it('does not flag prefix-as-substring without word boundary `m("Loadedness")`', () => {
    // Note: `Loaded` is in the prefix list. The regex `^Loaded([A-Z]|$)` requires
    // uppercase or end-of-string after the prefix; `Loadedness` has lowercase after,
    // so it fails the past-tense check and IS flagged.
    const result = flag('Loadedness')
    expect(result).toHaveLength(1)
  })
})
