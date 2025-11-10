import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import parser from '@/utils/rss-parser';
import { parseDate } from '@/utils/parse-date';
import { load } from 'cheerio';
import * as xml2js from 'xml2js';

export const route: Route = {
    path: '/:mp-id/:category/:include?/:limit?',
    categories: ['new-media', 'social-media'],
    example: '/we-mp-rss-proxy/MP_WXS_3941413004/travel/旅游,攻略/10',
    parameters: {
        'mp-id': '微信公众号ID，例如 MP_WXS_3941413004',
        category: '分类标签，例如 travel',
        include: '必须包含的关键词，用逗号分隔，例如 旅游,攻略',
        limit: '返回条数限制，例如 10',
    },
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
            source: ['we-mp-rss.trainspott.in/feed/:mp-id.atom'],
            target: '/:mp-id/:category',
        },
    ],
    name: '微信公众号RSS代理',
    maintainers: ['your-username'],
    handler,
    description: `代理微信公众号RSS源并支持内容过滤。

**查询参数：**
- \`include\`: 必须包含的关键字（用逗号分隔）
- \`exclude\`: 必须排除的关键字（用逗号分隔）
- \`limit\`: 返回条数限制（默认20条）

**使用示例：**
- \`/we-mp-rss-proxy/MP_WXS_3941413004\` - 获取所有内容
- \`/we-mp-rss-proxy/MP_WXS_3941413004?category=travel\` - 标记为旅游分类
- \`/we-mp-rss-proxy/MP_WXS_3941413004?category=travel&include=旅游,攻略\` - 只包含"旅游"或"攻略"的内容
- \`/we-mp-rss-proxy/MP_WXS_3941413004?exclude=广告,推广\` - 排除包含"广告"或"推广"的内容
- \`/we-mp-rss-proxy/MP_WXS_3941413004?include=旅游&exclude=广告&limit=10\` - 综合过滤并限制10条`,
};

// 辅助函数：提取HTML中的纯文本
function extractText(html: any): string {
    if (!html) {return '';}
    const $ = load(html);
    return $.text().trim();
}

async function handler(ctx) {
    const mpId = ctx.req.param('mp-id');
    const category = ctx.req.param('category') || 'default';
    const includeParam = ctx.req.param('include') || '';
    const limitParam = ctx.req.param('limit');

    // eslint-disable-next-line no-console
    console.log('请求参数:', {
        mpId,
        category,
        include: includeParam,
        limit: limitParam,
    });

    // 解析路径参数
    const includeKeywords = includeParam
        ? includeParam
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
        : [];
    const excludeKeywords = []; // 暂时固定为空，后续可以扩展为路径参数
    const limit = limitParam ? Number.parseInt(limitParam) : 20;

    // 上游RSS URL
    const upstreamUrl = `https://we-mp-rss.trainspott.in/feed/${mpId}.atom`;

    // 获取缓存键 - 基于路径参数，确保不同关键词有不同缓存
    const cacheKey = `we-mp-rss-proxy:${mpId}:${category}:${includeParam}:${limit || 20}`;

    const result = await cache.tryGet(
        cacheKey,
        async () => {
            try {
                // 获取上游RSS
                const response = await got({
                    method: 'get',
                    url: upstreamUrl,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; RSSHub/2.0; +https://github.com/DIYgod/RSSHub)',
                    },
                });

                // 先用标准解析器解析基本信息
                const feed = await parser.parseString(response.data);

                // 手动解析XML来获取content:encoded字段
                const xmlResult = await xml2js.parseStringPromise(response.data);
                const entries = xmlResult.feed?.entry || [];

                // 为每个条目添加content字段
                feed.items = feed.items.map((item, index) => {
                    const xmlEntry = entries[index];
                    if (xmlEntry && xmlEntry['content:encoded']) {
                        const contentEncoded = Array.isArray(xmlEntry['content:encoded']) ? xmlEntry['content:encoded'][0] : xmlEntry['content:encoded'];
                        const contentText = typeof contentEncoded === 'string' ? contentEncoded : contentEncoded._ || '';
                        item.content = contentText;
                    }
                    return item;
                });

                // 过滤和处理文章
                let filteredItems = feed.items || [];

                // 应用包含过滤器
                if (includeKeywords.length > 0) {
                    filteredItems = filteredItems.filter((item) => {
                        const title = (item.title || '').toLowerCase();
                        // 优先使用content字段，如果没有则使用summary
                        const fullContent = item.content || item.summary || '';
                        const content = extractText(fullContent).toLowerCase();
                        const fullText = `${title} ${content}`;

                        // 当前是OR关系：包含任一关键词即可
                        // 如需AND关系，改为：
                        // return includeKeywords.every((keyword) => fullText.includes(keyword.toLowerCase()));
                        return includeKeywords.some((keyword) => fullText.includes(keyword.toLowerCase()));
                    });
                }

                // 应用排除过滤器
                if (excludeKeywords.length > 0) {
                    filteredItems = filteredItems.filter((item) => {
                        const title = (item.title || '').toLowerCase();
                        // 优先使用content字段，如果没有则使用summary
                        const fullContent = item.content || item.summary || '';
                        const content = extractText(fullContent).toLowerCase();
                        const fullText = `${title} ${content}`;

                        return !excludeKeywords.some((keyword) => fullText.includes(keyword.toLowerCase()));
                    });
                }

                // 限制条数
                filteredItems = filteredItems.slice(0, limit);

                // 调试信息
                // eslint-disable-next-line no-console
                console.log('过滤结果统计:', {
                    原始条目数: feed.items?.length || 0,
                    过滤后条目数: filteredItems.length,
                    包含关键词: includeKeywords,
                    排除关键词: excludeKeywords,
                    限制条数: limit,
                });

                // 格式化输出
                const processedItems = filteredItems.map((item) => ({
                    title: item.title || '',
                    link: item.link || '',
                    description: item.summary || '',
                    pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
                    author: item.creator || item.author || '',
                    category: item.categories || [],
                    guid: item.guid || item.link,
                }));

                return {
                    title: `${feed.title || mpId} - ${category} | RSSHub代理`,
                    description: `${feed.description || `微信公众号 ${mpId} 的 ${category} 分类内容`} | 已过滤: ${includeKeywords.length > 0 ? `包含[${includeKeywords.join(', ')}]` : '无'} ${excludeKeywords.length > 0 ? `排除[${excludeKeywords.join(', ')}]` : ''}`,
                    link: feed.link || upstreamUrl,
                    image: feed.image?.url || feed.image,
                    language: feed.language || 'zh-cn',
                    lastBuildDate: feed.lastBuildDate,
                    item: processedItems,
                };
            } catch (error) {
                return {
                    title: `RSS获取失败 - ${mpId}`,
                    description: `无法获取上游RSS源: ${upstreamUrl}，错误: ${error instanceof Error ? error.message : String(error)}`,
                    link: upstreamUrl,
                    item: [],
                };
            }
        },
        3600
    ); // 缓存1小时

    return result;
}
