# Core Concepts Narrative Redesign

## Problem

The core concepts pages read as isolated reference entries rather than a guided tutorial. Pages end abruptly with no connective tissue. The foundation pages (Model, Messages, Update) are too thin to teach the paradigm to newcomers who don't already know Elm Architecture. The counter example is too simple to motivate why the architecture matters.

## Approach: The Evolving Counter

A single counter app grows across the core concepts section. Each new feature motivates the next concept by revealing a limitation in what the reader knows so far.

### Audience

Someone who doesn't know Elm Architecture. They might be coming from React, Vue, or vanilla JS. The pages need to teach the paradigm, not just the API.

### React Comparisons

Stay in callout boxes, not woven into prose. The core narrative should stand on its own. Callouts let React developers make the connection without alienating readers from other backgrounds.

### Narrative Arc

| Page            | Counter state       | Narrative beat                                                   |
| --------------- | ------------------- | ---------------------------------------------------------------- |
| Counter Example | Basic +/- counter   | "Here's a complete app. We'll break it down, then add features." |
| Model           | Same counter        | "Everything your app can be is one typed structure."             |
| Messages        | Same counter        | "How does state change? Messages are facts about what happened." |
| Update          | Same counter        | "Messages say what happened. Update decides what to do."         |
| View            | Same counter        | "The model is truth. The view reflects it."                      |
| Commands        | + delayed reset     | "What if update needs a side effect? Commands."                  |
| Subscriptions   | + auto-count toggle | "Commands are one-shot. What about ongoing streams?"             |
| Init            | + loads saved count | "Where does the first model come from?"                          |

Pages after Init (Task, Running Your App, Resources, Managed Resources, Error View, Slow View Warning, View Memoization) are reference-oriented and use their own examples. They don't need the counter narrative.

### Transition Text

Every page gets a transition paragraph at the bottom: 1-2 sentences that name what the reader just learned, identify the limitation, and point to the next concept. These sit above the existing next/prev page navigation.

## Per-Page Design

### Counter Example

**Current:** Two paragraphs, one code block. Drops off a cliff.

**Changes:**

- Reframe opening: "Every Foldkit app is built from the same four pieces: a Model, Messages, an Update function, and a View."
- After code block, add framing paragraph: "Don't worry about understanding every line. The next four pages break this apart piece by piece. After that, we'll add new features — a delayed reset, auto-counting, loading saved state — and each one introduces a new concept."
- Transition: "Let's start with the Model — the single data structure that holds everything your application can be."

### Model

**Current:** One paragraph, counter model snippet, one callout. Thin.

**Changes:**

- Keep opening paragraph but tighten — focus on "entire app state is one typed structure," defer Schema details.
- After code block, add paragraph: "Why not a plain TypeScript type?" Schema gives you constructors that validate at boundaries. As the app grows, Schema keeps impossible states out.
- Add second snippet previewing the model after we add auto-count: `S.Struct({ count: S.Number, isAutoCount: S.Boolean })`. Shows Schema doing more than wrapping a number, plants seeds for later.
- Keep callout ("One state tree, not many").
- Transition: "The model captures what your app is at any moment. But how does it change? In Foldkit, every change starts with a Message."

### Messages

**Current:** One paragraph, counter messages snippet, one callout. Thin.

**Changes:**

- Keep opening paragraph ("what happened, not how to handle it").
- Add paragraph expanding on the distinction: "A message like PressedIncrement doesn't say 'add one to the count' — it says 'the user pressed increment.' The update function decides what that means. Maybe today it adds one. Maybe later it fetches from a server. The message stays the same."
- After code block, add paragraph on naming convention: verb-first, past-tense. Verb prefix as category marker (Pressed*, Updated*, Got\*).
- Brief paragraph on the `m()` helper — one sentence explaining it creates a tagged Schema type.
- Keep callout ("Actions without the boilerplate").
- Transition: "Messages describe what happened. But who decides what to do about it? That's the update function."

### Update

**Current:** One paragraph, counter update snippet. Very thin for the central concept.

**Changes:**

- Keep opening paragraph.
- Add paragraph on why pure matters: predictable, testable, no hidden state. Given the same model and message, you always get the same result.
- Add paragraph on exhaustive matching: "Add a new message, the compiler tells you everywhere you need to handle it. No forgotten cases, no default branches hiding bugs."
- Mention that update returns both a new model and commands (preview of Commands page). For the counter, commands array is empty — but that changes soon.
- Keep existing code block.
- Transition: "Update is pure — it can't make HTTP requests or set timers directly. So what happens when your app needs side effects? That's where commands come in."

### View

**Current:** Three sections (Overview, Typed HTML Helpers, Event Handling). Already decent.

**Changes:**

- Add brief opening connecting to the cycle: model changes, view runs, screen updates. The view is a pure function from Model to Html.
- Keep existing three sections and callout.
- Transition: "So far everything has been synchronous — the user clicks, update runs, view rerenders. But real apps need side effects. That's where commands come in."

### Commands

**Current:** Good. Has delayed reset and HTTP examples with callout.

**Changes:**

- Reframe opening to connect to the counter narrative: "What if we want the reset button to wait one second before clearing the count?"
- Keep existing code blocks and HTTP example.
- Keep callout ("Errors are tracked, not hidden").
- Transition: "Commands fire once and finish. But what about effects that run continuously — a timer that ticks every second, a WebSocket that stays open? For that, Foldkit has subscriptions."

### Subscriptions

**Current:** Uses a stopwatch example. Medium depth, good explanations.

**Changes:**

- Reframe the example as the counter's auto-count mode: an `isAutoCount` toggle that starts/stops a tick stream. Keeps the counter narrative alive instead of introducing a separate stopwatch.
- Keep the structural comparison explanation and lifecycle management prose.
- Keep references to websocket-chat and Typing Terminal.
- Transition: "You've now seen how state changes (update), how side effects work (commands), and how ongoing streams are managed (subscriptions). But where does the very first model come from? That's init."

### Init

**Current:** Two sections (Overview, Flags). Medium depth.

**Changes:**

- Reframe around the counter: "What if we want the counter to remember its value between page loads?" Motivates flags with localStorage.
- Keep existing code blocks and flags section.
- Transition: "You've now seen the full Foldkit architecture — Model, Messages, Update, View, Commands, Subscriptions, and Init. The remaining pages cover utilities, runtime setup, and advanced topics you'll reach for as your app grows."

### Task through View Memoization (7 pages)

**Changes:** Add light transition text at the bottom of each page leading to the next. No major content changes — these pages are already appropriately detailed for their reference-oriented role.

## New Snippets Needed

- Counter model preview with `isAutoCount` field (for Model page)
- Counter auto-count subscription example (for Subscriptions page, replacing stopwatch)
- Counter init with localStorage flags (for Init page)

## Out of Scope

- Reordering pages
- Changes to pages outside Core Concepts
- New callout boxes (beyond what's described above)
- Interactive embedded examples
