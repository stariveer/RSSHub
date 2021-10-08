const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

const builder = async (ctx) => {
    const cate = ctx.params.cate || 5;

    const rootUrl = 'https://jike.info';

    const response = await got({
        method: 'get',
        url: `${rootUrl}/category/${cate}/`,
    });

    const $ = cheerio.load(response.data);

    const list = $('li.category-item:not(.pinned):not(.locked):not(.deleted)')
        .map((_, li) => {
            const $li = $(li);
            const $a = $li.find('.title [itemprop="url"]');
            const $timeago = $li.find('[component="topic/header"] .hidden-xs .timeago');
            const $author = $li.find('[component="topic/header"] .hidden-xs a');

            const topicItem = {
                title: $a.text(),
                link: `${rootUrl}${$a.attr('href')}`,
                pubDate: parseDate($timeago.attr('title')),
                guid: $li.attr('data-tid'),
                author: $author.text(),
            };

            // console.log('topicItem', '\n', topicItem);
            return topicItem;
        })
        .get();

    const items = await Promise.all(
        list.map((item) => {
            const article = ctx.cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const topic = cheerio.load(detailResponse.data);

                const $topic = topic('li[component="post"][data-index="0"]');
                // console.log('$topic.html()', '\n', $topic.html());
                item.description = $topic.html();

                return item;
            });
            return article;
        })
    );

    ctx.state.data = {
        title: $('title').text(),
        link: rootUrl,
        item: items,
    };
};

module.exports = builder;
