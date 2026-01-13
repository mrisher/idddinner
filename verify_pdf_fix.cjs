
const pdfParse = require('pdf-parse');
console.log('Is pdfParse a function?', typeof pdfParse === 'function');

async function testParam() {
    try {
        const fs = require('fs');
        // create a dummy buffer
        const buffer = Buffer.from('dummy pdf content');
        // valid call signature for v1.1.1 is (dataBuffer, options)
        // just checking if it throws "is not a function"
        try {
             await pdfParse(buffer);
        } catch(e) {
             // We expect it to fail parsing "dummy pdf content", but NOT because it's not a function
             if (e.message.includes('not a function')) {
                 console.log('FAIL: Still not a function');
             } else {
                 console.log('SUCCESS: Function called (parse error expected)');
             }
        }
    } catch (e) {
        console.error(e);
    }
}
testParam();
