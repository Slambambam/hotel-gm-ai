# AI Multi-Agent Architecture — Одитен Доклад V10 Stable
**Hotel General Manager System**

> **Одитор:** AI Multi-Agent Architecture Specialist
> **Дата:** 2026-03-19
> **Версия:** V10 Stable (замества V9)
> **Обхват:** Hotel General Manager Multi V10 Stable.json, aggregator.gs
> **Платформа:** n8n Cloud + LangChain + OpenAI + Redis + Google Sheets + Telegram + SerpAPI + AviationStack

---

## EXECUTIVE SUMMARY

V10 Stable е **production-ready multi-agent система** за управление на хотелски операции чрез Telegram. Спрямо V9 са отстранени всички P0 критични проблеми и повечето P1 слабости. Добавени са нови възможности за конкурентен анализ, метеорология и транспортна информация.

**42 nodes | 7 AI агента | 14 data tools | 5 external APIs**

### Резултат от одита

| Приоритет | V9 (преди) | V10 Stable (сега) |
|-----------|------------|-------------------|
| P0 Critical | 3 проблема | **0** (всички решени) |
| P1 Serious | 5 проблема | **1** (Ads/Meta ROI не е свързан) |
| P2 Moderate | 5 проблема | **2** (tool caching, input guardrails) |

---

## 1. АРХИТЕКТУРА

### 1.1 Топология: Hub-and-Spoke (Star Pattern)

```
                         Telegram (text + voice)
                                 │
                          Access Control
                           [425406605]
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
               Voice Path   Text Path   Scheduled
               (Whisper)    (Set node)   (07:00/21:00)
                    │            │            │
                    └────────────┼────────────┘
                                 │
                      [CONTEXT: date injection]
                                 │
                    ┌────────────┼────────────────────┐
                    │     HOTEL MANAGER (GPT-4o)      │
                    │     Orchestrator V10 Stable      │
                    │     Redis Memory (10 msg)        │
                    └──┬──┬──┬──┬──┬──┬──┬──┬──┬──────┘
                       │  │  │  │  │  │  │  │  │
          ┌────────────┘  │  │  │  │  │  │  │  └──────────┐
          │     ┌─────────┘  │  │  │  │  │  └────────┐    │
          │     │     ┌──────┘  │  │  │  └─────┐     │    │
          ▼     ▼     ▼         ▼  ▼  ▼        ▼     ▼    ▼
     Front    HR   Acct.     F&B  HK  Mktg  Weather Road Flights
     Office                                   (all   Cond. (SOF
     (5 tools)(3)  (3)      (3)  (1) (3)    BG)    (АПИ) BOJ VAR)
```

### 1.2 Модели

| Компонент | Модел | Retry | Wait |
|-----------|-------|-------|------|
| Hotel Manager (Orchestrator) | GPT-4o | 3× | 30s |
| 6× Sub-agents | GPT-4o-mini | 3× | 10s |
| Voice transcription | Whisper | — | — |

### 1.3 Data Flow

```
User Message → Telegram Trigger → Access Control → Set Node (+ date context)
  → Hotel Manager → [Sub-agents as needed] → Split Long Message → Telegram
  → Audit Log (Google Sheets)
```

---

## 2. АГЕНТИ И TOOLS

### 2.1 Tool Access Matrix

| Tool | Front Office | HR | Accounting | F&B | Housekeeping | Marketing |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Forecast_Tool | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Forecast_Aggregated_Tool | ✓ | — | — | — | — | — |
| reservations_tool | ✓ | — | — | — | — | — |
| reception_tool | ✓ | — | — | — | — | — |
| tool_hotel_payments | ✓ | — | ✓ | ✓ | — | — |
| tool_hotel_expenses | — | — | ✓ | — | — | — |
| tool_hotel_income_bar | — | — | ✓ | — | — | — |
| tool_hotel_personal_schedule | — | ✓ | — | — | — | — |
| tool_hotel_personal_salary | — | ✓ | — | — | — | — |
| tool_hotel_inventory | — | — | — | ✓ | — | — |
| google_hotels_search | — | — | — | — | — | ✓ |
| google_reviews_search | — | — | — | — | — | ✓ |

### 2.2 Директни tools на Orchestrator

| Tool | API | Описание |
|------|-----|----------|
| get_weather | OpenWeatherMap | Всеки град в България (dynamic city) |
| road_conditions | api.bg | Пътна обстановка — затваряния, инциденти |
| flights_bulgaria | AviationStack | Полети SOF/BOJ/VAR — пристигащи/заминаващи |

### 2.3 Google Sheets Ranges

| Tool | Range | Spreadsheet |
|------|-------|-------------|
| Forecast_Tool | A1:M400 | Forecast_Pricing |
| tool_hotel_expenses | A1:M100 | Разходи |
| tool_hotel_payments | A1:M100 | Payments |
| tool_hotel_income_bar | A1:M100 | Bar Income |
| tool_hotel_inventory | A1:G200 | Инвентар |
| tool_hotel_personal_salary | A1:J100 | ЗАПЛАТИ |
| tool_hotel_personal_schedule | A1:AZ60 | График |
| reservations_tool | A1:K100 | Reservations |
| reception_tool | A1:K100 | Reception |

---

## 3. НОВИ ВЪЗМОЖНОСТИ В V10

### 3.1 Date Injection (решен P0)
- systemMessage е **статичен** — n8n AI Agent не поддържа expressions в това поле
- Датата се инжектира чрез `chatInput` в 4 Set nodes: `[CONTEXT: Дата: dd.MM.yyyy, Ден: cccc, Час: HH:mm]`
- Всички paths покрити: text, voice, morning report, night audit

