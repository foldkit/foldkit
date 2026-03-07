# Core Concepts Narrative Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the core concepts docs from isolated reference pages into a guided tutorial with an evolving counter example and narrative transitions.

**Architecture:** Edit prose in 15 page files under `packages/website/src/page/core/`. Create 2 new snippet files under `packages/website/src/snippet/` and register them in the snippet index. The subscription page gets a reframed snippet (auto-count counter instead of stopwatch). No structural changes to the site — just prose and snippets.

**Tech Stack:** TypeScript, Foldkit HTML helpers (`para`, `callout`, `inlineCode`, `link`, `strong`, `em`), Effect Schema, Foldkit subscription/command APIs.

**Design doc:** `docs/plans/2026-03-06-core-concepts-narrative-design.md`

---

### Task 1: Counter Example page — reframe opening and add walkthrough framing

**Files:**
- Modify: `packages/website/src/page/core/counterExample.ts`

**Step 1: Edit the opening paragraphs**

Replace the two existing `para()` calls (lines 29-41) with:

```ts
para(
  'Every Foldkit app is built from the same four pieces: a ',
  strong([], ['Model']),
  ' (application state), ',
  strong([], ['Messages']),
  ' (events that can happen), an ',
  strong([], ['Update']),
  ' function (state transitions), and a ',
  strong([], ['View']),
  ' (rendering).',
),
para(
  "Here's a complete counter application that puts all four together.",
),
```

**Step 2: Add framing paragraph after the code block**

After the `highlightedCodeBlock(...)` call, before the closing `]`, add:

```ts
para(
  "Don't worry about understanding every line yet. The next four pages break this code apart piece by piece. After that, we'll add new features to the counter — a delayed reset, auto-counting, loading saved state — and each one will introduce a new concept.",
),
para(
  "Let's start with the Model — the single data structure that holds everything your application can be.",
),
```

**Step 3: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```
docs(website): reframe counter example page with walkthrough framing
```

---

### Task 2: Model page — expand prose and add preview snippet

**Files:**
- Modify: `packages/website/src/page/core/model.ts`
- Create: `packages/website/src/snippet/counterModelPreview.ts`
- Modify: `packages/website/src/snippet/index.ts`

**Step 1: Create the preview snippet**

Create `packages/website/src/snippet/counterModelPreview.ts`:

```ts
import { Schema as S } from 'effect'

// Later, when the counter gains auto-counting,
// the model grows to hold new state:

const Model = S.Struct({
  count: S.Number,
  isAutoCount: S.Boolean,
})
type Model = typeof Model.Type
```

**Step 2: Register the snippet in index.ts**

Add to `packages/website/src/snippet/index.ts` (after the `counterModel` entries):

```ts
export { default as counterModelPreviewRaw } from './counterModelPreview.ts?raw'
export { default as counterModelPreviewHighlighted } from './counterModelPreview.ts?highlighted'
```

**Step 3: Edit the Model page prose**

Replace the full view function body in `packages/website/src/page/core/model.ts` with updated prose:

Opening paragraph — tighten to focus on the key idea:
```ts
para(
  'The Model represents your entire application state in a single, immutable data structure defined with ',
  link(Link.effectSchema, 'Effect Schema'),
  '. Everything your app can be at any moment lives here — not scattered across components, not split between local and global state.',
),
```

After the existing counter model code block, add explanatory prose:
```ts
para(
  'Why use Schema instead of a plain TypeScript type? Schema gives you a callable constructor that validates at the boundary — when data enters your app from localStorage, a WebSocket, or a URL, Schema ensures it matches the shape you declared. As your app grows, this prevents impossible states from sneaking into your model.',
),
```

Add a paragraph introducing the preview snippet:
```ts
para(
  'The counter starts with a simple number, but models grow with your app. When we add auto-counting later, the model will expand:',
),
```

