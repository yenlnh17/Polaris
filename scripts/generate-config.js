const fs = require('fs');
const path = require('path');

const key = process.env.GOONG_KEY || '';
const out = path.join(__dirname, '../js/core/config.js');
fs.writeFileSync(out, `export const GOONG_KEY = '${key}';\n`);
console.log('Generated js/core/config.js');
