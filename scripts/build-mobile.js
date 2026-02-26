const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
const indexFile = path.join(outDir, 'index.html');

console.log('Starting mobile build (safe mode)...\n');
console.log('Mobile app will load production URL via Capacitor server.url\n');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Minimal placeholder required by Capacitor copy/sync.
fs.writeFileSync(
  indexFile,
  '<!doctype html><html><head><meta charset="utf-8"><title>ChatBot Oficial</title></head><body>Mobile shell</body></html>',
  { encoding: 'utf8' },
);

console.log('Placeholder webDir prepared at out/index.html');
console.log('Next steps:');
console.log('  1. npx cap sync android');
console.log('  2. cd android && ./gradlew bundleRelease');
