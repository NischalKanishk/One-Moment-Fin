const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix async function parameters
  content = content.replace(/async \(req, res\) =>/g, 'async (req: express.Request, res: express.Response) =>');
  
  // Fix isMobilePhone calls
  content = content.replace(/\.isMobilePhone\(\)/g, '.isMobilePhone(\'en-IN\')');
  
  // Fix double return statements
  content = content.replace(/return return /g, 'return ');
  
  // Fix null error handling
  content = content.replace(/error\.message/g, 'error?.message || \'Unknown error\'');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
});

console.log('All TypeScript issues fixed!');
