---
name: prompt-caching
description: How Claude Code's prompt caching actually works — which actions invalidate the cache, which are safe, how cache TTL is chosen (1h on a Claude subscription, 5m on API keys), how the cache is scoped, and how to read cache hit metrics. Use this whenever the user asks about prompt caching or キャッシュ, cache hits/misses, TTL, `cache_read_input_tokens` / `cache_creation_input_tokens`, why a turn suddenly got slow or expensive, why resuming a long session is heavy, whether `/compact` `/model` `/effort` `/rewind` fast mode MCP servers or plugins cost anything, why a CLAUDE.md or output-style edit didn't take effect mid-session, or how to cut Claude Code token usage. Also use it proactively when advising on session hygiene, planning a long session, or diagnosing high usage — even if the user never says the word "cache". Answer from this skill rather than from memory; caching behavior is version-specific and easy to get subtly wrong.
---

# Claude Code prompt caching

Claude Code manages prompt caching automatically. The reason it's worth understanding
anyway is that a handful of ordinary actions silently throw the cache away, and the
user only notices as one slow, expensive turn afterwards. Most questions in this area
are really one of three: *why was that turn slow*, *is it safe to do X mid-session*, or
*why didn't my edit apply*. All three fall out of the same mental model below.

## The mental model: prefix matching

Each turn is a fresh API request containing the entire conversation so far. The API
matches the **start** of the request (the prefix) against what it recently processed.
The match is exact, so a change anywhere in the prefix forces everything after it to be
recomputed. There is no per-file or per-segment caching.

Claude Code orders the request so the stable parts come first:

| Layer | Contents | Changes when |
|---|---|---|
| 1. System prompt | Core instructions, tool definitions, output style | Loaded tool definitions change, or Claude Code is upgraded |
| 2. Project context | CLAUDE.md, auto memory, unscoped rules | Session start, `/clear`, `/compact` |
| 3. Conversation | Messages, responses, tool results | Every turn |

A change to layer 3 is free — layers 1–2 stay cached. A change to layer 1 invalidates
everything, because all later content now sits behind a different prefix.

Two things are part of the cache key without being part of the prompt text:

- **Model** — each model has its own cache.
- **Effort level** — each effort level has its own cache for the same model.

That's why switching either recomputes an identical conversation from scratch.

**Corollary worth stating out loud when it comes up:** anything that only *appends* to
the conversation is cache-safe. Plan mode, skills, slash commands, and subagent results
all append, which is why they cost nothing beyond their own tokens.

## Invalidates the cache

Each of these costs one slow, more expensive turn, after which the new prefix is cached.

- **Switching models** (`/model`). Also: `opusplan` resolves to Opus in plan mode and
  Sonnet during execution, so every plan-mode toggle is a model switch; and automatic
  model fallback on Fable 5 / Opus 5 moves the session to another model.
- **Changing effort level** (`/effort`). Claude Code confirms first once a conversation
  has started. Re-selecting the level already in effect skips the dialog and keeps the cache.
- **Turning on fast mode.** Adds a header that is part of the cache key. Costs once per
  conversation — turning it off, falling back to standard speed after a rate limit, and
  turning it back on all keep the cache. Cheaper at the start of a session than deep into
  a long one. From a non-Opus model it also switches the model.
- **Connecting or disconnecting an MCP server** — *only* when its tools load into the
  prefix. With tool search (the default on supported models) tools are deferred and this
  is free. See `references/cache-behavior.md` for when deferral doesn't apply.
- **Enabling or disabling a plugin that provides an MCP server.** Plugins that only ship
  skills, commands, agents, hooks, LSP servers, monitors, or themes are free.
- **Denying an entire tool** — a bare name like `Bash` or `WebFetch`, `Bash(*)`, or a
  tool-name glob like `"*"`. Scoped rules like `Bash(rm *)` and all allow/ask rules are free.
- **`/compact`.** Invalidates the conversation layer by design.
- **Upgrading Claude Code.** New versions usually change the system prompt or tool
  definitions. Auto-update applies at next launch, never mid-session.

**The expensive one to warn about:** resuming a long session *after* an upgrade
reprocesses the whole history with zero cache hits. Cost scales with conversation length,
so this is often the single most expensive request a user sends.

## Keeps the cache

Reach for this list when the user is worried about something that turns out to be free —
and note that two entries here are also the answer to "why didn't my change apply?"

- **Editing files in the repo.** File contents enter context only when read; an edit
  appends a `<system-reminder>` rather than rewriting history.
