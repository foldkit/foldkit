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

## One concrete example beats three abstract clauses

**Before.** "An input the old page meant one way is reused for whatever now sits
in that position."

**After.** "Imagine the old page has an `<input name="email">` exactly where the
new build puts an `<input name="ssn">`."

## Say when you are describing a scenario

A colon leaves the reader working out whether what follows is a definition, a
restatement, or a hypothetical. "Imagine", "Say", or "Picture" removes the
ambiguity in one word.

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

## The test

Would you say this sentence to a colleague at a whiteboard? If not, it is jargon
or hedging, and the version you would say is the one to write.
