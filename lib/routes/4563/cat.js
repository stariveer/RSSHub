const got = require('@/utils/got');
// const date = require('@/utils/date');
const cheerio = require('cheerio');
const url = require('url');

const baseUrl = 'http://4563.org';

module.exports = async (ctx) => {
    const cat = ctx.params.cat || 2122;
    const response = await got({
        method: 'get',
        url: url.resolve(baseUrl, `/?cat=${cat}`),
        headers: {
            Referer: `${baseUrl}`,
        },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const list = $('#content .box .post-list').get();

    const ProcessFeed = (data) => {
        const $ = cheerio.load(data);
        return {
            desc: $('#entry-content').html(),
        };
    };

    const out = await Promise.all(
        list.map(async (item) => {
            const $ = cheerio.load(item);
            const $a = $('.entry-title a');
            const link = url.resolve(baseUrl, $a.attr('href'));

            const cache = await ctx.cache.get(link);
            if (cache) {
                return Promise.resolve(JSON.parse(cache));
            }

            const response = await got({
                method: 'get',
                url: link,
            });
            const feed = ProcessFeed(response.data);
            const description = feed.desc;

            const single = {
                title: $a.text(),
                pubDate: new Date($(item).find('.timeago').attr('datetime')),
                description,
                link: link,
            };
            ctx.cache.set(link, JSON.stringify(single));
            return Promise.resolve(single);
        })
    );
    ctx.state.data = { title: '4563 VPS/域名/優惠', link: baseUrl, item: out };
};
