import { Route } from '@/types';
import gotOrig from 'got';
import got from '@/utils/got';
import cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import config from './config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rootUrl = 'http://i.jandan.net';
const proxyPrefix = `http://jandan.trainspott.in/http:`;
const { pages, ignore, ooCount, ooRate, sizeLimit, authorBlackList } = config;

interface Item {
    author: string;
    description: string;
    title: string;
    pubDate: Date;
    link: string;
    isShow: boolean;
}

async function getImageSize(url: string): Promise<number> {
    try {
        const response = await gotOrig.head(`http:${url}`, {
            headers: {
                Referer: 'http://i.jandan.net/',
            },
        });
        const contentLength = response.headers['content-length'];
        return Number(contentLength);
    } catch (error) {
        // @ts-ignore
        // eslint-disable-next-line no-console
        console.error('Error occurred while sending HEAD request:', error.message);
        return 0;
    }
}

async function handler(ctx) {
    const { query } = ctx.req;
    console.log('##query', query);
    let count = 0; // 当前页数
    let currentUrl = 'http://i.jandan.net/pic';
    const final: Item[] = [];

    async function getOnePage(url: string) {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            Referer: 'http://i.jandan.net/',
        };

        const response = await got({
            method: 'get',
            url,
            headers,
        });

        const $ = cheerio.load(response.data);

        if (count > ignore) {
            const items: Item[] = await Promise.all(
                $('ol.commentlist li')
                    .not('.row')
                    .slice(0, query.limit ? Number.parseInt(query.limit) : 50)
                    .toArray()
                    .map(async (item) => {
                        const $item = $(item);
                        const viewImgLinks = $item.find('.commenttext .view_img_link').toArray();
                        const sizePromises = viewImgLinks.map(async (element, i) => {
                            const imgUrl = $(element).attr('href');
                            const proxyImgUrl = proxyPrefix + imgUrl;
                            $(element).replaceWith(`<img src="${proxyImgUrl}">`);
                            if (i === 0) {
                                return getImageSize(imgUrl);
                            }
                            return 0;
                        });
                        const sizes = await Promise.all(sizePromises);
                        const size = sizes[0];

                        const author = $item.find('b').first().text();
                        let description = $item.find('.commenttext').html() || '';

                        // 过滤掉所有非 proxyPrefix 开头的图片
                        const $description = cheerio.load(description);
                        $description('img').each((i, img) => {
                            const src = $description(img).attr('src');
                            if (src && !src.startsWith(proxyPrefix)) {
                                $description(img).remove();
                            } else {
                                $description(img).after('<br>');
                            }
                        });
                        description = $description.html();

                        const date = parseDate($item.find('.time').text());

                        const oo = +$item.find('.comment-like').next('span').text();
                        const xx = +$item.find('.comment-unlike').next('span').text();

                        const pubDate = timezone(date, 0);

                        const isOO = oo > ooCount && oo / (xx + oo) > ooRate;
                        const isSizeOk = size / (1024 * 1024) < sizeLimit;
                        const isAuthorOk = !authorBlackList.includes(author);
                        return {
                            author,
                            description,
                            title: `${author}: ${$item.find('.commenttext').text()}`,
                            pubDate,
                            link: `${rootUrl}/t/${$item.attr('id').split('-').pop()}`,
                            isShow: isOO && isSizeOk && isAuthorOk,
                        };
                    })
            );
            for (const item of items.filter((item) => item.isShow)) {
                final.push(item);
            }
        }
        if (count < pages) {
            count++;
            currentUrl = `http:${$('.previous-comment-page').first().attr('href')}`;
            await sleep(50);
            await getOnePage(currentUrl);
        }
    }

    await getOnePage(currentUrl);
    return {
        title: `煎蛋无聊图-srr`,
        link: `${rootUrl}/pic`,
        item: final,
    };
}

export const route: Route = {
    path: '/wlt',
    name: '煎蛋无聊图',
    maintainers: [],
    example: '/jandan-wlt/wlt',
    handler,
};
