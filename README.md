# Hotel General Manager — AI Multi-Agent System

> **Production-ready AI управление на хотел** чрез Telegram, реализирано с n8n + LangChain + OpenAI + Redis + Google Sheets.

---

## Съдържание

- [Описание](#описание)
- [Архитектура](#архитектура)
- [Агенти и отговорности](#агенти-и-отговорности)
- [Технически стек](#технически-стек)
- [Изисквания](#изисквания)
- [Инсталация и настройка](#инсталация-и-настройка)
- [Google Sheets структура](#google-sheets-структура)
- [Environment Variables](#environment-variables)
- [Конфигурация на достъпа](#конфигурация-на-достъпа)
- [aggregator.gs деплоймент](#aggregatorks-деплоймент)
- [Употреба](#употреба)
- [Changelog](#changelog)
- [Roadmap](#roadmap)
- [License](#license)

---

## Описание

Системата позволява на хотелски мениджър да управлява всички операции чрез прост Telegram чат — текстови съобщения, гласови команди и PDF документи (фактури, стокови бележки).

**Какво прави системата:**
- Отговаря на въпроси за заетост, приходи, персонал, инвентар, housekeeping
- Генерира автоматичен сутрешен брифинг (07:00) и нощен одит (21:00)
- Обработва PDF фактури и стокови бележки и ги записва в Google Sheets
- Транскрибира гласови съобщения и ги обработва като текст
- Логва всички заявки за последващ анализ

---

## Архитектура

**Топология: Hub-and-Spoke (Star Pattern)**

```
                    ┌────────────────────────────────┐
                    │       TELEGRAM INTERFACE        │
                    │  Voice  /  Text  /  Document    │
                    └───────────────┬────────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │         ACCESS CONTROL          │
                    │   Whitelist: [userId, userId]   │
                    └───────────────┬────────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │  HOTEL MANAGER (Orchestrator)  │
                    │  GPT-4o  |  Redis Chat Memory  │
                    │  Intent Recognition + Routing  │
                    └──┬──────┬──────┬──────┬───────┘
                       │      │      │      │      │
          ┌────────────┘  ┌───┘  ┌───┘  ┌──┘  ┌───┘
          │               │      │      │     │
   ┌──────▼──┐  ┌─────────▼┐ ┌───▼──┐ ┌▼────┐ ┌▼─────────────┐
   │   HR    │  │  Front   │ │Mark- │ │Acct.│ │    F&B       │
   │ Manager │  │  Office  │ │eting │ │Mgr. │ │  Manager     │
   └─────────┘  │  Manager │ │ Mgr. │ └─────┘ └──────────────┘
                └──────────┘ └──────┘
                                            ┌──────────────────┐
                                            │  Housekeeping    │
                                            │    Manager       │
                                            └──────────────────┘

    Shared Infrastructure:
    ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Forecast_Tool  │  │  Google Sheets   │  │  Redis Memory    │
    │  (single date)  │  │  (8+ data tabs)  │  │  (chat context)  │
    └─────────────────┘  └──────────────────┘  └──────────────────┘
    ┌─────────────────┐
    │ Forecast_Aggr.  │
    │ (date ranges)   │
    └─────────────────┘

    Scheduled Automation:
    ┌────────────────────────┐    ┌────────────────────────┐
    │ Morning Report (07:00) │    │ Night Audit (21:00)    │
    └────────────────────────┘    └────────────────────────┘
```

---

## Агенти и отговорности

| Агент | Домейн | Инструменти |
|-------|--------|-------------|
| **Hotel Manager** | Оркестратор — разпознаване на намерение, рутиране, синтез на отговор | Всички под-агенти + get_weather + Forecast_Aggregated_Tool |
| **HR Manager** | Персонал: графици, смени, присъствие, заплати | tool_hotel_personal_schedule, tool_hotel_personal_salary, Forecast_Tool |
| **Front Office Manager** | Заетост, ADR, RevPAR, резервации, рецепция | Forecast_Tool, Forecast_Aggregated_Tool, reservations_tool, reception_tool |
| **Accounting Manager** | Разходи, фактури, плащания, приходи от бар | tool_hotel_expenses, tool_hotel_payments, tool_hotel_income_bar |
| **F&B Manager** | Инвентар, food cost, закуски | Forecast_Tool, tool_hotel_inventory, tool_hotel_payments |
| **Marketing Manager** | Репутация, кампании (DATA_GAP без live sources) | Forecast_Tool |
| **Housekeeping Manager** | Стаи, бельо (само единична дата) | Forecast_Tool |

### Специални режими

**GM MORNING BRIEF** — извика се с "сутрешен брифинг", "пълен статус за днес", "what matters today"
```
COMMERCIAL: заетост, ADR, RevPAR, пристигания/заминавания
OPERATIONS: закуски, натоварване на рецепция, OOS
FINANCE: плащания и разходи (ако има данни)
DATA GAPS: липсващи данни
ACTIONS BEFORE NOON: 1-3 приоритета
```

**EXCEPTION REPORT** — извика се с "проблеми", "рискове", "отклонения"
```
Ранжирани проблеми по оперативна тежест
Всеки проблем: какво е, бизнес въздействие, следваща стъпка
```

---

## Технически стек

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Workflow engine | [n8n](https://n8n.io) | >= 1.40 |
| AI framework | LangChain (n8n built-in) | latest |
| Orchestrator LLM | OpenAI GPT-4o | latest |
| Sub-agent LLM | OpenAI GPT-4o-mini | latest |
| Document processing | OpenAI GPT-4o-mini | latest |
| Chat memory | Redis | >= 7.0 |
| Data storage | Google Sheets | — |
| User interface | Telegram Bot | — |
| Forecast aggregation | Google Apps Script | — |

---

## Изисквания

### Задължителни акаунти и API ключове

- **OpenAI API** — GPT-4o и GPT-4o-mini достъп
- **Telegram Bot** — създаден чрез [@BotFather](https://t.me/BotFather)
- **Google Account** — с достъп до Google Sheets и Google Apps Script
- **Redis** — локален или cloud (Redis Cloud, Upstash)
- **n8n** — self-hosted или n8n Cloud

### Опционални

- **OpenWeatherMap API** — за времето в Банско (безплатен tier)

---

## Инсталация и настройка

### 1. n8n

```bash
# Self-hosted с Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=yourpassword \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Import workflow:**
1. Отвори n8n → `Workflows` → `Import from File`
2. Избери `Hotel General Manager Multi V9.json`
3. Конфигурирай credentials (виж стъпки по-долу)

### 2. OpenAI Credentials

1. n8n → `Settings` → `Credentials` → `Add Credential`
2. Избери `OpenAI API`
3. Въведи API Key от [platform.openai.com](https://platform.openai.com)
4. В workflow-а свържи `OpenAI Chat Model1` (GPT-4o) и `OpenAI Chat Model` (GPT-4o-mini) с credentials

### 3. Telegram Bot

```
1. Отвори @BotFather в Telegram
2. /newbot → въведи име → получи API Token
3. n8n → Credentials → Add → Telegram API → въведи токена
4. Свържи Telegram Trigger и Telegram nodes с credentials
5. Намери своя Telegram User ID чрез @userinfobot
```

### 4. Redis

```bash
# Локален Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Или Redis Cloud: https://redis.com/redis-enterprise-cloud/
```

**n8n Redis Credential:**
- Host: `localhost` (или cloud URL)
- Port: `6379`
- Password: (ако е зададена)

### 5. Google Sheets

1. n8n → `Credentials` → `Google Sheets OAuth2 API`
2. Следвай OAuth flow
3. Създай Google Sheets файлове (виж секцията по-долу)
4. Свържи всеки Google Sheets node с credentials и правилния Spreadsheet ID

### 6. OpenWeatherMap (опционален)

1. Регистрирай се на [openweathermap.org](https://openweathermap.org/api)
2. Вземи безплатен API Key
3. В `get_weather` node → замени `OPENWEATHER_API_KEY` с реалния ключ

---

## Google Sheets структура

Системата ползва следните Google Sheets файлове:

### Forecast_Pricing (main spreadsheet)
**Spreadsheet ID:** `1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0`

| Sheet | Описание | Колони |
|-------|----------|--------|
| `Интеграция на Excel за прогнозна заетост` | Прогнозни данни по дата | По дата, OOS, ADR, RevPAR, Леглодни, Заетост%, Начисления |
| `Logs` | Audit log за всички заявки | Timestamp, ChatId, Query, ResponseLength |

### График / ЗАПЛАТИ
**Spreadsheet ID:** `1_RI9HZbtljtGW5pyQNxmAqB0MyV3shEOCf3J99etyjU`

| Sheet | Описание |
|-------|----------|
| `График` | Работни графици на персонала |
| `ЗАПЛАТИ` | Заплати и длъжности |

### Разходи
**Spreadsheet ID:** `16hJSFzNAhKHUoTl_vSkpmfnJV8c-mamjIfZMqs8ZxGc`

| Sheet | Описание | Колони |
|-------|----------|--------|
| `Sheet1` | Фактури и разходи | Номер, Дата, Клиент, ЕИК, ИН по ДДС, Данъчна основа, ДДС, Общо, Метод на плащане, Срок на плащане, Вид на документ |

### Payments (Рецепция)
**Spreadsheet ID:** `1xwBhKHqhHrlw_sp2TYoeIhfmjstvKrI_HCoF2dpcc20`

### Bar Income
**Spreadsheet ID:** `1PSQc5NDAn0eQu0ZFY9c6oHG483ed05tjZF8EteVCyMk`

### Инвентар
**Spreadsheet ID:** `11tLNM8Uf4B_y24oDfD0MuXY7PO8EpDoZQgwgcC3Zlrk`

| Sheet | Колони |
|-------|--------|
| `Inventory` | Артикул, Категория, Количество, Единица, Последна доставка |

---

## Environment Variables

Настрой следните environment variables в n8n (`Settings` → `n8n Environment Variables`):

```bash
# Задължителни
AGGREGATOR_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Опционални — ако ползваш .env файл за n8n
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=...
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Конфигурация на достъпа

Системата използва **whitelist-базиран Access Control**. Само оторизирани Telegram User ID-та могат да взаимодействат с бота.

### Намиране на Telegram User ID

```
1. Изпрати съобщение на @userinfobot в Telegram
2. Получаваш: Your user ID is: XXXXXXXXX
```

### Добавяне на оторизирани потребители

1. Отвори V9 workflow в n8n
2. Намери нода `Access Control`
3. В condition Expression промени масива:

```javascript
// Текущо (един потребител):
[425406605].includes(Number($json.message.from.id))

// С допълнителни потребители:
[425406605, 987654321, 111222333].includes(Number($json.message.from.id))
```

При неоторизиран достъп: потребителят получава "⛔ Нямате достъп до тази система."

---

## aggregator.gs деплоймент

`aggregator.gs` е Google Apps Script, който агрегира forecast данни за периоди (вместо 30+ отделни заявки).

### Стъпки за деплоймент

1. Отвори [script.google.com](https://script.google.com)
2. `New Project` → Paste съдържанието на `aggregator.gs`
3. Провери Spreadsheet ID на ред 15:
   ```javascript
   var ss = SpreadsheetApp.openById("1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0");
   ```
4. `Deploy` → `New Deployment` → `Web App`
   - Execute as: **Me**
   - Who has access: **Anyone** (или **Anyone with Google Account**)
5. Копирай Web App URL
6. В n8n: `Settings` → Environment Variables → `AGGREGATOR_WEB_APP_URL` = Web App URL

### Тестване

```bash
curl "YOUR_WEB_APP_URL?start=01%20Mar%202026&end=31%20Mar%202026"
# Очакван отговор:
# {"total_accruals":45230,"avg_occupancy":"78.5","avg_adr":"125.30","total_nights":970,"days_count":31,"oos_count":3}
```

---

## Употреба

### Примерни заявки

```
# Оперативен статус
"Пълен статус за днес"
"Сутрешен брифинг"
"Какво е важно днес?"

# Заетост
"Каква е заетостта за 15 март?"
"Средна заетост за март 2026"
"RevPAR тази седмица"

# Персонал
"Кой е на смяна днес?"
"График за тази седмица"
"Колко служители имаме?"

# Финанси
"Разходи за февруари"
"Неплатени фактури"
"Приходи от бар вчера"

# Housekeeping
"Колко бельо трябва за днес?"
"OOS стаи"

# Документи (изпрати PDF)
[PDF Фактура] → автоматично извлича и записва в Google Sheets
[PDF Стокова бележка] → автоматично извлича инвентар
```

### Автоматични отчети

| Отчет | Час | Съдържание |
|-------|-----|------------|
| Morning Brief | 07:00 всеки ден | Commercial + Operations + Finance + Actions |
| Night Audit | 21:00 всеки ден | Ключови показатели за изминалия ден |

---

## Changelog

### V9 (2026-03-18) — Current

**Security Fixes:**
- `ACCESS CONTROL FIX` — Сменен от substring match към exact array whitelist. Предотвратява неоторизиран достъп чрез userId collision

**New Features (merged from Stable):**
- `HOUSEKEEPING MANAGER` — Нов агент за статус на стаи и нужди от бельо
- `MORNING REPORT TRIGGER` — Автоматичен сутрешен брифинг (07:00)
- `NIGHT AUDIT TRIGGER` — Автоматичен нощен одит (21:00)
- `AUDIT LOG` — Логване на всички заявки в Google Sheets

**Performance Fixes:**
- `FORECAST AGGREGATED TOOL` — Нов инструмент за периодни заявки чрез aggregator.gs. Намалява API calls от 30+ на 1 за месечни справки

**Reliability Fixes:**
- `MATH DECOUPLING` — Housekeeping Manager вече само извлича данни; не изчислява. Аритметиката е преместена в системния промпт (НИКОГА не изчислявай)
- `SCHEDULED PATH FIX` — Split Long Message поддържа scheduled triggers без Telegram Trigger1 в контекста

### V8

- Document processing: PDF Invoice и PDF Stock Receipt
- Structured output parsing с JSON Schema validation
- Duplicate invoice check преди запис

### Stable

- Housekeeping Manager
- Morning/Night scheduled reports
- Audit Log
- Tool name typos (fixed in V9)

---

## Roadmap

### Приоритет 1 (краткосрочно)
- [ ] Retry logic за Google Sheets API (rate limit 429 handling)
- [ ] Date Normalization нод за flexible date input
- [ ] Dynamic Supplier Registry от Google Sheets

### Приоритет 2 (средносрочно)
- [ ] Redis Tool Result Caching (TTL 1h) — 40-60% намаление на API calls
- [ ] Input Guardrails Layer (max length, prompt injection detection)
- [ ] Structured logging с performance metrics (latency, token count)
- [ ] Rate limiting на Telegram input (max 10 req/min per chatId)

### Приоритет 3 (дългосрочно)
- [ ] Marketing Manager live integrations (Booking.com API, Google My Business)
- [ ] Standardized Agent Handoff Protocol с JSON Schema validation
- [ ] Weekly cost report (tokens × price)
- [ ] Multi-hotel support с tenant isolation

---

## Файлова структура

```
GM/
├── Hotel General Manager Multi V9.json    # CURRENT — Production workflow
├── Hotel General Manager Multi V8.json    # Legacy — Document processing base
├── Hotel General Manager Multi Stable.json # Legacy — Scheduled reports base
├── aggregator.gs                           # Google Apps Script за forecast aggregation
├── AI_Architecture_Audit_Full.md          # Пълен архитектурен одит (2026-03-18)
├── System_Audit_Report.md                 # Предишен частичен одит
└── README.md                              # Тази документация
```

---

## License

MIT License — свободно използване, модификация и разпространение.

---

*Разработен за хотел в Банско, България. Powered by n8n + OpenAI + LangChain.*
