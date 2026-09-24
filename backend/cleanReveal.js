import fs from 'fs';

const filePath = '../project/src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace "reveal bg-white" with "bg-white"
content = content.replace(/className="reveal bg-white/g, 'className="bg-white');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully cleaned reveal classes in CustomerDashboard.tsx!');
