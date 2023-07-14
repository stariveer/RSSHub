const parser = require('@/utils/rss-parser');
const { parseDate } = require('@/utils/parse-date');
// const { finishArticleItem } = require('@/utils/wechat-mp');

function extractData(text) {
    // @ts-ignore
    // eslint-disable-next-line no-useless-escape
    const regex = /(iPhone\s*14\s*Pro\s*Max|iPhone\s*13\s*Pro\s*Max|iPad\s*Mini\s*6)([^（]*)（(\d+[GT])）([^官换]*官换[^0-9]*)([0-9\/]+)/gi;
    const result = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        result.push({
            model: match[1].replace(/\s/g, ''),
            modelDescription: match[2].trim(),
            capacity: match[3],
            version: match[4].replace(/【现货】|单机未激活/g, '').trim(),
            price: match[5],
        });
    }
    return result;
}

function toHtmlTable(data) {
    let html = '<table>';
    html += '<tr><th>机型</th><th>机型描述</th><th>容量</th><th>版本</th><th>价格</th></tr>';
    for (const item of data) {
        html += `<tr><td>${item.model}</td><td>${item.modelDescription}</td><td>${item.capacity}</td><td>${item.version}</td><td>${item.price}</td></tr>`;
    }
    html += '</table>';
    return html;
}

module.exports = async (ctx) => {
    // const  id = '9779044929b45805a5c1b0fecf5f6a95c7202818';

    // const baseUrl = 'https://wechat2rss.xlab.app';
    // const feedUrl = `${baseUrl}/feed/${id}.xml`;
    const feedUrl = `https://cdn.werss.weapp.design/api/v1/feeds/9167b727-b349-4bf9-823e-6325ee94d0a0.xml`;
    // const feedUrl = `http://localhost:8081/feed.xml`;

    const { title, link, description, image, items: item } = await parser.parseURL(feedUrl);
    // console.log('==item', item);
    const items = item
        .filter((i) => i.title.indexOf('参考报价') > -1)
        .map((i) => {
            // console.log('==i.contentSnippet', i.contentSnippet);
            // console.log('==i.contentSnippet', extractData(i.contentSnippet));
            // console.log('==i.contentSnippet', i.contentSnippet.startsWith('云鹏数码'));
            // console.log('==i.contentSnippet', toHtmlTable(extractData(i.contentSnippet)));
            const res =  {
                title: i.title,
                pubDate: parseDate(i.pubDate),
                link: i.link,
                description: toHtmlTable(extractData(i.contentSnippet)),
            };
            return res;
        });

    // items = await Promise.all(items.map((item) => finishArticleItem(ctx, item)));
    // console.log('==items[0]', items[0]);
    ctx.state.data = {
        title,
        link,
        description,
        image: image.url,
        item: items,
    };
};
