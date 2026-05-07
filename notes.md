# Prettier plugin spike — FOL-286

Scratch writeup for the hugging-brackets / leading-commas plugin spike. Do not
commit to `main`.

## What landed on this branch

- `packages/prettier-plugin-foldkit-view/` — the plugin (single package, not
  published). Source, tests, capture script, README.
- `packages/prettier-plugin-foldkit-view/artifacts/` — `*.before.txt` and
  `*.after.txt` for fourteen corpus files, plus `summary.md` with line-count
  and max-indent deltas.

Nothing in `examples/`, `packages/`, or `.prettierrc` is modified. The plugin
is opt-in via the consumer's plugins array.

## Engagement strategy

Per follow-up direction, the plugin engages **globally**. It registers a
printer for the `estree` AST format and runs on every TypeScript file Prettier
processes, with three opt-out switches (`foldkitViewArrays`,
`foldkitViewObjects`, `foldkitViewCallScope`).

Why not file-glob:

- A file glob makes the formatter behave differently per file. That's spooky
  for a tool whose contract is "the codebase looks one way".
- Foldkit-style code shows up outside of `view*.ts`. `update.ts`, `command.ts`,
  and pages with mixed concerns all benefit from hugging.
- Scoping by callee identifier was tempting for `CallExpression` (only hug
  `div`, `span`, `keyed`, etc) but the Foldkit DSL is broad: any composite UI
  helper an app declares (`pageTitle`, `comparisonTable`, `glyph`...) would
  need to be added. Default `foldkitViewCallScope='all'` is more honest.

## Doc IR primitives I leaned on

- `group(...)` — the workhorse. Each hugged container is a single group, so
  Prettier picks flat-vs-broken based on whether the contents fit `printWidth`.
- `ifBreak(breakDoc, flatDoc)` — used for the leading-space-in-broken-mode
  pattern: `[ x` when broken, `[x` when flat.
- `align(2, doc)` — adds two columns to indentation only when sub-doc
  internal newlines fire. This is what makes child internal breaks indent two
  past the opener column, while the leading-comma separator stays at the
  opener column.
- `hardlineWithoutBreakParent` — the explicit "newline, but don't propagate
  break-parent". Picking this over plain `hardline` was the bug fix that took
  the plugin from "always breaks everything" to "breaks only when printWidth
  is exceeded". `hardline = [hardlineWithoutBreakParent, breakParent]`, and
  the `breakParent` propagates through the doc tree even when nested inside
  `ifBreak`'s break branch.

## What fought back

1. **Parens-around-object-literal aren't part of the ObjectExpression node.**
   The standard estree printer detects `=> ({...})` and `({...})` as a
   statement and adds parens itself. When we override the printer for those
   contexts, we drop the parens and produce invalid TypeScript. Mitigation:
   detect the two parent shapes (`ArrowFunctionExpression.body`,
   `ExpressionStatement.expression`) and fall back to the original printer.
   Same shape exists for `NewExpression.callee` when the callee is a
   `CallExpression` — handled identically. The list of "parent contexts that
   need parens" is small, but reproducing Prettier's `needs-parens` logic
   exactly would be a significant chunk of work.

2. **Line-leading comments inside containers.** A source like

   ```ts
   div(
     [
       // own-line leading comment
       Class('a'),
       Id('b'),
     ],
     ...
   )
   ```

   has a comment attached to the first child with `placement: 'ownLine'`. The
   child's printed Doc embeds that comment. If we hug, we'd want

   ```ts
   div( [ // own-line leading
       Class('a')
     , Id('b')
     ]
   ...
   ```

   which is not what readers expect for own-line comments. Conservative call:
   if any child has a leading own-line comment, fall back to standard Prettier
   for that container. Trailing inline comments (`Class('a'), // attributes`)
   round-trip without intervention because they're embedded in the child doc.

3. **Dangling comments inside empty containers.** `foo(/* hi */)`,
   `[/* solo */]`. These are stored on the parent node with `placement:
'remaining'`. Our hugged emitter doesn't know how to render them; falling
   back to the original printer is fine because empty containers never benefit
   from hugging anyway.

4. **Closing-bracket alignment vs `printWidth` accounting.** I wanted closing
   brackets to align with their openers (`[` at column N, `]` at column N).
   That works because the `ifBreak(hardlineWithoutBreakParent)` before the
   close emits a newline at the surrounding indent (where the open was), so
   the close lands in the right column. Did not need any alignment escape
   hatches.

5. **Nothing in the Doc IR fought back conceptually.** The leading-comma form
   maps cleanly to standard primitives. No string-level post-processing.

## What I couldn't express without escape hatches

Nothing severe. A few aesthetic gaps that need more work to express in pure
Doc IR:

- **First-arg-on-the-same-line, rest-broken.** Standard Prettier emits
  `keyed('div')(model._tag, [],` on one line and the third arg on the next.
  My printer treats all args the same: either all flat or all hugged. The
  Foldkit `keyed`, `M.tagsExhaustive`, and decorator-like patterns would
  benefit from a "first arg sticks to opener, rest break" mode. Expressible
  with `conditionalGroup` over alternative layouts, but not implemented.
