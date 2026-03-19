# Hotel General Manager AI — Onboarding Guide

> Пълно ръководство за използване на AI системата за управление на хотела.
> **Версия:** V9 | **Локация:** Банско, България | **Интерфейс:** Telegram

---

## Съдържание

1. [Какво е тази система](#1-какво-е-тази-система)
2. [Как се използва](#2-как-се-използва)
3. [Всички възможни справки](#3-всички-възможни-справки)
4. [Автоматични отчети](#4-автоматични-отчети)
5. [Агенти и домейни](#5-агенти-и-домейни)
6. [Източници на данни](#6-източници-на-данни)
7. [Ограничения и DATA GAPS](#7-ограничения-и-data-gaps)
8. [Технически стек](#8-технически-стек)
9. [Настройка за нов потребител](#9-настройка-за-нов-потребител)
10. [Структура на Google Sheets](#10-структура-на-google-sheets)
11. [Инсталация от нулата](#11-инсталация-от-нулата)

---

## 1. Какво е тази система

**Hotel General Manager AI** е multi-agent система, която позволява на хотелски мениджър да управлява всички операции чрез прост Telegram чат — с текстови или гласови съобщения.

**Системата може да:**
- Отговаря на въпроси за заетост, приходи, персонал, инвентар и housekeeping
- Генерира автоматичен сутрешен брифинг в 07:00 и нощен одит в 21:00
- Транскрибира гласови съобщения и ги обработва като текст
- Логва всички заявки за последващ анализ

**Системата НЕ може да:**
- Обработва PDF документи (функционалността е премахната в V9)
- Достъпва Booking.com, Google Reviews или реклами в реално време
- Прави резервации или записи от самостоятелно — само чете данни

---

## 2. Как се използва

### Достъп

Само оторизирани Telegram User ID-та имат достъп. При неоторизиран опит:
> ⛔ Нямате достъп до тази система.

### Типове съобщения

| Тип | Как се изпраща | Обработка |
|-----|----------------|-----------|
| **Текст** | Пишеш директно в чата | Директно към Hotel Manager |
| **Глас** | Държиш микрофона в Telegram | Автоматично транскрибиране → Hotel Manager |

### Език

Системата отговаря на **български**. Въпросите могат да се задават на български или английски.

### Формат на датите

Системата разбира относителни и абсолютни дати:

```
"днес", "утре", "вчера"
"тази седмица", "следващата седмица"
"март 2026", "15 март", "15.03.2026"
```

---

## 3. Всички възможни справки

### Оперативен статус

| Заявка | Описание |
|--------|----------|
| `Сутрешен брифинг` | Пълен GM Morning Brief: Commercial + Operations + Finance + Actions |
| `Пълен статус за днес` | Същото като сутрешен брифинг |
| `Какво е важно днес?` | Същото като сутрешен брифинг |
| `Проблеми и рискове` | Exception Report — ранжирани отклонения по тежест |
| `Отклонения за днес` | Exception Report |

---

### Заетост и приходи (Front Office)

| Заявка | Описание |
|--------|----------|
| `Каква е заетостта за [дата]?` | Заетост % за конкретна дата |
| `Свободни стаи за [дата]` | Брой и вид налични стаи |
| `Пристигания за [дата]` | Брой очаквани check-in |
| `Заминавания за [дата]` | Брой очаквани check-out |
| `ADR за [дата/период]` | Среден приход на стая (Average Daily Rate) |
| `RevPAR за [дата/период]` | Приход на налична стая |
| `Средна заетост за [месец]` | Агрегирана заетост за периода |
| `Отчет за [месец] 2026` | Пълна справка за периода |
| `Тази седмица как изглежда?` | Заетост и приходи за текущата седмица |
| `Резервации за [дата]` | Активни резервации |
| `Натоварване на рецепцията` | Брой пристигания + заминавания = натоварване |
| `OOS стаи` | Out-of-Service стаи |

---

### Персонал (HR)

| Заявка | Описание |
|--------|----------|
| `Кой е на смяна днес?` | Служители на работа днес |
| `График за тази седмица` | Пълен седмичен график |
| `График за [дата]` | Кой работи на конкретна дата |
| `Колко служители имаме?` | Общ брой персонал |
| `Заплати на персонала` | Длъжности и заплащане |
| `Достатъчно ли е персоналът за [дата]?` | Сравнение персонал vs заетост |
| `Риск при недостиг на персонал` | Анализ на staffing риск спрямо прогнозна заетост |

---

### Финанси (Accounting)

| Заявка | Описание |
|--------|----------|
| `Разходи за [месец]` | Всички разходи за периода |
| `Разходи за [дата]` | Разходи за конкретен ден |
| `Плащания вчера` | Приходи от рецепция |
| `Плащания за [дата]` | Приходи от рецепция за конкретна дата |
| `Приходи от бара вчера` | Бар приходи |
| `Приходи от бара за [период]` | Бар приходи за период |
| `Неплатени фактури` | Фактури с изтекъл срок |
| `Финансов статус за днес` | Обобщение: разходи + плащания + бар |

> **Важно:** Системата чете данни от Google Sheets. Точността зависи от редовното попълване на таблиците.

---

### Храна и напитки / Инвентар (F&B)

| Заявка | Описание |
|--------|----------|
| `Закуски за днес` | Брой очаквани порции закуска |
| `Закуски за [дата]` | Прогноза за конкретна дата |
| `Инвентар` | Текущо състояние на склада |
| `Какво ни липсва?` | Артикули с ниско количество |
| `Food cost` | Приблизителен разход на храна |
| `Доставки` | Последни доставки от инвентара |

---

### Housekeeping

> **Ограничение:** Housekeeping Manager работи само за **единична дата**. Не поддържа периодни справки.

| Заявка | Описание |
|--------|----------|
| `Колко бельо трябва за днес?` | Чаршафи, калъфки, кърпи по стаи |
| `Бельо за [дата]` | Нужди от спално бельо за дата |
| `Статус на стаите` | Заети, свободни, OOS стаи |
| `Housekeeping за [дата]` | Пълна справка за почистване |

---

### Маркетинг

> **Ограничение:** Маркетинг агентът няма достъп до live данни от Booking.com, Google Reviews или рекламни платформи. Справките са ограничени.

| Заявка | Описание |
|--------|----------|
| `Маркетинг статус` | Обобщение (без live данни) |
| `Онлайн репутация` | DATA_GAP — няма live reviews |
| `Кампании` | DATA_GAP — няма live campaign data |

---

### Времето

| Заявка | Описание |
|--------|----------|
| `Времето в Банско` | Текущо/прогнозно време |
| `Ще вали ли утре?` | Прогноза за времето |

---

## 4. Автоматични отчети

Системата изпраща автоматични отчети в Telegram **без да се налага да питаш**.

### GM Morning Brief — всеки ден в 07:00

```
COMMERCIAL
  Заетост %, ADR, RevPAR, пристигания/заминавания

OPERATIONS
  Натоварване на рецепция, ключови staffing бележки

FINANCE
  Зарежда се при изрична заявка (пести API calls)

ACTIONS BEFORE NOON
  1–3 приоритетни действия за деня
```

### Night Audit — всеки ден в 21:00

```
Ключови показатели за изминалия ден:
  Реална заетост, приходи, отклонения
```

---

## 5. Агенти и домейни

Системата използва **Hub-and-Spoke** архитектура. Hotel Manager е централният оркестратор, който разпределя заявките към специализирани агенти.

```
                    ┌─────────────────────────────────┐
                    │        HOTEL MANAGER             │
                    │     Оркестратор (GPT-4o)         │
                    │   Intent → Route → Synthesize    │
                    └──┬──────┬──────┬──────┬─────────┘
                       │      │      │      │
          ┌────────────┘  ┌───┘  ┌───┘  ┌──┘
          │               │      │      │
   ┌──────▼──┐  ┌─────────▼┐  ┌──▼──┐ ┌▼──────────┐
   │   HR    │  │  Front   │  │Acct.│ │   F&B     │
   │ Manager │  │  Office  │  │ Mgr.│ │  Manager  │
   └─────────┘  │  Manager │  └─────┘ └───────────┘
                └──────────┘
                            ┌──────────────────────┐
                            │  Housekeeping Manager │
                            └──────────────────────┘
                            ┌──────────────────────┐
                            │  Marketing Manager   │
                            │  (без live данни)    │
                            └──────────────────────┘
```

| Агент | Домейн | Модел |
|-------|--------|-------|
| **Hotel Manager** | Оркестратор, intent recognition, синтез | GPT-4o |
| **Front Office Manager** | Заетост, ADR, RevPAR, резервации, рецепция | GPT-4o-mini |
| **HR Manager** | Графици, смени, заплати, staffing риск | GPT-4o-mini |
| **Accounting Manager** | Разходи, фактури, плащания, бар приходи | GPT-4o-mini |
| **F&B Manager** | Инвентар, закуски, food cost | GPT-4o-mini |
| **Housekeeping Manager** | Стаи, бельо (само единична дата) | GPT-4o-mini |
| **Marketing Manager** | Репутация, кампании (DATA_GAP) | GPT-4o-mini |

### Правила за извикване

- **Morning Brief / General status:** извиква само Front Office + HR. Останалите — само при изрична заявка.
- **Single-topic:** извиква само 1 агент.
- **Multi-topic:** извиква всички релевантни агенти в 1 отговор.
- **Finance/F&B/Marketing/Housekeeping:** извикват се САМО при изрична заявка.

---

## 6. Източници на данни

Всички данни идват от **Google Sheets** в реално време.

| Данни | Spreadsheet | Попълва се от |
|-------|-------------|---------------|
| Прогнозна заетост, ADR, RevPAR | Forecast_Pricing | Ръчно / автоматично |
| Работни графици | График / ЗАПЛАТИ | HR |
| Заплати | График / ЗАПЛАТИ | HR |
| Разходи и фактури | Разходи | Счетоводство |
| Плащания (рецепция) | Payments | Рецепция |
| Бар приходи | Bar Income | Бар |
| Инвентар | Инвентар | Склад |
| Audit Log (заявки) | Forecast_Pricing → Logs | Автоматично |

> **Принцип:** Системата е толкова точна, колкото са актуални данните в Google Sheets.

---

## 7. Ограничения и DATA GAPS

Когато данни липсват или не са налични, системата отговаря честно с `DATA_GAP` вместо да измисля.

| Домейн | Статус | Причина |
|--------|--------|---------|
| Заетост / ADR / RevPAR | ✅ Live | Google Sheets |
| Персонал / Графици | ✅ Live | Google Sheets |
| Разходи / Фактури | ✅ Live | Google Sheets |
| Плащания / Бар | ✅ Live | Google Sheets |
| Инвентар | ✅ Live | Google Sheets |
| PDF обработка | ❌ Премахнато в V9 | — |
| Booking.com reviews | ❌ DATA_GAP | Няма API интеграция |
| Google Reviews | ❌ DATA_GAP | Няма API интеграция |
| Рекламни кампании | ❌ DATA_GAP | Няма API интеграция |
| Конкурентни цени | ❌ DATA_GAP | Няма API интеграция |

---

## 8. Технически стек

| Компонент | Технология |
|-----------|-----------|
| Workflow engine | n8n Cloud (beway.app.n8n.cloud) |
| AI framework | LangChain (n8n built-in) |
| Orchestrator LLM | OpenAI GPT-4o |
| Sub-agent LLM | OpenAI GPT-4o-mini |
| Chat памет | Redis (per session, per chatId) |
| Данни | Google Sheets (6 spreadsheet-а) |
| Forecast aggregation | Google Apps Script (aggregator.gs) |
| Интерфейс | Telegram Bot |
| Времето | OpenWeatherMap API |
| Код | github.com/Slambambam/hotel-gm-ai (Private) |

---

## 9. Настройка за нов потребител

### Стъпка 1 — Намери Telegram User ID

```
1. Отвори Telegram
2. Изпрати съобщение на @userinfobot
3. Получаваш: "Your user ID is: XXXXXXXXX"
4. Запази числото
```

### Стъпка 2 — Добави в Access Control

1. Влез в n8n → Workflow `Hotel General Manager Multi V9`
2. Намери нода **`Access Control`**
3. Промени масива с оторизирани ID-та:

```javascript
// Пример с един потребител:
[123456789].includes(Number($json.message.from.id))

// С двама потребители:
[123456789, 987654321].includes(Number($json.message.from.id))
```

4. Запази и активирай workflow-а

---

## 10. Структура на Google Sheets

### Forecast_Pricing (главен spreadsheet)
`ID: 1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0`

| Sheet | Съдържание |
|-------|-----------|
| `Интеграция на Excel за прогнозна заетост` | Дата, OOS, ADR, RevPAR, Леглодни, Заетост%, Начисления |
| `Logs` | Timestamp, ChatId, Query, ResponseLength |

### График / ЗАПЛАТИ
`ID: 1_RI9HZbtljtGW5pyQNxmAqB0MyV3shEOCf3J99etyjU`

| Sheet | Съдържание |
|-------|-----------|
| `График` | Работни дни и смени на персонала |
| `ЗАПЛАТИ` | Длъжности и месечни заплати |

### Разходи
`ID: 16hJSFzNAhKHUoTl_vSkpmfnJV8c-mamjIfZMqs8ZxGc`

Колони: Номер, Дата, Клиент, ЕИК, ИН по ДДС, Данъчна основа, ДДС, Общо, Метод на плащане, Срок, Вид на документ

### Payments (Рецепция)
`ID: 1xwBhKHqhHrlw_sp2TYoeIhfmjstvKrI_HCoF2dpcc20`

### Bar Income
`ID: 1PSQc5NDAn0eQu0ZFY9c6oHG483ed05tjZF8EteVCyMk`

### Инвентар
`ID: 11tLNM8Uf4B_y24oDfD0MuXY7PO8EpDoZQgwgcC3Zlrk`

Sheet `Inventory`: Артикул, Категория, Количество, Единица, Последна доставка

---

## 11. Инсталация от нулата

> Следвай тези стъпки само при deploy на нова инстанция.

### Необходими акаунти

- [x] OpenAI API акаунт (с GPT-4o достъп)
- [x] Telegram Bot (създаден чрез @BotFather)
- [x] Google акаунт (с достъп до Google Sheets)
- [x] Redis (cloud или self-hosted)
- [x] n8n (cloud или self-hosted)
- [ ] OpenWeatherMap API (опционален, безплатен)

### 1. Import на workflow в n8n

```
n8n → Workflows → Import from File
→ Избери: Hotel General Manager Multi V9.json
```

### 2. Конфигурация на credentials

| Credential | Нод | Стъпки |
|------------|-----|--------|
| OpenAI API | OpenAI Chat Model, OpenAI Chat Model1 | Settings → Credentials → Add → OpenAI API |
| Telegram API | Telegram Trigger1, всички Telegram nodes | Credentials → Add → Telegram API → Bot Token |
| Google Sheets | Всички tool_hotel_* нодове | Credentials → Add → Google Sheets OAuth2 |
| Redis | Redis Chat Memory | Credentials → Add → Redis → Host/Port |
| OpenWeatherMap | get_weather | Credentials → Add → OpenWeatherMap |

### 3. Деплой на aggregator.gs

```
1. Отвори script.google.com → New Project
2. Paste съдържанието на aggregator.gs
3. Провери Spreadsheet ID на ред 15
4. Deploy → New Deployment → Web App
   - Execute as: Me
   - Who has access: Anyone
5. Копирай Web App URL
```

### 4. Environment Variables в n8n

```
Settings → n8n Environment Variables:

AGGREGATOR_WEB_APP_URL = https://script.google.com/macros/s/YOUR_ID/exec
```

### 5. Активирай workflow

```
n8n → Workflow → Toggle Active (ON)
```

### Тест на aggregator.gs

```bash
curl "YOUR_WEB_APP_URL?start=01%20Mar%202026&end=31%20Mar%202026"

# Очакван отговор:
# {"total_accruals":45230,"avg_occupancy":"78.5","avg_adr":"125.30","total_nights":970,"days_count":31,"oos_count":3}
```

---

## Файлова структура на проекта

```
GM/
├── Hotel General Manager Multi V9.json    # CURRENT — Production workflow
├── Hotel General Manager Multi V8.json    # Legacy — база с document processing
├── Hotel General Manager Multi Stable.json # Legacy — база с scheduled reports
├── aggregator.gs                           # Google Apps Script за forecast агрегация
├── AI_Architecture_Audit_Full.md          # Пълен архитектурен одит (2026-03-18)
├── System_Audit_Report.md                 # Предишен одит
├── ONBOARDING.md                          # Това ръководство
└── README.md                              # Техническа документация
```

---

## Changelog (накратко)

| Версия | Ключови промени |
|--------|----------------|
| **V9** (2026-03-19) | Премахнат PDF intake (17 нода). Security fix: Access Control exact match. Housekeeping, Morning/Night triggers, Audit Log, Forecast Aggregated Tool |
| **V8** | Document processing: PDF Invoice + Stock Receipt, structured output parsing, duplicate check |
| **Stable** | Housekeeping Manager, Morning/Night scheduled reports, Audit Log |

---

*Разработено от BEWAY ITSolutions за хотел в Банско, България.*
*Powered by n8n + OpenAI + LangChain + Redis + Google Sheets.*
