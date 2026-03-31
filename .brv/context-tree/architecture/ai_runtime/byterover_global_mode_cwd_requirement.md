---
title: ByteRover Global Mode Cwd Requirement
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-31T12:22:56.881Z'
updatedAt: '2026-03-31T12:22:56.881Z'
---
## Raw Concept
**Task:**
Document the ByteRover MCP global mode cwd requirement for ChatBot-Oficial agent operations

**Changes:**
- Recorded that ByteRover MCP runs in global mode in this environment
- Recorded mandatory cwd argument for all ByteRover query/retrieve and curate/store calls
- Captured that this is an environment mode detail rather than an installation bug by default
- Noted repository instruction updates in AGENTS.md, CLAUDE.md, and .github/copilot-instructions.md

**Files:**
- AGENTS.md
- CLAUDE.md
- .github/copilot-instructions.md

**Flow:**
agent invokes ByteRover query/retrieve or curate/store -> pass repository cwd explicitly -> MCP operates against ChatBot-Oficial workspace

**Timestamp:** 2026-03-31

**Patterns:**
- `cwd='C:\\Users\\Luisf\\Documents\\GITHUB\\ChatBot-Oficial'` - Required cwd argument value for ByteRover MCP calls in this environment

## Narrative
### Structure
This topic documents an environment-specific operational rule for ByteRover MCP usage in the ChatBot-Oficial repository. The rule applies to both retrieval and curation operations and is framed as a workspace targeting requirement rather than application logic.

### Dependencies
Applies whenever agents interact with the ByteRover MCP server from this repository environment. Depends on the server running in global mode, which requires explicit cwd scoping to the repository root.

### Highlights
As of 2026-03-31, all ByteRover query/retrieve and curate/store calls must include the ChatBot-Oficial repository cwd. Guidance was propagated into AGENTS.md, CLAUDE.md, and .github/copilot-instructions.md so future agents consistently apply the rule.

### Rules
Every ByteRover query/retrieve and curate/store call must pass cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'. This is not treated as an installation bug by default; it is an environment mode detail.

### Examples
Example requirement: when an agent calls ByteRover MCP for knowledge retrieval or storage, the call must target cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial' rather than relying on implicit workspace resolution.

## Facts
- **byterover_mcp_mode**: In this environment, the ByteRover MCP server runs in global mode. [environment]
- **byterover_required_cwd**: Every ByteRover query/retrieve and curate/store call must pass cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'. [convention]
- **byterover_global_mode_interpretation**: This behavior is treated as an environment mode detail, not an installation bug by default. [project]
- **byterover_instruction_updates**: Repository instructions were updated in AGENTS.md, CLAUDE.md, and .github/copilot-instructions.md to make the cwd requirement explicit for future agents. [project]
