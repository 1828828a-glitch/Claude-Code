# Prompt caching: detailed behavior

Details that SKILL.md compresses. Read the section you need.

- [Where the cache lives](#where-the-cache-lives)
- [MCP servers and tool deferral](#mcp-servers-and-tool-deferral)
- [Plugins](#plugins)
- [Deny rules](#deny-rules)
- [Compaction internals](#compaction-internals)
- [Upgrades and resumed sessions](#upgrades-and-resumed-sessions)
- [Subagents vs. forks](#subagents-vs-forks)
- [Cache scope beyond the machine](#cache-scope-beyond-the-machine)
- [Disabling prompt caching](#disabling-prompt-caching)
- [Environment variable summary](#environment-variable-summary)

## Where the cache lives

Caching is server-side, in whichever infrastructure serves the model:

| Authentication | Cache location |
|---|---|
| API key, Claude subscription, Claude Platform on AWS | Anthropic's infrastructure, via the Claude API |
| Amazon Bedrock, Google Cloud's Agent Platform | The cloud provider's serving infrastructure |
| Microsoft Foundry | Depends on the deployment's hosting option — "Hosted on Azure" runs on Azure, "Hosted on Anthropic" on Anthropic's infrastructure |
| Custom `ANTHROPIC_BASE_URL` or LLM gateway | Wherever requests are forwarded; whether caching works at all depends on the gateway |

### Mid-conversation system context

Claude Code appends system context mid-conversation (file-change notices and similar).
As of **v2.1.211** this is cached on Amazon Bedrock and its Mantle endpoint, Google
Cloud's Agent Platform, and Microsoft Foundry the same way it is on the Claude API.
Before v2.1.211 those providers billed it as uncached input tokens on every request — a
plausible explanation if someone reports unexpectedly high input token counts on an
older version against one of those providers.

Through an LLM gateway or custom `ANTHROPIC_BASE_URL`, Claude Code marks the same block
for caching. If the gateway rejects the cache breakpoint on that block, Claude Code
retries the request without it and leaves that block uncached for the rest of the
conversation.

## MCP servers and tool deferral

Tool definitions sit in the system prompt layer, so the cache invalidates when the set of
tool definitions in the request changes between turns. Whether an MCP change does that
depends on how its tools are loaded:

**Deferred tools** (the default on supported models, via MCP tool search): a server
connecting, disconnecting, or changing its tool list only appends new content. Nothing
already cached is disturbed.

**Tools loaded into the prefix**: any change invalidates. This happens when:

- Tool search is unavailable or disabled — e.g. on Google Cloud's Agent Platform, or with
  a custom `ANTHROPIC_BASE_URL` gateway.
- A server or tool is marked `alwaysLoad`.
- Definitions are kept upfront by threshold-based loading.

When tools do load into the prefix, the most common invalidation isn't a deliberate
action — it's a server connecting or disconnecting on its own: a stdio server's process
exits, an HTTP session expires, a server reconnects automatically after a transient
failure, or a connected server pushes a dynamic tool update that changes its tool list.

Editing MCP config does not by itself change the cache. The new config takes effect only
after a restart, which is when servers actually connect or disconnect.

**The advisor tool is an exception in the other direction:** its definition sits *after*
the cache breakpoint, so toggling `/advisor` on or off keeps the cached prefix intact.

## Plugins

Plugins bundle several component types, and the cost depends on which ones the plugin
provides:

- **Free**: skills, commands, agents, hooks, LSP servers, monitors, themes. Anything they
  add is appended after the existing conversation, so the next request pays for the new
  content but reads everything before it from cache.
- **Not free**: a plugin that provides MCP servers. Enabling or disabling it follows the
  MCP rules above — cache survives if the tools are deferred, full re-read if they load
  into the prefix.

Plugin changes apply on `/reload-plugins` or a new session. The cost shows up on the first
turn after the reload, not when running `/plugin install`, `/plugin enable`, or
`/plugin disable`. As of **v2.1.163**, when a reload would trigger the full re-read,
`/reload-plugins` shows a warning and declines to apply it; pass `--force` to apply anyway.

Disabling a plugin enabled earlier in the same session restores the previous request
shape. If that older prefix is still within its TTL, the next request reads the older
cache entry instead of rebuilding.

## Deny rules

Adding a bare tool name like `Bash` or `WebFetch` as a deny rule removes that tool from
context entirely. Built-in tool definitions live in the system prompt layer, so adding or
removing such a rule mid-session invalidates the cache. This applies whether the change
comes through `/permissions` or a direct settings-file edit.

Only rules matching in the **tool-name position** have this effect:

| Rule | Effect on cache |
|---|---|
| `Bash`, `WebFetch` (bare name) | Invalidates |
| `Bash(*)` | Invalidates |
| `"*"` (tool-name glob) | Invalidates |
| `"mcp__*"` | Removes those tools, but keeps the cache when the matched tools are deferred (the default) — deferred definitions were never in the cached prefix |
| `Bash(rm *)` and other scoped denies | No effect — checked at call time |
| All allow and ask rules | No effect — checked at call time |

## Compaction internals

Compaction replaces message history with a summary, so the conversation layer necessarily
loses its prefix. Two details are easy to get wrong:

1. **The summarization request itself is cheap.** It's sent with the same system prompt,
   tools, and history as the conversation, plus a summarization instruction appended as a
   final user message. Sharing the prefix means it reads the existing cache rather than
   reprocessing the full history. Most of compaction's wall time is generating the
   summary.
2. **The turn after compaction is also cheap.** It rebuilds the conversation cache for
   the much shorter summary, so it is not the slow part.

Claude Code reuses the system prompt layer across compaction and reloads project context
from disk. That reload cache-hits only if CLAUDE.md and memory are unchanged since the
session started — which is exactly why a mid-session CLAUDE.md edit takes effect at
`/compact`.

## Upgrades and resumed sessions

A new Claude Code version typically changes the system prompt or tool definitions, so the
first request after an upgrade rebuilds the cache from the top. Auto-update downloads in
the background but applies at next launch, never mid-session, so this shows up as an
uncached first turn after restarting. `DISABLE_AUTOUPDATER=1` puts the timing under the
user's control.

Resuming a session after an upgrade reprocesses the entire conversation history with no
cache hits, since that history now sits behind a different system prompt. Cost scales with
conversation length, so the first turn back into a long resumed session can be the single
most expensive request in a workflow.

## Subagents vs. forks

**Subagents** start their own conversation with their own system prompt and tool set,
separate from the parent's. A subagent builds its own cache: no hits on its first call,
warming across its own turns. It uses the **5-minute TTL even on a subscription**, since
the automatic 1-hour TTL applies to the main conversation. The parent's cache is
unaffected — from the parent's side the call and result simply append.

**Forks** inherit the parent's system prompt, tools, and conversation history exactly, so
a fork's first request reads the parent's cache. The compaction summarization call uses
the same prefix-sharing trick.

## Cache scope beyond the machine

In Claude Code the cache is effectively scoped to one machine and directory, because the
system prompt embeds the working directory, platform, shell, OS version, and auto-memory
paths. Worktrees of the same repository each have their own working directory and so
never share.

- Parallel sessions in the same directory build matching prefixes and read each other's cache.
- Sequential sessions share the prefix only when the startup git snapshot matches, since
  the system prompt also captures branch and recent commits.

The underlying API cache is broader: isolated between organizations, and on some providers
between workspaces within an organization. Within those boundaries, any two requests with
the same model and prefix read the same cache.

For Agent SDK callers running fleets of automated processes, the per-machine sections of
the system prompt can be suppressed so the cache is shared across machines — see
"improve prompt caching across users and machines" in the Agent SDK docs on modifying
system prompts.

## Disabling prompt caching

Occasionally useful when debugging caching behavior with a specific model or provider.
Set any of these to `1`:

| Variable | Effect |
|---|---|
| `DISABLE_PROMPT_CACHING` | Disable for all models |
| `DISABLE_PROMPT_CACHING_HAIKU` | Haiku only |
| `DISABLE_PROMPT_CACHING_SONNET` | Sonnet only |
| `DISABLE_PROMPT_CACHING_OPUS` | Opus only |
| `DISABLE_PROMPT_CACHING_FABLE` | Fable only |

For organization-wide policy, put these or the TTL variables in the `env` block of managed
settings. For normal use, leave caching enabled — recommend disabling only for diagnosis.

## Environment variable summary

| Variable | Effect |
|---|---|
| `ENABLE_PROMPT_CACHING_1H=1` | Opt into the 1-hour TTL on API key / third-party providers |
| `FORCE_PROMPT_CACHING_5M=1` | Force the 5-minute TTL regardless of authentication; overrides `ENABLE_PROMPT_CACHING_1H` from managed settings |
| `DISABLE_PROMPT_CACHING[_MODEL]=1` | Disable caching entirely, optionally per model family |
| `DISABLE_AUTOUPDATER=1` | Control when upgrades — and their cache rebuild — apply |

## Amazon Bedrock caveats

On Bedrock, prompt caching support, minimum cacheable prefix length, and 1-hour TTL
availability all vary by model. If cache token counts stay at zero there, the first thing
to check is the supported models, regions, and limits table in the Amazon Bedrock
documentation rather than anything in Claude Code's configuration.

## Source

<https://code.claude.com/docs/en/prompt-caching>

Underlying API mechanism, cache breakpoints, and pricing:
<https://platform.claude.com/docs/en/build-with-claude/prompt-caching>

Design rationale for plan mode, deferred tool loading, and compaction:
"Lessons from building Claude Code: Prompt caching is everything"
(<https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything>)
