const fs   = require('fs');
const path = require('path');

// Search entire node_modules for any index.d.ts that mentions UserPermission
function search(dir, depth) {
  if (depth > 5) return;
  try {
    var items = fs.readdirSync(dir);
    for (var i = 0; i < items.length; i++) {
      var full = path.join(dir, items[i]);
      try {
        var stat = fs.statSync(full);
        if (stat.isDirectory()) {
          search(full, depth + 1);
        } else if (items[i] === 'index.d.ts') {
          var content = fs.readFileSync(full, 'utf8');
          if (content.includes('UserPermission') || content.includes('PrismaClient')) {
            console.log('FOUND:', full, '(', content.length, 'chars )');
            console.log('  Has UserPermission:', content.includes('UserPermission'));
            console.log('  Has Category:', content.includes('Category'));
          }
        }
      } catch(e) {}
    }
  } catch(e) {}
}

console.log('Searching node_modules for generated Prisma client...\n');
search(path.join(__dirname, 'node_modules'), 0);
console.log('\nDone.');
