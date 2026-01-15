
const fs = require('fs');
const path = require('path');
const fm = require('front-matter');

const filePath = path.join(__dirname, 'content/roasted-cauliflower-soup.md');
const content = fs.readFileSync(filePath, 'utf8');

const { body } = fm(content);

console.log('--- RAW BODY START ---');
console.log(body);
console.log('--- RAW BODY END ---');

// Check for double newlines
if (body.includes('\n\n')) {
    console.log('Double newlines found.');
} else {
    console.log('NO double newlines found.');
}

