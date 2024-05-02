import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/',
    categories: ['study'],
    example: '/edumails',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['edumails.cn/freeactivity'],
        },
    ],
    name: 'edu邮箱资讯',
    maintainers: ['xinghe'],
    handler,
    url: 'edumails.cn/freeactivity',
};

async function handler() {
    const baseUrl = 'https://www.edumails.cn';
    const link = `${baseUrl}/freeactivity`;

    const response = await got(link);
    const $ = load(response.data);

    // 获取网站描述
    const description = $('div.catleader-desc').text().trim();

    const list = $('article.excerpt')
        .map((_, item) => {
            const $item = $(item);
            const $title = $item.find('h2 a');
            const $thumb = $item.find('a.focus img');
            const $time = $item.find('.meta time');
            const $note = $item.find('p.note');

            return {
                title: $title.text().trim(),
                link: $title.attr('href'),
                description: `
                    <p>${$note.text().trim()}</p>
                    <p><img src="${$thumb.data('src')}" alt="${$thumb.attr('alt')}"></p>
                    <p><a href="${$title.attr('href')}">阅读全文</a></p>
                `,
                pubDate: parseDate($time.text().trim()),
            };
        })
        .get();

    return {
        title: 'EDU教育网邮箱 - edu邮箱资讯',
        link,
        description,
        item: list,
    };
}