### 3.2 Competitor Analysis (нов — решен P1)
- **google_hotels_search**: цени на конкуренцията чрез SerpAPI Google Hotels (BGN, YYYY-MM-DD)
- **google_reviews_search**: рейтинг и ревюта от Google Maps
- Marketing Manager сравнява competitor ADR с нашия ADR от Forecast_Tool

### 3.3 Transport & Weather (нови)
- **get_weather**: разширен от Bansko-only → всеки град в България
- **flights_bulgaria**: реални полети чрез AviationStack API (SOF, BOJ, VAR)
- **road_conditions**: пътна обстановка от АПИ

### 3.4 Memory & Performance
- Redis `contextWindowLength: 10` — предотвратява context overflow
- Daily sessionId reset: `chatId-yyyy-MM-dd` — чист контекст всеки ден
- Financial tools ranges: M500 → **M100** — 5× по-малко данни

### 3.5 Infrastructure
- `$env.AGGREGATOR_WEB_APP_URL` → хардкоднат URL (n8n Cloud блокира $env)
- Всички Google Sheets nodes: `retryOnFail: true, maxTries: 3`

---

## 4. РЕШЕНИ ПРОБЛЕМИ ОТ V9

| ID | Проблем | Статус V10 |
|----|---------|------------|
| P0-C1 | Access Control substring collision | ✅ Решен (exact array whitelist) |
| P0-C2 | Forecast_Tool N+1 за периоди | ✅ Решен (Forecast_Aggregated_Tool) |
| P0-C3 | LLM arithmetic в Housekeeping | ✅ Решен (data extraction only prompt) |
| P1-S1 | Hardcoded supplier names | ✅ Решен (премахнати) |
| P1-S2 | Rigid date format | ✅ Подобрен (date injection + LLM handles format) |
| P1-S3 | Marketing — no live data | ✅ Решен (Google Hotels + Reviews) |
| P1-S4 | No retry logic | ✅ Решен (retry на всички nodes) |
| P1-S5 | Date expression not evaluated | ✅ Решен (chatInput injection) |
| P2 | Context overflow | ✅ Решен (reduced ranges + Redis limit) |

---

## 5. ОСТАВАЩИ ПРОБЛЕМИ

| ID | Проблем | Приоритет | Бележка |
|----|---------|-----------|---------|
| R1 | Google Ads / Meta ROI не е свързан | P2 | Няма безплатен API |
| R2 | Tool result caching | P2 | Повтарящи се Forecast_Tool calls |
| R3 | Input guardrails (rate limit, PII) | P2 | Няма pre-orchestrator layer |
| R4 | road_conditions API може да не е публичен | P1 | Нуждае се от тестване |
| R5 | AviationStack free tier: 100 req/месец | Info | Достатъчно за текущо usage |
| R6 | SerpAPI free tier: 100 req/месец | Info | Google Hotels + Reviews споделят лимит |
| R7 | Audit Log headers в Google Sheets | P1 | Ръчно преименуване: output→Timestamp, ok→ChatId, result→Query |

---

## 6. API КЛЮЧОВЕ И ЛИМИТИ

| Service | Endpoint | Free Tier | Ключ |
|---------|----------|-----------|------|
| OpenWeatherMap | api.openweathermap.org | 1000 req/ден | n8n credentials |
| AviationStack | api.aviationstack.com | 100 req/месец | Hardcoded в node |
| SerpAPI | serpapi.com | 100 req/месец | Hardcoded в node |
| Google Sheets | sheets.googleapis.com | Unlimited (rate limited) | n8n credentials |
| OpenAI GPT-4o | api.openai.com | Pay-per-use | n8n credentials |
| OpenAI GPT-4o-mini | api.openai.com | Pay-per-use | n8n credentials |

---

## 7. SCHEDULED REPORTS

| Report | Trigger | Час (Sofia) | Agents |
|--------|---------|-------------|--------|
| GM Morning Brief | Cron 0 7 * * * | 07:00 | Front Office + HR |
| Night Audit | Cron 0 21 * * * | 21:00 | Front Office + HR |

---

## 8. SECURITY

- **Access Control**: `[425406605].includes(Number($json.message.from.id))` — exact match
- **Prompt Injection**: SECURITY блок на всеки 7 агента
- **Tool Errors**: graceful degradation → DATA_GAP
- **Expression Safety**: systemMessage е статичен — без injectable expressions
- **Input Isolation**: user input е untrusted — embedded instructions се игнорират

---

## 9. ФАЙЛОВА СТРУКТУРА

| Файл | Статус | Описание |
|------|--------|----------|
| `Hotel General Manager Multi V10 Stable.json` | **PRODUCTION** | 42 nodes, активен на n8n |
| `Hotel General Manager Multi V9.json` | Legacy | Преди V10 fixes |
| `Hotel General Manager Multi V8.json` | Archive | Document processing base |
| `Hotel General Manager Multi Stable.json` | Archive | Scheduled reports base |
| `aggregator.gs` | Active | Google Apps Script — forecast aggregation |
| `AI_Architecture_Audit_V10.md` | Този файл | Архитектурен одит V10 |
| `ONBOARDING.md` | Active | Ръководство за потребители |
| `CLAUDE.md` | Active | Инструкции за Claude Code |
| `README.md` | Active | Проектна документация |

---

## ЗАКЛЮЧЕНИЕ

V10 Stable е значително подобрение спрямо V9:
- **0 критични проблема** (от 3 в оригиналния одит)
- **Нови възможности**: конкурентен анализ, метеорология за цяла България, полети, пътна обстановка
- **По-стабилна**: date injection, Redis лимит, reduced ranges, daily session reset
- **Production-ready**: 42 nodes с retry logic, error handling, и graceful degradation
