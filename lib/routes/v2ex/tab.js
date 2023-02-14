const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const tabid = ctx.params.tabid;
    const keyword = ctx.params.keyword ? decodeURIComponent(ctx.params.keyword) : '';
    const host = 'https://v2ex.com';
    const pageUrl = `${host}/?tab=${tabid}`;
    // const pageUrl = `${host}/go/${tabid}`;
    const response = await got({
        method: 'get',
        url: pageUrl,
    });

    const $ = cheerio.load(response.data);

    // console.log('==keyword', '\n', keyword);
    // console.log('==', '\n', $('span.item_title > a'));
    const arr = keyword ? $('span.item_title > a').filter((i, item) => $(item).text().indexOf(keyword) > -1) : $('span.item_title > a');
    // console.log('==arr', '\n', arr);
    const links = arr
        // .filter((i, item) => {
        //     console.log('==item', '\n', (item) => $(item).text().indexOf(keyword) > -1);
        //     return true;
        // })
        .map((i, link) => {
            // console.log('==link', '\n', $(link).text());
            const l = `${host}${$(link).attr('href')}`;
            // console.log('==l', '\n', l);
            return l;
        })
        .slice(0, 10)
        .get();
    const items = await Promise.all(
        links.map(async (pageUrl) => {
            const cacheKey = `v2ex-${pageUrl}`;
            const cacheValue = await ctx.cache.get(cacheKey);
            let post = {};
            if (cacheValue) {
                post = cacheValue;
            } else {
                const response = await got({
                    method: 'get',
                    url: pageUrl,
                });
                const $ = cheerio.load(response.data);
                const list = $('[id^="r_"]').get();
                const reply_content = list
                    .map((item) => {
                        const post = $(item);
                        const content = post.find('.reply_content').html();
                        const author = post.find('.dark').first().text();
                        const no = post.find('.no').text();
                        return `<p><div>#${no}: <i>${author}</i></div><div>${content}</div></p>`;
                    })
                    .join('');
                post = {
                    title: $('.header h1').text(),
                    link: pageUrl,
                    guid: pageUrl,
                    description: $('div.topic_content').html() + `<div>${reply_content}</div>`,
                    author: $('div.header > small > a').text(),
                };
                ctx.cache.set(cacheKey, post);
            }
            return Promise.resolve(post);
        })
    );
    ctx.state.data = {
        title: keyword ? `V2EX-${tabid}[${keyword}]` : `V2EX-${tabid}`,
        link: pageUrl,
        description: `V2EX-tab-${tabid}`,
        item: items,
    };
};
