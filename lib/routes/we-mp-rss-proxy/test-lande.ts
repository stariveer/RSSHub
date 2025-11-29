
import { handleLande } from './lande-handler';

const sampleItems = [
    {
        title: 'Test Article',
        link: 'http://example.com',
        content: '<div>Test Content</div>',
        pubDate: new Date().toISOString(),
        guid: '123',
    }
];

async function runTest() {
    console.log('Testing handleLande...');
    const result = await handleLande(sampleItems, []);
    console.log('Result:', JSON.stringify(result, null, 2));
}

runTest().catch(console.error);
