require('dotenv').config();
const fs   = require('fs');
const path = require('path');

// Check versions
const clientPkg = require('./node_modules/@prisma/client/package.json');
const prismaPkg = require('./node_modules/prisma/package.json');
console.log('@prisma/client version:', clientPkg.version);
console.log('prisma CLI version:    ', prismaPkg.version);

// Check what's in the generated index.d.ts
const indexPath = path.join(__dirname, 'node_modules', '@prisma', 'client', 'index.d.ts');
const content = fs.readFileSync(indexPath, 'utf8');
console.log('\nindex.d.ts size:', content.length, 'chars');
console.log('First 300 chars:\n', content.substring(0, 300));

// Check .prisma/client
const runtimeIndex = path.join(__dirname, 'node_modules', '.prisma', 'client', 'index.d.ts');
if (fs.existsSync(runtimeIndex)) {
  const rc = fs.readFileSync(runtimeIndex, 'utf8');
  console.log('\n.prisma/client/index.d.ts size:', rc.length);
  console.log('Has UserPermission:', rc.includes('UserPermission'));
  console.log('Has Category:', rc.includes('Category'));
  console.log('First 300 chars:\n', rc.substring(0, 300));
} else {
  console.log('\n.prisma/client/index.d.ts: NOT FOUND');
}
