/**
 * Hotel GM Dashboard API
 * Deploy as Web App (Anyone can access) — returns JSON for dashboard.html
 */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'dashboard';
    var data;

    if (action === 'aggregate') {
      data = getAggregatedForecast(e.parameter.start, e.parameter.end);
    } else if (action === 'weather') {
      data = getWeatherData();
    } else {
      data = {
        timestamp: new Date().toISOString(),
        today: getTodayMetrics(),
        week: getWeekMetrics(),
        mtd: getMTDMetrics(),
        staff: getStaffData(),
        operations: getOperationsData(),
        expenses: getExpensesMTD(),
        barIncome: getBarIncomeMTD(),
        weather: getWeatherData()
      };
    }

    var json = JSON.stringify(data);
    var callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errJson = JSON.stringify({ error: err.message });
    var cb = e && e.parameter && e.parameter.callback;
    if (cb) {
      return ContentService
        .createTextOutput(cb + '(' + errJson + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(errJson)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Aggregated forecast for date range (replaces standalone aggregator.gs) */
function getAggregatedForecast(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    return { error: "Missing start/end parameters" };
  }

  var ss = SpreadsheetApp.openById("1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0");
  var sheet = ss.getSheetByName("Интеграция на Excel за прогнозна заетост");
  var data = sheet.getDataRange().getValues();

  var startDate = new Date(startDateStr);
  var endDate = new Date(endDateStr);

  var summary = {
    total_accruals: 0,
    avg_occupancy: 0,
    avg_adr: 0,
    total_nights: 0,
    days_count: 0,
    oos_count: 0
  };

  var totalOccupancy = 0;
  var totalADR = 0;
  var adrDays = 0;

  for (var i = 1; i < data.length; i++) {
    var rowDate = new Date(data[i][0]);
    if (rowDate >= startDate && rowDate <= endDate) {
      summary.total_accruals += parseFloat(data[i][7] || 0);
      totalOccupancy += parseFloat(data[i][6] || 0);
      var adr = parseFloat(data[i][8] || 0);
      if (adr > 0) { totalADR += adr; adrDays++; }
      summary.total_nights += parseInt(data[i][4] || 0);
      summary.oos_count += parseInt(data[i][2] || 0);
      summary.days_count++;
    }
  }

  if (summary.days_count > 0) {
    summary.avg_occupancy = (totalOccupancy / summary.days_count).toFixed(2);
    summary.avg_adr = adrDays > 0 ? (totalADR / adrDays).toFixed(2) : 0;
  }

  return summary;
}

/** Forecast_Pricing sheet — today's row */
function getTodayMetrics() {
  var ss = SpreadsheetApp.openById("1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0");
  var sheet = ss.getSheetByName("Интеграция на Excel за прогнозна заетост");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  var todayRow = null;
  var yesterdayRow = null;

  for (var i = 1; i < data.length; i++) {
    var rowDate = new Date(data[i][0]);
    rowDate.setHours(0, 0, 0, 0);

    if (rowDate.getTime() === today.getTime()) todayRow = data[i];
    if (rowDate.getTime() === yesterday.getTime()) yesterdayRow = data[i];
  }

  if (!todayRow) return { error: "No data for today" };

  var result = {
    date: Utilities.formatDate(today, "Europe/Sofia", "dd.MM.yyyy"),
    occupancy: parseFloat(todayRow[6] || 0),       // Column G
    adr: parseFloat(todayRow[8] || 0),              // Column I
    revpar: parseFloat(todayRow[9] || 0),           // Column J (or calculated)
    accruals: parseFloat(todayRow[7] || 0),         // Column H
    bedNights: parseInt(todayRow[4] || 0),          // Column E
    reservedRooms: parseInt(todayRow[1] || 0),      // Column B
    oosRooms: parseInt(todayRow[2] || 0),           // Column C
  };

  // Calculate RevPAR if not in sheet
  if (!result.revpar && result.occupancy && result.adr) {
    result.revpar = Math.round(result.occupancy * result.adr / 100 * 100) / 100;
  }

  // Yesterday comparison
  if (yesterdayRow) {
    result.yesterdayOccupancy = parseFloat(yesterdayRow[6] || 0);
    result.yesterdayAdr = parseFloat(yesterdayRow[8] || 0);
    result.occupancyChange = Math.round((result.occupancy - result.yesterdayOccupancy) * 100) / 100;
    result.adrChange = result.yesterdayAdr > 0
      ? Math.round((result.adr - result.yesterdayAdr) / result.yesterdayAdr * 10000) / 100
      : 0;
  }

  return result;
}

/** Forecast_Pricing — last 7 days */
function getWeekMetrics() {
  var ss = SpreadsheetApp.openById("1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0");
  var sheet = ss.getSheetByName("Интеграция на Excel за прогнозна заетост");
  var data = sheet.getDataRange().getValues();

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var days = [];
  var dayNames = ['Нед', 'Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб'];

  for (var d = 6; d >= 0; d--) {
    var target = new Date(today);
    target.setDate(target.getDate() - d);
    target.setHours(0, 0, 0, 0);

    var found = false;
    for (var i = 1; i < data.length; i++) {
      var rowDate = new Date(data[i][0]);
      rowDate.setHours(0, 0, 0, 0);

      if (rowDate.getTime() === target.getTime()) {
        days.push({
          date: Utilities.formatDate(target, "Europe/Sofia", "dd.MM"),
          dayName: dayNames[target.getDay()],
          occupancy: parseFloat(data[i][6] || 0),
          adr: parseFloat(data[i][8] || 0),
          accruals: parseFloat(data[i][7] || 0),
          bedNights: parseInt(data[i][4] || 0)
        });
        found = true;
        break;
      }
    }
    if (!found) {
      days.push({
        date: Utilities.formatDate(target, "Europe/Sofia", "dd.MM"),
        dayName: dayNames[target.getDay()],
        occupancy: 0, adr: 0, accruals: 0, bedNights: 0
      });
    }
  }

  // Week averages
  var totalOcc = 0, totalAdr = 0, adrCount = 0, totalAccruals = 0;
  days.forEach(function(day) {
    totalOcc += day.occupancy;
    totalAccruals += day.accruals;
    if (day.adr > 0) { totalAdr += day.adr; adrCount++; }
  });

  return {
    days: days,
    avgOccupancy: Math.round(totalOcc / days.length * 100) / 100,
    avgAdr: adrCount > 0 ? Math.round(totalAdr / adrCount * 100) / 100 : 0,
    totalAccruals: Math.round(totalAccruals * 100) / 100
  };
}

/** Forecast_Pricing — month to date */
function getMTDMetrics() {
  var ss = SpreadsheetApp.openById("1Vs3dyukStJf1W4-_luRNQPngx7f-9qqK1GieQius9U0");
  var sheet = ss.getSheetByName("Интеграция на Excel за прогнозна заетост");
  var data = sheet.getDataRange().getValues();

  var today = new Date();
  var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  var totalAccruals = 0, totalOcc = 0, totalAdr = 0, adrCount = 0;
  var totalNights = 0, dayCount = 0;

  for (var i = 1; i < data.length; i++) {
    var rowDate = new Date(data[i][0]);
    if (rowDate >= firstDay && rowDate <= today) {
      totalAccruals += parseFloat(data[i][7] || 0);
      totalOcc += parseFloat(data[i][6] || 0);
      totalNights += parseInt(data[i][4] || 0);
      var adr = parseFloat(data[i][8] || 0);
      if (adr > 0) { totalAdr += adr; adrCount++; }
      dayCount++;
    }
  }

  return {
    revenue: Math.round(totalAccruals * 100) / 100,
    avgOccupancy: dayCount > 0 ? Math.round(totalOcc / dayCount * 100) / 100 : 0,
    avgAdr: adrCount > 0 ? Math.round(totalAdr / adrCount * 100) / 100 : 0,
    totalNights: totalNights,
    daysElapsed: dayCount,
    daysInMonth: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  };
}

/** Staff schedule — today */
function getStaffData() {
  try {
    var ss = SpreadsheetApp.openById("1_RI9HZbtljtGW5pyQNxmAqB0MyV3shEOCf3J99etyjU");
    var scheduleSheet = ss.getSheetByName("График");
    var salarySheet = ss.getSheetByName("ЗАПЛАТИ");

    var scheduleData = scheduleSheet.getDataRange().getValues();
    var salaryData = salarySheet.getDataRange().getValues();

    // Build employee list from salary sheet
    var employees = [];
    for (var i = 1; i < salaryData.length; i++) {
      var name = salaryData[i][0] || salaryData[i][1];
      var role = salaryData[i][2] || salaryData[i][1] || '';
      if (name && String(name).trim()) {
        employees.push({
          name: String(name).trim(),
          role: String(role).trim(),
          salary: parseFloat(salaryData[i][3] || 0)
        });
      }
      if (employees.length >= 10) break;
    }

    var totalSalaries = 0;
    employees.forEach(function(e) { totalSalaries += e.salary; });

    return {
      employees: employees.slice(0, 8),
      totalEmployees: employees.length,
      totalSalaries: totalSalaries
    };
  } catch (err) {
    return { error: err.message, employees: [], totalEmployees: 0, totalSalaries: 0 };
  }
}

/** Reservations — today's arrivals/departures */
function getOperationsData() {
  try {
    var resSS = SpreadsheetApp.openById("1EVylj4JZSJTlOi0b4oVWgetsXuWs13WhxJh88IJfwi4");
    var resSheet = resSS.getSheetByName("New");
    var resData = resSheet.getDataRange().getValues();
    var headers = resData[0];

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find check-in and check-out columns by header name
    var checkinCol = -1, checkoutCol = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]).toLowerCase();
      if (h.indexOf('check-in') >= 0 || h.indexOf('checkin') >= 0 || h.indexOf('arrival') >= 0 || h.indexOf('настаняване') >= 0) checkinCol = c;
      if (h.indexOf('check-out') >= 0 || h.indexOf('checkout') >= 0 || h.indexOf('departure') >= 0 || h.indexOf('напускане') >= 0) checkoutCol = c;
    }
    // Fallback: assume columns B=check-in, C=check-out if not found
    if (checkinCol < 0) checkinCol = 1;
    if (checkoutCol < 0) checkoutCol = 2;

    var arrivals = 0, departures = 0;
    for (var i = 1; i < resData.length; i++) {
      var ci = resData[i][checkinCol];
      var co = resData[i][checkoutCol];
      if (ci) {
        var ciDate = new Date(ci);
        ciDate.setHours(0, 0, 0, 0);
        if (ciDate.getTime() === today.getTime()) arrivals++;
      }
      if (co) {
        var coDate = new Date(co);
        coDate.setHours(0, 0, 0, 0);
        if (coDate.getTime() === today.getTime()) departures++;
      }
    }

    return {
      arrivals: arrivals,
      departures: departures,
      totalReservations: resData.length - 1
    };
  } catch (err) {
    return { error: err.message, arrivals: 0, departures: 0, totalReservations: 0 };
  }
}

