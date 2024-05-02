import Parser from 'rss-parser';
import * as fs from 'fs';
import path from 'path';

const parser = new Parser({
    customFields: {
        item: ['content:encoded'],
    }
});

async function test() {
    console.time('rss-parser');
    const xml = fs.readFileSync(path.join(process.cwd(), 'lib/routes/we-mp-rss-proxy/lande.xml'), 'utf-8');
    const feed = await parser.parseString(xml);
    console.timeEnd('rss-parser');
    
    const firstItem = feed.items[0];
    console.log(Object.keys(firstItem));
    console.log('Has content?', !!firstItem.content);
    console.log('Has content:encoded?', !!firstItem['content:encoded']);
    console.log('Content length:', firstItem.content ? firstItem.content.length : 0);
    console.log('Content:encoded length:', firstItem['content:encoded'] ? firstItem['content:encoded'].length : 0);
}

test().catch(console.error);
