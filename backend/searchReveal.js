import fs from 'fs';

const filePath = '../project/src/pages/CustomerDashboard.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('reveal') && !line.includes('useReveal')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
