const fs = require('fs');
const path = require('path');

const OFFERTS_FILE = path.join(__dirname, '..', 'data', 'offerts.json');

function getAllOfferts() {
  const fileContents = fs.readFileSync(OFFERTS_FILE, 'utf8');
  return JSON.parse(fileContents);
}

function saveOffert(offertData) {
  const offerts = getAllOfferts();
  offerts.push(offertData);
  fs.writeFileSync(OFFERTS_FILE, JSON.stringify(offerts, null, 2), 'utf8');
  return offertData;
}

module.exports = {
  getAllOfferts,
  saveOffert
};
