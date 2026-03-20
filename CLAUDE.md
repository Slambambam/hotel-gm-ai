# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hotel General Manager AI — a multi-agent system (**V10 Stable**) that lets a hotel manager in Bansko, Bulgaria run all hotel operations via Telegram chat. Built on **n8n + LangChain + OpenAI + Redis + Google Sheets + SerpAPI + AviationStack**.

Architecture: **Hub-and-Spoke (Star Topology)**
- **Orchestrator:** Hotel Manager agent (GPT-4o) — intent recognition, routing, response synthesis
- **Sub-agents** (all GPT-4o-mini): Front Office, HR, Accounting, F&B, Housekeeping, Marketing
- **Direct tools on Orchestrator:** get_weather (all BG cities), road_conditions, flights_bulgaria
- **Shared infra:** Redis (chat memory, 10 msg window), Google Sheets (9 spreadsheets), Forecast_Tool, Forecast_Aggregated_Tool (aggregator.gs)
- **Interface:** Telegram Bot (text + voice transcription)
- **Scheduled:** Morning Brief (07:00), Night Audit (21:00)

## Key Files

| File | Purpose |
|------|---------|
| `Hotel General Manager Multi V10 Stable.json` | **CURRENT** production n8n workflow (42 nodes) |
| `Hotel General Manager Multi V9.json` | Previous version — before V10 fixes |
| `Hotel General Manager Multi V8.json` | Legacy — document processing base |
| `Hotel General Manager Multi Stable.json` | Legacy — scheduled reports base |
| `aggregator.gs` | Google Apps Script — aggregates forecast data for date ranges |
| `AI_Architecture_Audit_V10.md` | Full architecture audit for V10 |
| `ONBOARDING.md` | User guide for hotel managers |

**All active development happens on V10 Stable.**

## Working with the n8n Workflow JSON

The V10 JSON is the core artifact (~65KB, 42 nodes). When editing:

- **Node names are identifiers** — changing a node name breaks connections. Always update `connections` references if renaming.
- **Agent system prompts** are in `options.systemMessage` inside AI Agent nodes. **systemMessage does NOT support n8n expressions** — keep it static text only.
- **Date injection** — dates are injected via `chatInput` in Set nodes (Workflow Configuration1, Prepare Transcribed Text, Morning Report Config, Night Audit Config). Format: `[CONTEXT: Дата: dd.MM.yyyy, Ден: cccc, Час: HH:mm]`.
- **Tool bindings** are in the `connections` object — each agent lists its connected tools by node name.
- **Access Control** uses an exact array whitelist: `[userId].includes(Number($json.message.from.id))`. Never revert to substring matching.
- **sessionId** uses daily reset format: `chatId-yyyy-MM-dd` to prevent context pollution.

## Architecture Constraints

- **systemMessage does NOT support expressions** — never use `{{ }}`, `${}`, or `=` prefix in systemMessage fields. Inject dynamic values via chatInput Set nodes instead.
- **Housekeeping Manager** supports single-date queries only (no date ranges).
- **Marketing Manager** now has Google Hotels + Google Reviews via SerpAPI. Google Ads/Meta ROI still returns DATA_GAP.
- **Math Decoupling** — agents must NOT perform arithmetic. They extract raw numbers; calculations belong in system prompt formulas or Code nodes.
- **PDF processing** was removed in V9 (17 nodes deleted from V8).
- **Forecast_Aggregated_Tool** (via aggregator.gs) replaces N+1 Forecast_Tool calls for period queries. URL is hardcoded (n8n Cloud blocks $env).
- **Redis memory** limited to 10 messages per session to prevent context overflow.
- **Financial tools** (expenses, payments, bar income) limited to A1:M100 range.

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

## External APIs

| Service | Key Location | Free Tier |
|---------|-------------|-----------|
| SerpAPI (Google Hotels + Reviews) | Hardcoded in google_hotels_search, google_reviews_search nodes | 100 req/month |
| AviationStack (Flights) | Hardcoded in flights_bulgaria node | 100 req/month |
| OpenWeatherMap | n8n credentials | 1000 req/day |

## Language

- System prompts and agent responses are in **Bulgarian**.
- The codebase documentation is mixed Bulgarian/English.
- User queries can be Bulgarian or English; the system responds in Bulgarian.

## V10 Stable Changelog (2026-03-19)

**New features:**
- Competitor pricing via Google Hotels (SerpAPI)
- Google Reviews/ratings search (SerpAPI)
- Weather for all Bulgarian cities (dynamic $fromAI)
- Flight arrivals/departures SOF/BOJ/VAR (AviationStack)
- Road conditions (АПИ)

**Fixes from V9:**
- Date injection via chatInput (systemMessage doesn't support expressions)
- Forecast_Aggregated_Tool URL hardcoded (n8n Cloud blocks $env)
- Redis memory limited to 10 messages
- Financial tool ranges M500→M100
- Daily sessionId reset (chatId-yyyy-MM-dd)
- All V9.1 fixes preserved: retry logic, security blocks, tool error handling

**Still open:**
- Google Ads / Meta ROI not connected (P2)
- No input guardrails layer (rate limiting, PII filtering) (P2)
- No tool result caching (P2)
- road_conditions API needs live testing (P1)
- Audit Log headers need manual rename in Google Sheets (P1)

## Environment

- **n8n Cloud instance:** beway.app.n8n.cloud
- **Workflow ID:** tFWiP6guNncBliLB
- **Aggregator URL:** hardcoded in Forecast_Aggregated_Tool node
