import { Route } from '@/types';
import gotOrig from 'got';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import config from './config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rootUrl = 'https://jandan.net';
const apiUrl = 'https://jandan.net/api/comment/post/26402';
const { pages, vote_positive, positive_rate, sizeLimit, authorBlackList } = config;

interface Item {
    author: string;
    description: string;
    title: string;
    pubDate: Date;
    link: string;
    isShow: boolean;
}

interface ApiItem {
    id: number;
    post_id: number;
    author: string;
    author_type: number;
    date_gmt: string;
    user_id: number;
    content: string;
    vote_positive: number;
    vote_negative: number;
    sub_comment_count: number;
    images: null | any;
    post_title: string;
    ip_location: string;
}

async function getImageSize(url: string): Promise<number> {
    try {
        const response = await gotOrig.head(url, {
            headers: {
                Referer: rootUrl,
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
    // eslint-disable-next-line no-console
    console.log('##query', query);
    const final: Item[] = [];
    const seenIds = new Set(); // 用于去重

    async function getOnePage(page: number) {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            Referer: rootUrl,
        };

        const response = await got({
            method: 'get',
            url: `${apiUrl}?order=desc&page=${page}`,
            headers,
        });

        const data = response.data;
        if (data.code === 0 && data.data?.list && Array.isArray(data.data.list)) {
            const items: Promise<Item>[] = data.data.list.map(async (apiItem: ApiItem) => {
                // 判断是否符合点赞条件
                const isPositive = apiItem.vote_positive > vote_positive && apiItem.vote_positive / (apiItem.vote_positive + apiItem.vote_negative) > positive_rate;

                // 判断作者是否在黑名单中
                const isAuthorOk = !authorBlackList.includes(apiItem.author);

                // 提取图片URL并检查大小
                const imgRegex = /<img\s+src="([^"]+)"/g;
                let matches;
                let firstImgSize = 0;
                const content = apiItem.content;

                if ((matches = imgRegex.exec(content)) !== null) {
                    const imgUrl = matches[1];
                    firstImgSize = await getImageSize(imgUrl);
                }

                const isSizeOk = firstImgSize / (1024 * 1024) < sizeLimit;

                // 创建RSS条目
                return {
                    author: apiItem.author,
                    description: content,
                    title: `${apiItem.author}: ${apiItem.content.replaceAll(/<[^>]+>/g, '').substring(0, 50)}...`,
                    pubDate: parseDate(apiItem.date_gmt),
                    link: `${rootUrl}/t/${apiItem.id}`,
                    isShow: isPositive && isSizeOk && isAuthorOk,
                };
            });

            const processedItems = await Promise.all(items);
            for (const item of processedItems) {
                if (item.isShow && !seenIds.has(item.link)) {
                    seenIds.add(item.link);
                    final.push(item);
                }
            }
        }
    }

    // 获取指定页面的内容
    for (const page of pages) {
        await getOnePage(page); // eslint-disable-line no-await-in-loop
        await sleep(100); // eslint-disable-line no-await-in-loop
    }

    return {
        title: `煎蛋无聊图`,
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
