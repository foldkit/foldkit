# Writing prose

Worked examples for the prose rules in `AGENTS.md`. Every before below was
written by an agent on this repository and corrected by the maintainer. Read
this when a rule needs context; the rules themselves are the always-on version.

The pattern behind almost all of them: a clear explanation gets given in
conversation, then translated into something worse for the docs. The mechanism
described from inside itself, an abstraction where the conversation had an
example, and the point buried at the end of a long sentence. The conversational
version was the good one.

## Lead with the claim

**Before.** "A page served from an earlier deployment is caught by the build id
rather than by that startup check. The server stamps the id on the rendered root
and the client carries the same one, and hydration compares them before it reads
anything the page carries, so nothing on a page from another deployment can reach
a view that now means something else."

**After.** "The build id does not make hydration correct. It makes hydration
refuse when it would otherwise be incorrect."

A reader who stops after two sentences should still have the model. The
machinery can follow.

## Say what happens to a person

**Before.** "Everything builds, hydration succeeds, and the comparison is simply
off from then on."

**After.** "A visitor still holding a page from the older deployment has it
hydrated by the newer client."

"The comparison is off" describes the system's internal state and leaves the
reader to work out what it costs them.

## A failure should read as bad news

**Before.** "Giving two deployments the same id changes nothing you can see:
every build succeeds and every page hydrates."

This is true and completely misleading. A summary of the broken case sounded
like the working case, and the reader had to ask "what exactly is the issue?" to
find out. Most readers give up instead of asking. When describing what goes
wrong, the sentence has to be readable as wrong.

## Name the thing you are pointing at

**Before.** "That ordering is the whole point." (Which ordering? Which point?)

**After.** "The check has to come first."

If a demonstrative points at something more than one sentence back, repeat the
noun instead.

## Use the specific name when one exists

**Before.** "When the page carries no trace of a Foldkit server render."

**After.** "When none of `data-foldkit-app`, `data-foldkit-build`, or
`data-foldkit-flags` appears anywhere in the document."

The implementation names three attributes. Vagueness here is usually a failure to
go and look them up.

Once the prose establishes a precise technical noun, keep using it. Technical
writing does not benefit from synonym variation when the replacement changes
the architecture the reader sees.

**Before.** "The job-application example stores applicant entries in an array,
each with its own child Model."

**After.** "The job-application example stores Applicant Submodels in an array."

The sentence explains the architecture, so it needs the architecture's name.
"Child Model" narrows the claim to stored state and loses the fact that each
entry is updated as a Submodel.

## Attach modifiers to the right thing

**Before.** "`Update.foldChildAt` folds one keyed Submodel."

**After.** "`Update.foldChildAt` folds one Submodel selected by key."

The key belongs to the parent's selection operation. It is not an intrinsic
property of the Submodel. A compressed modifier can move ownership or identity
to the wrong noun even when every word sounds technical. Expand the modifier
until the relationship is explicit.

## Name the condition, not a story about it

**Before.** "The fold ignores late child Messages."

**After.** "When `readAt` returns `None` for the key, the fold leaves the parent
Model unchanged."

The behavior depends on whether the lookup finds a Submodel. It does not depend
on when the Message arrives. Timing, ordering, and causal language belong only
when they change the result.

## One concrete example beats three abstract clauses

**Before.** "An input the old page meant one way is reused for whatever now sits
in that position."

**After.** "Imagine the old page has an `<input name="email">` exactly where the
new build puts an `<input name="ssn">`."

## Introduce examples before listing them

**Before.** "A Boolean can model an independent fact, an async result needs
extra identity only when it can become stale, and a public Submodel helper is
correct when it preserves the child's update boundary."

This sentence packs three unrelated conclusions into one line. Each conclusion
needs context: what the Boolean tracks, which async result could become stale,
or which boundary a Submodel helper might cross. The conclusions are meant to
support a larger claim, but without that setup they read as disconnected
assertions. "Judge behavior, not syntax" has the same problem if the reader has
not yet seen the syntax or the behaviors being compared.

**After.** "Start with the states the application needs to represent. Say the
Model tracks a network request. It needs to distinguish four cases: idle,
loading, success, and failure. One Boolean cannot do that. Use a Boolean for an
independent yes-or-no fact."

The rewrite states the rule first, then puts the Boolean in a concrete
situation. The async result and Submodel examples need different setup, so they
belong in sections that introduce those situations.

## Explain the result instead of announcing a verdict

**Before.** "The name `NoOp` fails for a different reason: it hides the fact that
caused the Message."

"Fails", "different reason", and "the fact" all make the reader look elsewhere
for the explanation. Similar verdicts include "works", "correct", "idiomatic",
and "the intended way". None says what the application does.

**After.** "DevTools history records only `NoOp`, so a reader cannot tell that a
mouse click occurred."

