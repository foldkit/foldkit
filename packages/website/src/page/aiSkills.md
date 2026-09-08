# Skills

## Foldkit Skills

Foldkit ships three agent skills in the repository. Claude Code installs them together as the `foldkit-skills` plugin. Codex, the ChatGPT desktop app, and OpenCode can load the same skill directories directly.

Each skill is a directory with a `SKILL.md` file. The file tells an agent when to use the skill and which workflow to follow. The optional `agents/openai.yaml` file supplies display metadata for Codex and the ChatGPT desktop app.

## Installation

### Claude Code

Add the Foldkit marketplace, then install the plugin:

```text
/plugin marketplace add foldkit/foldkit
```

```text
/plugin install foldkit-skills@foldkit
```

### Codex

Codex discovers repository skills in `.agents/skills/` from the current directory up to the repository root. First [vendor the Foldkit repository](/ai/overview#vendoring-the-foldkit-repository), then copy or symlink the directories from `repos/foldkit/skills/` into `.agents/skills/` in your project. Codex follows symlinked skill directories.

Invoke a skill by typing `$` and its name, such as `$generate-program`. Codex may also select a skill automatically when the task matches its description.

### ChatGPT Desktop

The ChatGPT desktop app uses the same `SKILL.md` format. The `agents/openai.yaml` file shipped with each Foldkit skill provides its display name, description, and default prompt in the Skills interface.

Open Skills in the app sidebar to view the skills available across your projects. See the official [ChatGPT and Codex skills guide](https://learn.chatgpt.com/docs/build-skills) for standalone skill setup.

### OpenCode

[OpenCode](https://opencode.ai/docs/skills/) discovers skills in `.opencode/skills/`, `.claude/skills/`, and `.agents/skills/`, walking from the current directory to the git root. Copy or symlink the Foldkit skill directories into one of those locations.

OpenCode reads the `SKILL.md` frontmatter directly and ignores `agents/openai.yaml`. It also reads the `AGENTS.md` that `create-foldkit-app` includes, which points it at `FOLDKIT.md`.

## Available Skills

### foldkit

```text
Claude Code: /foldkit-skills:foldkit
Codex: $foldkit
```

Loads the architectural framing for work in a Foldkit codebase. It directs the agent to the vendored source and examples, treats the Elm Architecture as a constraint, distinguishes stateful Submodels from stateless UI helpers, and checks the Foldkit and Effect stack before introducing another library.

Hosts that support implicit skill invocation can select it when the project or prompt contains Foldkit context.

### generate-program

```text
Claude Code: /foldkit-skills:generate-program
Codex: $generate-program
```

Builds an idiomatic Foldkit application from a natural-language description. The workflow clarifies domain behavior, studies matching examples, chooses the application structure and Foldkit UI components, verifies current APIs, writes tests, and runs the project's formatting, lint, typecheck, build, and browser checks.

### audit-program

```text
Claude Code: /foldkit-skills:audit-program
Codex: $audit-program
```

Audits an existing Foldkit application against the architecture and conventions. It reports findings under `BLOCKERS`, `QUALITY`, and `NICE-TO-HAVE`, then gives a verdict. The audit remains read-only until the user reviews the report and explicitly approves individual fixes or a batch.
