---
title: ByteRover Cwd Requirement For Repository
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-31T12:22:56.883Z'
updatedAt: '2026-03-31T12:22:56.883Z'
---
## Raw Concept
**Task:**
Record the repository-wide ByteRover cwd requirement as a reusable project fact

**Changes:**
- Added reusable fact for mandatory ByteRover cwd parameter
- Linked the requirement to global-mode server behavior

**Flow:**
need ByteRover operation -> include explicit repository cwd -> execute operation

**Timestamp:** 2026-03-31

## Narrative
### Structure
This fact entry captures a stable operational requirement that applies across agent workflows in the repository. It is intended for quick recall when tools are invoked.

### Dependencies
Relevant only in this environment configuration where ByteRover MCP runs in global mode.

### Highlights
The explicit cwd argument is required for correct repository targeting during ByteRover operations.

## Facts
- **repository_byterover_cwd**: For ChatBot-Oficial, ByteRover MCP calls must pass cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'. [project]
- **repository_byterover_mode_reason**: The reason is that the ByteRover MCP server runs in global mode in this environment. [environment]