- **Tail-position single-arg call hugging.** `Class('a-very-long-string')`
  with one arg that overflows yields

  ```
  Class( 'a-very-long-string'
  )
  ```

  which is uglier than Prettier's

  ```
  Class(
    'a-very-long-string',
  )
  ```

  Worth special-casing for single-argument `CallExpression`. Not implemented.

## Idempotency

**Yes** on every TypeScript file in the repo: 926/926. Each file is formatted
once with the plugin, and the result is reformatted; both passes match.

I tested in three batches:

1. The 14 corpus files in `artifacts/summary.md` — all idempotent.
2. The 13 explicitly-named files in `test/format.test.ts` (overlapping
   set) — all idempotent under the vitest suite.
3. A sweep of every `.ts(x)` file outside `node_modules`, `dist`, and `repos/`
   (922 files) — all idempotent and re-parseable.

The auth view took two iterations to get there. The first version dropped
parens around the arrow-body object literal, producing invalid TypeScript on
output. Catching that needed the `objectNeedsParens` fallback described above.

## Comment handling

**Yes** for the cases tested. `test/fixtures/comments.ts` covers:

- File-leading comments
- Block comments between siblings (`[1, /* between */ 2, 3]`)
- Trailing inline comments on elements (`[1 /* trail */, 2]`)
- Endline comments after a list element (`[Class('foo')], // attributes`)
- Dangling comments inside empty `[]`, `{}`, `()` (each falls back to
  standard Prettier; the comment survives unchanged)
- Own-line block comments between siblings (also fall back)
- Own-line line comments leading a list element (fall back)

The fixture is asserted character-for-character through one and two passes,
and each comment value is checked to still appear in the output.

What I did **not** test exhaustively: pragma comments, license headers with
specific formatting requirements, JSDoc on object properties (the property's
own printer handles those — should be fine, but no fixture coverage). Worth
extending if this goes further.

## Honest estimate of remaining work to reach production

To call this production-ready I'd want:

| item                                       | effort | notes                                                                                                                                                           |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implement `needs-parens` more completely   | 1–2d   | Audit Prettier's `needs-parens.js` and replicate the ObjectExpression / CallExpression cases beyond the three I caught. Risk of producing invalid TS otherwise. |
| First-arg-sticks-to-opener layout          | 1–2d   | `conditionalGroup` over two layouts. Probably the biggest readability win.                                                                                      |
| Tail-position single-arg call special case | 0.5d   | Just don't hug if `args.length === 1`.                                                                                                                          |
| Own-line comment passthrough               | 1–2d   | Pull comment docs out, splice into the hugged form before each child.                                                                                           |
| Preserve blank lines between siblings      | 0.5d   | Original printer reads `options.originalText` to detect blank lines. Mirror that.                                                                               |
| Snapshot tests at the corpus level         | 0.5d   | Lock down expected output. Currently I assert idempotency only.                                                                                                 |
| Visual review on large apps                | 1d     | Run on `examples/website/src/page/landing.ts` and similar, identify layouts that read worse than baseline, decide whether to widen the fallback set.            |
| Tabs / non-2-tabwidth support              | 0.5d   | The hugged form assumes the opener prefix is two characters wide. Tabs or `tabWidth: 4` will misalign.                                                          |
| Comment fixture matrix                     | 1d     | Pragma, license header, decorator-like comments, comment after `]` on its own line.                                                                             |
| Documentation and migration guide          | 0.5d   | When does the team adopt this. What does it cost reviewers in the first week.                                                                                   |

Roughly **6–9 days** for one engineer. Most of that risk-shaped: each
"fall back" case discovered late costs a fresh round of testing.

## Verdict

**Viable, with a real cost.** A four-screen-wide deeply nested view file does
read more cleanly with leading commas and aligned closers; -18.3% lines on
the 14-file corpus is not noise. But:

- The hugged form is unfamiliar to anyone who hasn't worked in Elm. Reviewers
  will spend the first week mentally parsing `, item` as "yes, this is the
  next item, the comma is a list marker" instead of "missing comma above?"
  That cost is real and not recoverable by tooling.
- Tail-position single-arg breaking looks worse than Prettier baseline.
  Without the special case it actively makes some files harder to read.
- Reviewing diffs gets harder during the migration commit. After that,
  diffs are arguably better (leading commas mean adding/removing items
  changes one line, not two).
- Mixing standard Prettier (function params, type literals, JSX, destructuring)
  with hugging (call args, array literals, object literals) inside the same
  file produces a mild stylistic inconsistency. Not a blocker but visible.

If I were running the team I'd hold this until the post-Prettier codemod
spike lands so we can compare. The codemod path is more invasive (parser
ownership) but offers full control over the layout, which would let us fix
the tail-position-single-arg issue and the first-arg-sticks issue without
fighting Doc IR. The plugin path is quicker to ship and integrates cleanly
into existing tooling, but is fundamentally constrained by what
`group / ifBreak / align / softline` can express, and the constraints push
some layouts toward worse-than-baseline.

If forced to ship one of the two paths today, the plugin is workable but
needs the items in the table above before a team-wide migration. The
foundation is sound: idempotent, parses, comments survive, opt-in via
`.prettierrc`. The remaining work is layout polish, not architecture.