State the consequence first. A verdict can summarize an explanation the reader
already understands, but it cannot replace one.

## Give technical nouns accurate agency

**Before.** "A Message requires one-shot work."

A Message is a value that records a fact. It does not require or perform work.
The update function decides how the application responds to the Message, and a
Command describes work for the Runtime to perform.

**After.** "Have update return a Command when the Runtime should perform
one-time work in response to a Message."

Check every sentence for its actor. The Model describes state. A Message records
what happened. The update function returns the next Model and any Commands. The
Runtime performs those Commands.

## Show both sides in code

When a section teaches an anti-pattern, prose alone makes the reader imagine
both the broken and corrected code. Show both versions when code makes the
difference concrete.

Mark the bad example's rendered snippet label with ❌ and the good example's
label with ✅. When the snippet's language supports comments, repeat the marker
in its first source comment using that language's comment syntax. The source
comment keeps the distinction visible when someone copies the snippet or reads
its file outside the documentation page. For a commentless format such as JSON,
use the rendered label alone.

Do not reuse one snippet for different explanations. If a snippet is bad in one
section, good in another, or needs a different explanation in its label, make
page-specific copies so each example says exactly what it demonstrates.

## State API behavior directly

**Before.** "When a user signs out, the app removes the signed-in Submodel. Its
Subscriptions should stop too."

**After.** "Return `Some(child)` from `read` when the child is present, or `None`
when it is absent. Foldkit stops the child's Subscriptions and skips its
dependency functions while `read` returns `None`."

State what the caller provides, what the function returns, and what Foldkit does.
Do not lead with a hypothetical application or user story. Add an example only
when it makes the stated behavior easier to understand.

## Do not assert that something matters

**Before.** "That is the bad outcome, not the safe one." / "Checking the id
first is what makes the refusal worth anything." / "That ordering is the whole
point."

All three claim importance instead of delivering it, and all three appeared in
the same document. State the fact and let it be important on its own.

## Do not make the same point twice

**Before.** "Static generation of it has the most miles. This site runs on it."

**After.** "Static generation of it is what this site runs on."

Both halves asserted the same thing and only one was checkable. When a vague
claim sits beside a concrete one, the concrete one survives alone.

## No superlatives without evidence

"Public content is where it is safest" claims more than four review rounds
establish. "The lowest-risk use today" says what the evidence supports and dates
it.

"The natural fit", applied to two different third-party tools in one document,
asserts a judgment with no reason attached. Give the reason and drop the claim,
or drop both.

## An enumeration is a list

**Before.** "This is the policy for every hydration refusal: build skew; a Flags
payload that is missing, duplicated, malformed, or does not fit the Schema; a
runtime id claimed by two roots; more than one stamped root with no container to
choose between them; and a served root that lost its stamp."

Five items separated by semicolons inside one sentence. If three or more things
are separated by semicolons, or by commas that already contain commas, it is a
list and should be formatted as one.

## Cut trailing appositives that restate

A clause beginning "which is the case that..." is usually the sentence
apologizing for not having been clear enough already.

## Watch the word choice

"Three rules govern the value" and "two rules hold" are stiffer than anything
anyone says out loud, where it would be "three things have to be true".

Idioms fail the same test from the other direction. "Has the most miles" reads
fine to a native speaker and does not survive translation.

## Symmetry is not an argument

**Before.** "A missing id fails loudly with `MissingBuildId`, while a repeating
one fails with nothing at all."

The shape is balanced and the second half means nothing: a failure that produces
nothing is not a failure. The rhetoric arrived first and the claim was fitted to
it.

**Before.** "Only this rule breaks quietly."

Also balanced, also false. Putting a secret in the build id is equally silent, so
"only" was wrong, and rules do not break. The correct contrast was never between
the two rules at all. It was between omitting an id and repeating one, which the
following two sentences already made without help.

**After.** Delete the construction and let the sentences that do the work stand:
"A hydratable render given no build id fails with `MissingBuildId`, so you find
out immediately. Reusing one fails the other way: nothing warns you."

When a sentence is pleasingly parallel, check the claim on its own before
keeping the shape.

## Put content where its reader is

A paragraph explaining that a hot update does not exercise hydration sat at the
end of the section on the production handoff contract, under a heading it shared
with an unrelated point about `init` Commands. It was accurate and it read as
the author talking to themselves.

Its reader is someone running `vite dev`, so it belongs in Request-time SSR,
directly after the sentence that already mentions HMR. The other half of that
heading duplicated a Limitations bullet and was deleted.

Ask who reads the section, not just whether the sentence is true.

## Headings are labels, not claims

**Before.** "One application using both" (both what? SSG and SSR, named two
sections earlier).

**After.** "Using SSG and SSR together"

