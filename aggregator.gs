/**
 * Hotel Forecast Aggregator Web App
 * Accepts start and end dates and returns aggregated summary from "Forecast_Pricing" sheet.
 */
function doGet(e) {
  var startDateStr = e.parameter.start; // "01 Mar 2026"
  var endDateStr = e.parameter.end;     // "31 Mar 2026"
  
  if (!startDateStr || !endDateStr) {
    return ContentService.createTextOutput(JSON.stringify({error: "Missing parameters"})).setMimeType(ContentService.MimeType.JSON);
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
    var rowDate = new Date(data[i][0]); // Column A: Date
    if (rowDate >= startDate && rowDate <= endDate) {
      summary.total_accruals += parseFloat(data[i][7] || 0); // Column H: Accruals
      totalOccupancy += parseFloat(data[i][6] || 0);        // Column G: Occupancy %
      
      var adr = parseFloat(data[i][8] || 0);                // Column I: ADR
      if (adr > 0) {
        totalADR += adr;
        adrDays++;
      }
      
      summary.total_nights += parseInt(data[i][4] || 0);    // Column E: Reserved Rooms
      summary.oos_count += parseInt(data[i][2] || 0);        // Column C: OOS
      summary.days_count++;
    }
  }

  if (summary.days_count > 0) {
    summary.avg_occupancy = (totalOccupancy / summary.days_count).toFixed(2);
    summary.avg_adr = adrDays > 0 ? (totalADR / adrDays).toFixed(2) : 0;
  }

  var json = JSON.stringify(summary);
  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