/** Expenses MTD */
function getExpensesMTD() {
  try {
    var ss = SpreadsheetApp.openById("16hJSFzNAhKHUoTl_vSkpmfnJV8c-mamjIfZMqs8ZxGc");
    var sheet = ss.getSheetByName("Sheet1");
    var data = sheet.getDataRange().getValues();

    var today = new Date();
    var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    var total = 0;
    var count = 0;

    for (var i = 1; i < data.length; i++) {
      var dateVal = data[i][1]; // Column B: date
      if (dateVal) {
        var rowDate = new Date(dateVal);
        if (rowDate >= firstDay && rowDate <= today) {
          total += parseFloat(data[i][7] || data[i][6] || 0); // Column H or G: total amount
          count++;
        }
      }
    }

    return { total: Math.round(total * 100) / 100, invoiceCount: count };
  } catch (err) {
    return { error: err.message, total: 0, invoiceCount: 0 };
  }
}

/** Weather — Bansko (OpenWeatherMap, server-side) */
function getWeatherData() {
  try {
    var OWM_KEY = PropertiesService.getScriptProperties().getProperty('OWM_KEY');
    if (!OWM_KEY) OWM_KEY = 'da6e608b9f9907a1fd6f34692827f2bd';
    var url = 'https://api.openweathermap.org/data/2.5/weather?q=Bansko,BG&units=metric&lang=bg&appid=' + OWM_KEY;
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var w = JSON.parse(resp.getContentText());
    if (!w.main) return { error: 'No weather data' };
    return {
      temp: w.main.temp,
      description: w.weather[0].description,
      wind: w.wind.speed,
      humidity: w.main.humidity,
      icon: w.weather[0].icon
    };
  } catch (err) {
    return { error: err.message };
  }
}

/** Bar Income MTD */
function getBarIncomeMTD() {
  try {
    var ss = SpreadsheetApp.openById("1PSQc5NDAn0eQu0ZFY9c6oHG483ed05tjZF8EteVCyMk");
    var sheets = ss.getSheets();
    var sheet = sheets[0];
    var data = sheet.getDataRange().getValues();

    var today = new Date();
    var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    var total = 0;

    for (var i = 1; i < data.length; i++) {
      var dateVal = data[i][0] || data[i][1];
      if (dateVal) {
        var rowDate = new Date(dateVal);
        if (rowDate >= firstDay && rowDate <= today) {
          // Find the amount column (usually one of the later columns)
          for (var c = data[i].length - 1; c >= 2; c--) {
            var val = parseFloat(data[i][c]);
            if (!isNaN(val) && val > 0) {
              total += val;
              break;
            }
          }
        }
      }
    }

    return { total: Math.round(total * 100) / 100 };
  } catch (err) {
    return { error: err.message, total: 0 };
  }
}
