const got = require('@/utils/got');
const cheerio = require('cheerio');
// const { parseDate } = require('@/utils/parse-date');

const builder = async (ctx) => {
    const cate = ctx.params.cate || '';

    const rootUrl = 'https://www.mypianku.net';

    const response = await got({
        method: 'get',
        url: `${rootUrl}/mv/--${cate}--7,10--1.html`,
    });

    const $ = cheerio.load(response.data);

    const list = $('.content-list li')
        .map((_, li) => {
            const $li = $(li);
            const $a = $li.find('.li-img>a');

            const point = $li.find('.li-bottom>h3>span').text().replace(/ /g, '');
            const tags = $li.find('.li-bottom>.tag').text() ? `[${$li.find('.li-bottom>.tag').text()?.replace(/ /g, '')}]` : '';
            const title = `[${point}]${tags}${$a.attr('title')}`;
            const link = `${rootUrl}${$a.attr('href')}`;

            const imgUrl = $a.find('img').attr('data-src');

            const description = `<div style="min-height:100px"><img width="96px" height="128px" alt="${title}" src="${imgUrl}" style="float: left;margin-right: 20px;"/><p style="font-size:20px;padding-top:10px;"><a href="${link}">${title}"</a></p></div>`;

            const topicItem = {
                title,
                link,
                guid: $li.find('.li-img').attr('data-id'),
                description,
            };

            // if (_ === 0) {
            //     console.log('topicItem', '\n', topicItem);
            // }

            return topicItem;
        })
        .get();

    // const items = await Promise.all(
    //     list.map((item) => {
    //         const article = ctx.cache.tryGet(item.link, async () => {
    //             const detailResponse = await got({
    //                 method: 'get',
    //                 url: item.link,
    //             });

    //             const topic = cheerio.load(detailResponse.data);

    //             const $topic = topic('li[component="post"][data-index="0"]');
    //             // console.log('$topic.html()', '\n', $topic.html());
    //             item.description = $topic.html();

    //             return item;
    //         });
    //         return article;
    //     })
    // );

    ctx.state.data = {
        title: $('title').text(),
        link: rootUrl,
        item: list,
    };
};

module.exports = builder;
