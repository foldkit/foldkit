# Open Issues Plan

Tracking remaining open GitHub issues, grouped by priority tier.

## High Priority

### 1. Fix Class attribute multiline whitespace bug (#1)

**Scope:** One-line fix in `packages/foldkit/src/html/index.ts`

`Class` splits on `' '` (line 581), so multiline template strings throw `InvalidCharacterError` from `DOMTokenList.add`. Newlines and tabs are not handled.

**Change:** Replace `String.split(' ')` with a regex split on `/\s+/`, trim the input, and filter empty strings. Add a test case with multiline class strings.

**File:** `packages/foldkit/src/html/index.ts:581`

### 2. PascalCase HTML attributes (#11)

**Scope:** Rename + breaking change across `packages/foldkit/src/html/index.ts`

`Maxlength` should be `MaxLength`. Audit all multi-word attribute names for consistent PascalCase. This is a breaking change — ship alongside #7 to avoid two rounds of breakage to the attribute API.

**Attributes to audit:** Grep for attribute schema definitions in `html/index.ts` and verify casing against PascalCase convention.

**Coordinate with:** #7 (add missing attributes in the same release)

### 3. Add missing standard HTML attributes (#7)

**Scope:** Additions to `packages/foldkit/src/html/index.ts`

Ship in tiers:

**Tier 1 (commonly needed):**

- Table: `ColSpan`, `RowSpan`, `Headers`, `Scope`
- Media: `Autoplay`, `Controls`, `Loop`, `Preload`, `Poster`
- Form: `List`
- Textarea: `Wrap`
- List: `Reversed`, `Start`

**Tier 2 (less common):**

- Iframe: `Sandbox`, `SrcDoc`
- Interaction: `AccessKey`, `ContentEditable`, `Draggable`
- Track: `Default`, `Kind`, `SrcLang`
- Link: `HrefLang`, `Media`

**Tier 3 (rare — defer):**

- Image maps, microdata, deprecated attributes

For each attribute: add Schema definition, union member, handler in the attribute processor, and convenience constructor. Follow existing patterns in the file.

## Medium Priority

### 4. Use Effect Clock in typing-game (#5)

**Scope:** Small refactor in `packages/typing-game/client/src/`

`Date.now()` in `handleKeyPressed.ts:77` generates a `roomIdValidationId` inside an update function, breaking Elm Architecture purity. The timestamp should be produced by a command using `Clock.currentTimeMillis` and delivered via a message.

Also update the `evoExample.ts` snippet on the website to avoid demonstrating an impure pattern.

**Files:**

- `packages/typing-game/client/src/page/home/update/handleKeyPressed.ts`
- `packages/website/src/snippet/evoExample.ts`

### 5. Clean up fieldValidation minor inconsistencies (#10)

**Scope:** Small fixes in `packages/foldkit/src/fieldValidation/index.ts`

The library has been substantially improved. Remaining items:

- [ ] `between` validator (line 132) uses raw `>=`/`<=` — should use `Number_.greaterThanOrEqualTo`/`Number_.lessThanOrEqualTo` for consistency with `min`, `max`, `positive`, `nonNegative`
- [ ] Evaluate whether the `for` loop in `validateField` (line 170) should become `Array.findFirst` + `Array.match` per codebase conventions

Can close #10 after these are addressed, or close now if deemed acceptable.

## Lower Priority

### 6. Document fieldValidation on website (#13)

**Scope:** New page or section in `packages/website/src/`

- Document the `makeField` state machine (`NotValidated | Validating | Valid | Invalid`)
- Document all validators with usage examples
- Document `validateField` runner
- Add a dedicated "Forms" page or a section within an existing page
- Update the "Coming from React" page to link to the new docs

**Blocked by:** #10 (finalize the API before documenting it)

### 7. Add URL-synced form example (#12)

**Scope:** New example in `examples/` directory

Form with a few fields that syncs bidirectionally with URL query params. Highlights foldkit's strengths — the Elm Architecture makes the sync direction explicit (message → model → URL and URL → message → model) compared to React's useState/useSearchParams/useEffect dance.

### 8. Large project TypeScript performance tests (#2)

**Scope:** Benchmarking / test suite

External contributor (@riordanpawley) offered a PR. Goal: verify type-checking performance with thousands of commands. The submodel/submessage pattern already mitigates this in practice, but having hard numbers builds confidence.

**Action:** Follow up on the issue to see if the contributor is still interested.

## Suggested Release Strategy

**Next patch release:**

- #1 (Class whitespace fix — bug fix, non-breaking)

**Next minor/major release (coordinate breaking changes):**

- #11 (PascalCase attributes — breaking rename)
- #7 Tier 1 (missing attributes — additive but pairs with #11)

**Ongoing:**

- #5, #10 (cleanup)
- #13, #12 (docs and examples)
- #2 (community contribution)
