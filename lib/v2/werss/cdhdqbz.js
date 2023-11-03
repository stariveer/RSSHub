// 成都活动情报站
/* eslint-disable no-useless-escape */
const parser = require('@/utils/rss-parser');
const { parseDate } = require('@/utils/parse-date');

function extractInformation(item) {
    const regex = /(\d+)\s(.*?) 📍地址：(.*?) ⏰时间：(.+?) /;
    const match = item.match(regex);

    if (match) {
        // 提取第一个空格之前的标题内容
        let titleContent = match[2].split(' ')[0];
        let descContent = '';
        if (Number(titleContent)) {
            titleContent = match[2];
        } else {
            if (match[2].split(' ')[1]) {
                descContent = match[2].split(' ')[1];
            }
        }
        const address = match[3]; // 地址内容
        const time = match[4]; // 时间内容

        return { titleContent, descContent, address, time };
    } else {
        return null; // 未找到匹配项
    }
}

function transTextToArr(text) {
    const items = text.split(`Part.`).slice(1);
    return items.map((item) => {
        // item一定是以数字 + 空格 + 标题内容 + 空格 + 其他文字 + 📍地址：+ 地址内容 + ⏰时间：+时间内容 组成
        // 提取标题内容+地址内容+时间内容
        const parseItem = extractInformation(item);
        // console.log('##matches', matches);
        return parseItem;
    });
}

function toHtml(data) {
    let html = '';
    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        if (item) {
            html += `<div style="word-wrap: break-word !important; box-sizing: border-box; font-size: 12px;">
            <p style="margin-top: 5px;margin-bottom: 5px; max-width: 100%; line-height: 25.6px;">
              <h3 style="font-size: 16px; font-weight: bold;">Part.${i + 1} ${item.titleContent}</h3>
              <div style="font-size: 14px; font-weight: bold;">📢 ${item.descContent}</div>
              <div style="font-size: 14px; font-weight: bold;">📍 ${item.address}</div>
              <div style="font-size: 14px; font-weight: bold;">⏰ ${item.time}</div>
            </p>
          </div>
          <hr />`;
        }
    }
    return html;
}

module.exports = async (ctx) => {
    // const  id = '9779044929b45805a5c1b0fecf5f6a95c7202818';

    // const baseUrl = 'https://wechat2rss.xlab.app';
    // const feedUrl = `${baseUrl}/feed/${id}.xml`;
    const feedUrl = `https://cdn.werss.weapp.design/api/v1/feeds/80136e3c-4035-41f8-b2be-a0bd5bed58dd.xml`;
    // const feedUrl = `http://localhost:8081/feed.xml`;
    // const feedUrl = `http://localhost:8888/feed.xml`;

    const { title, link, description, image, items: item } = await parser.parseURL(feedUrl);
    // 移除换行符
    let parsedItems = '';
    try {
        parsedItems = toHtml(transTextToArr(item[0].contentSnippet.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()));
    } catch (e) {
    }

    // console.log('##toHtml(transTextToArr(i.contentSnippet))', toHtml(transTextToArr(item[0].contentSnippet)));
    const items = item.map((i) => {
        const res = {
            title: i.title,
            pubDate: parseDate(i.pubDate),
            link: i.link,
            description: parsedItems + i.content,
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