Then the preview code block:
```ts
highlightedCodeBlock(
  div(
    [
      Class('text-sm'),
      InnerHTML(Snippets.counterModelPreviewHighlighted),
    ],
    [],
  ),
  Snippets.counterModelPreviewRaw,
  'Copy expanded model example to clipboard',
  model,
  'mb-8',
),
```

Keep the existing callout.

Add transition:
```ts
para(
  'The model captures what your app ',
  em([], ['is']),
  ' at any moment. But how does it change? In Foldkit, every change starts with a Message — a fact about something that happened.',
),
```

Note: Add `em` to the html import if not already present.

**Step 4: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 5: Commit**

```
docs(website): expand model page with Schema motivation and preview snippet
```

---

### Task 3: Messages page — expand prose with naming conventions and m() explanation

**Files:**
- Modify: `packages/website/src/page/core/messages.ts`

**Step 1: Edit the Messages page prose**

After the existing opening paragraph (the "what happened, not how to handle it" one), add:

```ts
para(
  'This distinction matters more than it sounds. A message like ',
  inlineCode('PressedIncrement'),
  " doesn't say ",
  em([], ["'add one to the count'"]),
  " — it says ",
  em([], ["'the user pressed the increment button.'"]),
  ' The update function decides what that means. Maybe today it adds one. Maybe tomorrow it fetches a new count from a server. The message stays the same.',
),
```

After the existing code block, add:

```ts
para(
  'Messages follow a verb-first, past-tense naming convention: ',
  inlineCode('PressedIncrement'),
  ', not ',
  inlineCode('Increment'),
  ' or ',
  inlineCode('ADD_COUNT'),
  '. The verb prefix acts as a category marker — ',
  inlineCode('Pressed*'),
  ' for button clicks, ',
  inlineCode('Updated*'),
  ' for input changes, ',
  inlineCode('Got*'),
  ' for data arriving from a server or subscription.',
),
para(
  'The ',
  inlineCode('m()'),
  ' helper creates a tagged Schema type with a callable constructor. ',
  inlineCode("m('PressedIncrement')"),
  ' gives you a type you can pattern match on and a function you can call to create instances — ',
  inlineCode('PressedIncrement()'),
  '.',
),
```

Note: Add `inlineCode` and `em` to the prose imports if not already present.

Add transition after the callout:
```ts
para(
  "Messages describe what happened. But who decides what to do about it? That's the update function — the single place where your application's state transitions live.",
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): expand messages page with naming conventions and m() explanation
```

---

### Task 4: Update page — expand with pure functions, exhaustive matching, and commands preview

**Files:**
- Modify: `packages/website/src/page/core/update.ts`

**Step 1: Edit the Update page prose**

After the opening paragraph ("heart of your application logic"), add:

```ts
para(
  'Pure means predictable: given the same model and the same message, update always returns the same result. No hidden state, no ambient mutation, no surprises. This makes every state transition easy to reason about and trivial to test — pass in a model and a message, assert on the output.',
),
```

After the Effect.Match paragraph, add:

```ts
para(
  "Add a new message to your app and forget to handle it here? The compiler tells you. There are no forgotten cases, no ",
  inlineCode('default'),
  ' branches silently swallowing new messages. Every message gets an explicit handler.',
),
```

After the code block, add:

```ts
para(
  'Notice that update returns a tuple: the new model ',
  em([], ['and']),
  ' an array of commands. Commands represent side effects — HTTP requests, timers, browser API calls. For the counter, the commands array is always empty. But when we add a delayed reset on the next page, that will change.',
),
```

Note: Add `em` and `inlineCode` to imports if not already present.

Add transition:
```ts
para(
  "Update is pure — it can't make HTTP requests or set timers directly. So what happens when your app needs side effects? That's where commands come in.",
),
```

Wait — View comes before Commands in the page order. Fix the transition:
```ts
para(
  "Before we get to side effects, there's one more piece of the counter to understand: the view function, which turns your model into what the user sees on screen.",
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): expand update page with purity, exhaustive matching, and commands preview
```

---

### Task 5: View page — add cycle framing and transition

**Files:**
- Modify: `packages/website/src/page/core/view.ts`