The pull here is toward something pithy and parallel, the register of a talk
slide. That construction is fine in prose, where the payoff follows immediately:
"one rendering pipeline with two delivery policies" works because the bullets
land two lines later. A heading gets no payoff, because the heading is all the
reader gets. It appears alone in a sidebar, a table of contents, a search
result, and a shared link.

The headings on the same page that work are the flat ones: "The build id",
"What a refusal does", "Which methods reach the entry", "Recovering from a
refusal".

## Read it the way a reader meets it

Sentence-level review misses a whole class, because in place the prose resolves
and in isolation it does not. Check headings on their own. Check callouts
without the paragraph above them. Check bullets without their siblings. "One
application using both" survived several passes of sentence-level review and
failed the moment anyone read the heading by itself.

## Meet the reader before introducing the API

**Before.** "`Query.define` creates a Submodel for fetched data. A Query retains
one `AsyncData` value. A KeyedQuery retains one entry for each argument key."

The opening names the API and its generated state before the reader knows what
problem Query solves. It is accurate, but it makes a new reader reverse-engineer
the reason for the abstraction.

**After.** "Fetching data in a Foldkit application usually takes the same
pieces: an `AsyncData` value in the Model, a Command that performs the request,
a Message carrying the result, and update branches that begin and settle the
request. Think of Query as that standard request loop packaged around an
`AsyncData` value."

Start from the pattern the reader already recognizes. Give the abstraction a
short mental model, then introduce its API. A conceptual page should have an
Overview for this job instead of turning its first section into a list of names.

## Separate ownership from execution

**Before.** "The loading helpers start work according to the current state."

That sentence makes a pure update operation sound imperative. It also leaves
the parent and Runtime out of the explanation.

**After.** "The parent calls a loading operation in response to one of its
Messages. The operation returns the next Model and, when a request is needed, a
fetch Command. The Runtime performs that Command after it receives the update
result."

Name each actor and give it only the agency it has. The parent decides when and
why. The operation returns data. The Runtime performs the effect.

## Use heading hierarchy to reveal the page

**Before.** A guide presented `Define a Query`, `Connect the Query to Its
Parent`, `Read and Render the Value`, `Load and Refresh`, `Choose When to Load`,
and `Reset a Query` as six consecutive `##` headings.

Every heading looked equally important, so the table of contents exposed no
path through the guide.

**After.** `Connect the Query to Its Parent` and `Read and Render Query Data`
became `###` subsections of `## Define a Query`. `Choose When the Parent Loads
or Refreshes` and `Reset a Query` became `###` subsections of `## Load and
Refresh Query Data`.

Use heading levels to encode the relationships a reader should see while
skimming. Then read each heading beside its first sentence. Renaming "What the
Parent Decides" to "The Parent Controls Loading and Refreshing" required the
paragraph to begin with that same responsibility, not the old "decides when and
why to consider" framing.

## State a category once

**Before.** "A viewless Query exposes its retained value through `read`."

Every Query is viewless, so the adjective sounds like a subtype. It makes the
reader wonder whether a viewed Query also exists.

**After.** Establish the category once: "Query is a viewless Submodel." At the
use site, state the operation directly: "Use `read` to access the Query's
retained `AsyncData` value."

An architectural trait can be important without becoming a repeated qualifier.
State it where it explains the mental model, then write later sections against
the established category.

## Explain a boundary through its public interface

**Before.** "The parent reads the child state and renders it."

That sentence makes a supported read sound like the parent owns the child's
representation. It does not say whether the parent calls an accessor or reaches
into fields the child owns.

**After.** "The parent passes the Query Model to `Query.read`. The child-owned
accessor returns the public `AsyncData` value, which the parent renders without
inspecting the Query Model's fields."

A state boundary does not forbid every value from crossing it. It determines
who owns the representation and transitions. Name the accessor when it preserves
that boundary, and name the fields when code bypasses it.

## Make a large snippet point to its lesson

A short snippet should explain itself through names and structure. A larger
wiring example can contain several equally plausible places to look. Use sparse
comments to point at the architectural handoff, such as the line that lifts a
child Message or returns the initial Command. Do not narrate syntax the reader
can already see.

Keep the important operation visible. If `execute: fetchPosts` is the concept
being introduced, define `fetchPosts` in the snippet or inline its Effect. If an
init example teaches the transition from initial Model to loading Model, name
the Model first and then pass it to the loading operation. Nesting both phases in
one expression saves lines and hides the lesson.

## Link the complete application early

When a complete example application exists, a reader should not need to reach
the bottom of the guide to discover it. Put a callout near the top and say what
the application demonstrates. "See API Cache Query for a full app" is too terse.
"API Cache Query shows a Query loaded during init, a KeyedQuery loaded by id,
Subscription-driven refreshes, and Story and Scene tests" tells the reader why
to follow the link.

## The test

Would you say this sentence to a colleague at a whiteboard? If not, it is jargon
or hedging, and the version you would say is the one to write.
