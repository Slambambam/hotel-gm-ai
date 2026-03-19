# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hotel General Manager AI — a multi-agent system (currently V9) that lets a hotel manager in Bansko, Bulgaria run all hotel operations via Telegram chat. Built on **n8n + LangChain + OpenAI + Redis + Google Sheets**.

Architecture: **Hub-and-Spoke (Star Topology)**
- **Orchestrator:** Hotel Manager agent (GPT-4o) — intent recognition, routing, response synthesis
- **Sub-agents** (all GPT-4o-mini): Front Office, HR, Accounting, F&B, Housekeeping, Marketing
- **Shared infra:** Redis (chat memory per chatId), Google Sheets (6 spreadsheets), Forecast_Tool, Forecast_Aggregated_Tool (aggregator.gs)
- **Interface:** Telegram Bot (text + voice transcription)
- **Scheduled:** Morning Brief (07:00), Night Audit (21:00)

## Key Files

| File | Purpose |
|------|---------|
| `Hotel General Manager Multi V9.json` | **CURRENT** production n8n workflow |
| `Hotel General Manager Multi V8.json` | Legacy — document processing base |
| `Hotel General Manager Multi Stable.json` | Legacy — scheduled reports base |
| `aggregator.gs` | Google Apps Script — aggregates forecast data for date ranges (deployed as Web App) |

V8 and Stable are kept for reference. **All active development happens on V9.**

## Working with the n8n Workflow JSON

The V9 JSON is the core artifact (~58KB). It contains all n8n nodes, connections, agent prompts, and tool configurations. When editing:

- **Node names are identifiers** — changing a node name breaks connections. Always update `connections` references if renaming.
- **Agent system prompts** are embedded inside AI Agent nodes as the `text` field under `promptType: "define"`.
- **Tool bindings** are in the `connections` object — each agent lists its connected tools by node name.
- **Access Control** uses an exact array whitelist: `[userId].includes(Number($json.message.from.id))`. Never revert to substring matching.
- **Date format** expected by Forecast_Tool: `"15 Mar 2026 (Saturday)"` — the expression in the workflow generates this from `$now`.

## Architecture Constraints

- **Housekeeping Manager** supports single-date queries only (no date ranges).
- **Marketing Manager** has no live data sources (Booking.com, Google Reviews) — returns DATA_GAP markers.
- **Math Decoupling** — agents must NOT perform arithmetic. They extract raw numbers; calculations belong in system prompt formulas or Code nodes.
- **PDF processing** was removed in V9 (17 nodes deleted from V8).
- **Forecast_Aggregated_Tool** (via aggregator.gs) replaces N+1 Forecast_Tool calls for period queries. The aggregator expects query params `?start=01%20Mar%202026&end=31%20Mar%202026`.

## Google Sheets Spreadsheet IDs

| Spreadsheet | ID |
|-------------|-----|
| Forecast_Pricing (main) | `1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0` |
| График / ЗАПЛАТИ | `1_RI9HZbtljtGW5pyQNxmAqB0MyV3shEOCf3J99etyjU` |
| Разходи (Expenses) | `16hJSFzNAhKHUoTl_vSkpmfnJV8c-mamjIfZMqs8ZxGc` |
| Payments (Reception) | `1xwBhKHqhHrlw_sp2TYoeIhfmjstvKrI_HCoF2dpcc20` |
| Bar Income | `1PSQc5NDAn0eQu0ZFY9c6oHG483ed05tjZF8EteVCyMk` |
| Инвентар (Inventory) | `11tLNM8Uf4B_y24oDfD0MuXY7PO8EpDoZQgwgcC3Zlrk` |
| Reservations | `1EVylj4JZSJTlOi0b4oVWgetsXuWs13WhxJh88IJfwi4` |
| Reception | `1Ef_eAOga0x8-JFkqiuEqwRyN6xm8JRnn_mk4xkKbRBw` |

## Language

- System prompts and agent responses are in **Bulgarian**.
- The codebase documentation is mixed Bulgarian/English.
- User queries can be Bulgarian or English; the system responds in Bulgarian.

## Known Issues & Roadmap Context

**Fixed in V9.1 (2026-03-19):**
- ~~No retry logic for Google Sheets API 429 errors~~ → retryOnFail on all 10 sheet nodes
- ~~No prompt injection protection~~ → SECURITY block on all 7 agents
- ~~No tool failure handling~~ → TOOL ERRORS block on all 7 agents
- ~~Hardcoded supplier names~~ → removed from V9 prompts
- ~~Orphan OpenAI Chat Model2~~ → removed

**Still open:**
- `$env.AGGREGATOR_WEB_APP_URL` does not work on n8n Cloud — needs hardcoded URL in Forecast_Aggregated_Tool node
- OpenAI TPM rate limit (30K for GPT-4o Tier 1) — causes failures on rapid queries; retry mitigates but upgrade recommended
- No input guardrails layer (rate limiting, PII filtering) before the orchestrator (P2)
- No tool result caching (P2)

## Environment

- **n8n Cloud instance:** beway.app.n8n.cloud
- **Workflow ID:** tFWiP6guNncBliLB
- Required env var: `AGGREGATOR_WEB_APP_URL` — points to deployed aggregator.gs Web App