**Step 1: Add transition paragraph at the end**

After the last `para()` in the view function (the event handling explanation), add:

```ts
para(
  "So far everything has been synchronous — the user clicks a button, update produces a new model, the view rerenders. But real apps need side effects: HTTP requests, timers, browser APIs. That's where commands come in.",
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): add transition text to view page
```

---

### Task 6: Commands page — connect to counter narrative and add transition

**Files:**
- Modify: `packages/website/src/page/core/commands.ts`

**Step 1: Edit the opening paragraph**

The existing opening is already good ("You're probably wondering how to handle side effects..."). It naturally follows the view page transition. No changes needed to the opening.

**Step 2: Add transition at the end**

After the callout, add:

```ts
para(
  "Commands fire once and produce a single message when they finish. But what about effects that run continuously — a timer that ticks every second, a WebSocket that stays open, keyboard input? For ongoing streams, Foldkit has subscriptions.",
),
```

**Step 3: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```
docs(website): add transition text to commands page
```

---

### Task 7: Subscriptions page — reframe as counter auto-count and add transition

**Files:**
- Create: `packages/website/src/snippet/counterAutoCount.ts`
- Modify: `packages/website/src/snippet/index.ts`
- Modify: `packages/website/src/page/core/subscriptions.ts`

**Step 1: Create the auto-count subscription snippet**

Create `packages/website/src/snippet/counterAutoCount.ts`:

```ts
import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { m } from 'foldkit/message'

// MESSAGE

const ClickedIncrement = m('ClickedIncrement')
const ToggledAutoCount = m('ToggledAutoCount')
const Ticked = m('Ticked')

const Message = S.Union(ClickedIncrement, ToggledAutoCount, Ticked)
type Message = typeof Message.Type

// MODEL

const Model = S.Struct({
  count: S.Number,
  isAutoCount: S.Boolean,
})

type Model = typeof Model.Type

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  tick: S.Struct({
    isAutoCount: S.Boolean,
  }),
})

const subscriptions = Subscription.makeSubscriptions(
  SubscriptionDeps,
)<Model, Message>({
  tick: {
    modelToDependencies: model => ({ isAutoCount: model.isAutoCount }),
    depsToStream: ({ isAutoCount }) =>
      Stream.when(
        Stream.tick(Duration.seconds(1)).pipe(
          Stream.map(() => Effect.succeed(Ticked())),
        ),
        () => isAutoCount,
      ),
  },
})
```

**Step 2: Register the snippet in index.ts**

Add to `packages/website/src/snippet/index.ts` (after the `stopwatchSubscription` entries):

```ts
export { default as counterAutoCountRaw } from './counterAutoCount.ts?raw'
export { default as counterAutoCountHighlighted } from './counterAutoCount.ts?highlighted'
```

**Step 3: Reframe the subscriptions page**

Update the prose to use the counter auto-count example. Key changes:

- Replace opening paragraphs to connect to the counter narrative: "Commands handle one-off side effects, but what about ongoing streams of events? What if we want our counter to tick automatically — incrementing once per second when the user toggles auto-count mode?"
- Replace the stopwatch snippet reference (`Snippets.stopwatchSubscription*`) with `Snippets.counterAutoCount*`
- Update the prose that references `isRunning` to reference `isAutoCount` instead
- Keep the structural comparison explanation, lifecycle management prose, and external example references
- Keep the Elm comparison paragraph at the end

Add transition after the Elm comparison paragraph:

```ts
para(
  "You've now seen how state changes flow through update, how one-off side effects work as commands, and how ongoing streams are managed with subscriptions. But where does the very first model come from? That's init.",
),
```

**Step 4: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 5: Commit**

```
docs(website): reframe subscriptions page with counter auto-count example
```

---

### Task 8: Init page — connect to counter narrative and add transition

**Files:**
- Modify: `packages/website/src/page/core/init.ts`

**Step 1: Add framing prose**

Before the existing opening paragraph, add:

```ts
para(
  "The counter works, but every time the user refreshes the page, the count resets to zero. What if we want to remember the last count? That's where init comes in — and where flags let you pass data into your app at startup.",
),
```

Add transition after the last code block:

```ts
para(
  "You've now seen the full Foldkit architecture: the Model holds your state, Messages describe events, Update transitions state, the View renders it, Commands handle one-off side effects, Subscriptions manage ongoing streams, and Init bootstraps everything. The remaining pages cover utilities, runtime configuration, and advanced topics you'll reach for as your app grows.",
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): connect init page to counter narrative and add summary transition
```

---

### Task 9: Add transition text to Task page

**Files:**
- Modify: `packages/website/src/page/core/task.ts`

**Step 1: Add transition at the end**

After the last code block, add:

```ts
para(
  'Now that you know how to write commands and use built-in tasks, the next step is wiring everything together into a running application.',
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): add transition text to task page
```

---

### Task 10: Add transition text to Running Your App page

**Files:**
- Modify: `packages/website/src/page/core/runningYourApp.ts`

**Step 1: Add transition at the end**

After the last paragraph about `browser` config, add:

```ts
para(
  'Most apps can start with just these runtime options. When your commands need long-lived browser singletons — like an AudioContext or a canvas rendering context — the next page covers how to provide them as resources.',
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): add transition text to running your app page
```

---

### Task 11: Add transition text to Resources page

**Files:**
- Modify: `packages/website/src/page/core/resources.ts`

**Step 1: Add transition at the end**

After the multiple resources code block, add:

```ts
para(
  'Resources live for the entire application. But what if a resource should only exist while the model is in a certain state — a camera stream during a video call, or a WebSocket while on a chat page? That\u2019s what managed resources are for.',
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): add transition text to resources page
```

---

### Task 12: Add transition text to Managed Resources page

**Files:**
- Modify: `packages/website/src/page/core/managedResources.ts`

**Step 1: Add transition at the end**

After the callout ("Resources vs Managed Resources"), add:

```ts
para(
  'With resources and managed resources, your app can work with any browser API. But what happens when something goes seriously wrong — an unrecoverable error in update, view, or a command? The next page covers error views.',
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): add transition text to managed resources page
```

---

### Task 13: Add transition text to Error View page

**Files:**
- Modify: `packages/website/src/page/core/errorView.ts`

**Step 1: Add transition at the end**

After the link to the error-view example, add:

```ts
para(
  'Error views handle the worst case. For the common case — keeping your app fast — the next two pages cover how Foldkit warns you about slow views during development and how to memoize expensive subtrees.',
),
```

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): add transition text to error view page
```

---

### Task 14: Add transition text to Slow View Warning page

**Files:**
- Modify: `packages/website/src/page/core/slowViewWarning.ts`

**Step 1: Add transition at the end**

After the paragraph about disabling the warning, add:

```ts
para(
  'When the warning fires, the most effective fix is usually memoization. The next page covers ',
  inlineCode('createLazy'),
  ' and ',
  inlineCode('createKeyedLazy'),
  ' — two tools for caching view subtrees so they skip both VNode construction and DOM diffing.',
),
```

Note: Ensure `inlineCode` is in the imports (it already is for this file).

**Step 2: Verify the site builds**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```
docs(website): add transition text to slow view warning page
```

---

### Task 15: Verify full build and visual review

**Files:** None (verification only)

**Step 1: Full build**

Run: `cd packages/website && pnpm build`
Expected: Build succeeds with no errors.

**Step 2: Dev server visual review**

Run: `cd packages/website && pnpm dev`

Navigate through all 15 core concepts pages in order. Verify:
- Each page has a transition paragraph at the bottom
- Counter Example, Model, Messages, Update, and Init reference the evolving counter
- Subscriptions page uses the auto-count snippet instead of stopwatch
- Model page shows the preview snippet
- No broken imports or missing snippets

**Step 3: Commit (if any fixes needed)**

```
fix(website): address visual review issues
```
