import { Route } from '@/types';
import gotOrig from 'got';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import config from './config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rootUrl = 'https://jandan.net';
const { cookie, apiUrl, pages, vote_positive, positive_rate, sizeLimit, authorBlackList } = config;

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
    post_title: string; // 例如 "无聊图"
    ip_location: string;
}

async function getImageSize(url: string): Promise<number> {
    try {
        const response = await gotOrig.head(url, {
            headers: {
                Referer: rootUrl,
                Cookie: cookie,
            },
        });
        const contentLength = response.headers['content-length'];
        return Number(contentLength);
    } catch (error) {
        // @ts-ignore
        // eslint-disable-next-line no-console
        console.error('Error occurred while sending HEAD request:', error.message);
        // 请求失败时返回 0，即视为正常大小（0MB < sizeLimit），不因网络问题误过滤图片
        return 0;
    }
}

const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    Referer: rootUrl,
    Cookie: cookie,
};

async function handler(/* ctx */) {
    // const { query } = ctx.req;
    // eslint-disable-next-line no-console
    // console.log('##query', query);
    const final: Item[] = [];
    const seenIds = new Set(); // 用于去重

    async function getOnePage(page: number) {
        const response = await got({
            method: 'get',
            url: `${apiUrl}?page=${page}`,
            headers: defaultHeaders,
        });

        const data = response.data;
        if (data.code === 0 && data.data?.list && Array.isArray(data.data.list)) {
            const items: Promise<Item>[] = data.data.list.map(async (apiItem: ApiItem) => {
                const content = apiItem.content;

                // 判断是否符合点赞条件
                const isPositive = apiItem.vote_positive > vote_positive && apiItem.vote_positive / (apiItem.vote_positive + apiItem.vote_negative) > positive_rate;

                // 判断作者是否在黑名单中
                const isAuthorOk = !authorBlackList.includes(apiItem.author);

                // 短路：点赞不达标或作者在黑名单，直接跳过 HEAD 请求
                let isSizeOk = true;
                if (isPositive && isAuthorOk) {
                    const imgRegex = /<img\s+src="([^"]+)"/g;
                    const matches = imgRegex.exec(content);
                    if (matches) {
                        const firstImgSize = await getImageSize(matches[1]);
                        isSizeOk = firstImgSize / (1024 * 1024) < sizeLimit;
                    }
                }

                // 煎蛋 API 返回的图片链接有时是压缩版 /mw1024/ 路径，GIF 会被压成静态图甚至 404。
                // 只需将压缩路径替换为 /large/ 即可获取原图，不需要走 CF 代理（代理反而有域名白名单限制等副作用）。
                const fixedContent = content.replaceAll(/<img([^>]+)src="([^"]+)"([^>]*)>/gi, (match, p1, p2, p3) => {
                    const fixedUrl = p2.replace(/\/(mw1024|bmiddle|small)\//i, '/large/');
                    return `<img${p1}src="${fixedUrl}"${p3}>`;
                });

                // 创建RSS条目，title 包含编号和作者，description 只保留图片
                const pubDate = parseDate(apiItem.date_gmt);
                return {
                    author: apiItem.author,
                    description: fixedContent,
                    title: `[No.${apiItem.id}] ${apiItem.author}`,
                    pubDate,
                    link: `${rootUrl}/t/${apiItem.id}`,
                    guid: `${rootUrl}/t/${apiItem.id}#v9`,
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

    // 先获取总页数
    const response = await got({
        method: 'get',
        url: apiUrl,
        headers: defaultHeaders,
    });

    const data = response.data;
    let totalPages = 1;
    if (data.code === 0 && data.data?.total_pages) {
        totalPages = data.data.total_pages;
    }

    // 根据pages配置倒序获取数据
    // 如果pages是[1,2,3]，那么实际获取的是[totalPages, totalPages-1, totalPages-2]
    const actualPages = pages.map((page) => totalPages - page + 1);

    // 获取指定页面的内容
    for (const page of actualPages) {
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
    name: '煎蛋无聊图v2',
    maintainers: [],
    example: '/jandan-wlt-v2/wlt',
    handler,
};
