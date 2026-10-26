# Named transition Steps

The naming migration is committed at `c206b844f6`, followed by lint-only cleanup
at `978c07a093`. The [approval report](preview-approval-20261026.md) records the
complete final verification. Publication remains held.

## Convention and adoption

Name assigned transition Steps and purposeful functions that construct or select
Steps with a descriptive `Step` suffix. This includes values created through the
focused helpers, `.fromMessage`, Binding operations, explicit Step types, and
curried combinations. A helper-created Message handler is a named Step value;
its name receives the suffix too.

The application sweep renames 87 declarations: 61 in examples, 21 in Website
application code, and five in Typing Game. Framework/UI implementation examples,
tests, declaration fixtures and their cross-file consumers follow the same rule.
Active Website snippets, scaffold `FOLDKIT.md`/`AGENTS.md`, repository guidance
and consumer skills describe it. The generated note-player demo and its source
extraction markers were updated together.

Keep distinct contracts named for their roles:

- Direct-result Message handlers retain `handle<MessageTag>` names.
- Public operation keys, Message tags, factory APIs and imported authoring-helper
  aliases retain their existing names.
- Named OutMessage folds and matchers retain their fold names.
- Applied update-like results retain operation names, without `Step`.
- Published historical material and unchanged compiler-performance controls keep
  their original spelling. A non-Foldkit lookalike lint fixture remains intact.

Feature-local helper imports remain the default for split features. Ownership
stays qualified when several Definitions share a module. `.fromMessage` remains
its existing payload-only producer adapter; no `messageOnly` alias is introduced.

## Verification

An AST comparison of all 39 changed application files establishes alpha
equivalence after normalizing local identifier names and equivalent shorthand
properties. Public property keys remain explicit where a local Step was renamed.
The shared Workspace no-op remains one construction reused by its handlers.
This comparison supplements the source, runtime and declaration gates.

Independent review of both exact commits found no changed production behavior,
removed rejection proof, widened public operation contract, or modified compiler
budget. The final frozen matrix covers all 53 source projects, core/UI external
emission and strict relocation, six unchanged compiler controls, runtime and lint
suites, the actual Workspace root's declarations, and packed consumer rehearsals.
