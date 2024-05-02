const Parser = require('rss-parser');
const fs = require('fs');

const parser = new Parser();

async function test() {
    const xml = fs.readFileSync(__dirname + '/lib/routes/we-mp-rss-proxy/lande.xml', 'utf-8');
    const feed = await parser.parseString(xml);
    const firstItem = feed.items[0];
    console.log(Object.keys(firstItem));
    console.log('Has content?', !!firstItem.content);
    console.log('Has content:encoded?', !!firstItem['content:encoded']);
    console.log('Content length:', firstItem.content ? firstItem.content.length : 0);
}

test().catch(console.error);