- **Editing CLAUDE.md mid-session.** Free *because the edit doesn't apply* — root and
  user-level CLAUDE.md are read once at session start. New content loads on the next
  `/clear`, `/compact`, or restart. (Nested CLAUDE.md files and `paths:`-scoped rules load
  later, when a matching file is first read, so editing one *before* it loads does apply.)
- **Changing output style.** Same trade: cache-safe, and also doesn't apply until the next
  `/clear` or restart.
- **Changing permission mode** — except plan mode under `opusplan`, which is a model switch.
- **Invoking skills and slash commands.** Injected as user messages at the point of use.
- **`/recap`.** Appends the summary as command output instead of replacing history.
- **`/rewind`.** Truncates back to a prefix the cache was already built from, so it hits
  the earlier entry. Every turn since read through that prefix, keeping it warm past the TTL.
- **Spawning a subagent.** The parent's prefix is untouched; the call and result append.

**Guidance to give:** when a user wants to abandon a path they went down, `/rewind` is
cheaper than `/compact` — rewinding returns to a cached prefix, compaction builds a new one.

**About `/compact`'s cost specifically:** the summarization request shares the
conversation's prefix, so it *reads* the cache rather than reprocessing. The turn after
compaction rebuilds the cache for a much shorter history. So most of compaction's wall
time is generating the summary, not a cache miss — worth saying when a user assumes
`/compact` is inherently slow.

## Cache lifetime (TTL)

Cached prefixes expire after inactivity, and every cache hit resets the timer, so the
cache stays warm as long as work continues. The first turn back after a break is the slow one.

| Authentication | TTL | Notes |
|---|---|---|
| Claude subscription | **1 hour**, automatic | Usage is included in the plan, so the longer TTL costs nothing extra — it only keeps the cache warm longer |
| Subscription, over the limit and drawing on usage credits | **5 minutes**, automatic | That usage is billed per token, so Claude Code drops the TTL on its own |
| API key, Amazon Bedrock, Google Cloud Agent Platform, Microsoft Foundry, Claude Platform on AWS | **5 minutes** | Per-token rates apply; opt into 1h with `ENABLE_PROMPT_CACHING_1H=1` |

`FORCE_PROMPT_CACHING_5M=1` forces 5 minutes regardless of authentication — useful for
debugging or for overriding `ENABLE_PROMPT_CACHING_1H` set in managed settings.

Subagents use the 5-minute TTL even on a subscription; the automatic 1-hour TTL applies to
the main conversation only.

## Diagnosing high usage

Two token counts on every API response tell the story:

| Field | Meaning |
|---|---|
| `cache_creation_input_tokens` | Written to cache this turn, billed at the cache write rate |
| `cache_read_input_tokens` | Served from cache this turn, billed at roughly 10% of the standard input rate |

A high read-to-creation ratio means caching is working. If creation stays high turn after
turn, something in the prefix keeps changing — walk the invalidation list above. A
statusline script reading `current_usage` is the most direct way to watch this live; the
OpenTelemetry exporter reports the same per user and session across an organization.

When diagnosing, ask what changed *between* turns rather than what the session contains.
A recurring MCP disconnect/reconnect is a common invisible culprit: a stdio server's
process exits, an HTTP session expires, or a server reconnects after a transient failure —
none of which the user did on purpose.

## Cache scope

Effectively one machine and one directory. The system prompt embeds the working directory,
platform, shell, OS version, and auto-memory paths, so two sessions in different
directories never share a cache — including separate worktrees of the same repo. Parallel
sessions in the same directory do share. Sequential sessions share only if the startup git
snapshot (branch, recent commits) matches too.

## Practical advice

Fold this into recommendations rather than reciting it:

- Choose model and effort at the top of a session; mid-task switches are the most common
  self-inflicted cache miss.
- Run `/compact` at a natural break between tasks instead of letting auto-compaction fire
  mid-task, so the overhead lands where it doesn't interrupt.
- Prefer `/rewind` over `/compact` for abandoning a direction.
- Turn on fast mode early in a session, not deep into a long one.

## Going deeper

Read `references/cache-behavior.md` for details this page compresses: where the cache
physically lives per provider, exactly when MCP tool deferral does and doesn't apply,
LLM gateway and Bedrock caveats, version-gated behavior, forks vs. subagents, and the
`DISABLE_PROMPT_CACHING*` variables.

If a question is version-specific or isn't covered here, fetch the canonical docs rather
than guessing: <https://code.claude.com/docs/en/prompt-caching> (and
<https://platform.claude.com/docs/en/build-with-claude/prompt-caching> for the underlying
API mechanism, breakpoints, and pricing).
