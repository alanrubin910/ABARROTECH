const TZ = 'America/Mexico_City';

// Fecha local México: YYYY-MM-DD
function localDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// Fecha-hora local México: YYYY-MM-DD HH:MM:SS
function localDateTimeStr() {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace('T', ' ');
}

module.exports = { localDateStr, localDateTimeStr };
