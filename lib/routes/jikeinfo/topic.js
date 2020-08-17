const got = require('@/utils/got');
const cheerio = require('cheerio');
const url = require('url');

const baseUrl = 'https://jike.info/';

module.exports = async (ctx) => {
    const response = await got({
        method: 'get',
        url: `${baseUrl}`,
        headers: {
            Referer: `${baseUrl}`,
        },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const list = $('.topic-list li').get();

    const ProcessFeed = (data) => {
        console.log('data---', '\n', data);
        const $ = cheerio.load(data);
        console.log(' 1---3', '\n', $('.topic li'));
        console.log(' 2---', '\n', $('.topic').get());
        return {
            desc: $('.topic .posts li')[0].html(),
        };
    };

    const out = await Promise.all(
        list.map(async (item, index) => {
            if (index === 0) {
                const $ = cheerio.load(item);
                const $a = $('a');
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
                    description,
                    link: link,
                };
                ctx.cache.set(link, JSON.stringify(single));
                return Promise.resolve(single);
            }
        })
    );
    ctx.state.data = { title: '主页 | JIKE', link: baseUrl, item: out };
};
