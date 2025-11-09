import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import parser from '@/utils/rss-parser';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/:mp-id',
    categories: ['new-media', 'social-media'],
    example: '/we-mp-rss-proxy/MP_WXS_3941413004?category=travel&include=旅游,攻略&exclude=广告',
    parameters: {
        'mp-id': '微信公众号ID，例如 MP_WXS_3941413004',
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

async function handler(ctx) {
    const mpId = ctx.req.param('mp-id').replace(/\.xml$/, ''); // 移除.xml后缀

    // 获取查询参数
    const category = ctx.req.query('category') || 'default';
    const includeKeywords =
        ctx.req
            .query('include')
            ?.split(',')
            .map((k) => k.trim())
            .filter(Boolean) || [];
    const excludeKeywords =
        ctx.req
            .query('exclude')
            ?.split(',')
            .map((k) => k.trim())
            .filter(Boolean) || [];
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;

    // 上游RSS URL
    const upstreamUrl = `https://we-mp-rss.trainspott.in/feed/${mpId}.atom`;

    // 获取缓存键
    const cacheKey = `we-mp-rss-proxy:${mpId}:${category}:${JSON.stringify({
        include: includeKeywords,
        exclude: excludeKeywords,
        limit,
    })}`;

    // 尝试从缓存获取
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

                // 解析RSS
                const feed = await parser.parseString(response.data);

                // 过滤和处理文章
                let filteredItems = feed.items || [];

                // 应用包含过滤器
                if (includeKeywords.length > 0) {
                    filteredItems = filteredItems.filter((item) => {
                        const title = (item.title || '').toLowerCase();
                        const content = (item.content || item.description || '').toLowerCase();
                        const fullText = `${title} ${content}`;

                        return includeKeywords.some((keyword) => fullText.includes(keyword.toLowerCase()));
                    });
                }

                // 应用排除过滤器
                if (excludeKeywords.length > 0) {
                    filteredItems = filteredItems.filter((item) => {
                        const title = (item.title || '').toLowerCase();
                        const content = (item.content || item.description || '').toLowerCase();
                        const fullText = `${title} ${content}`;

                        return !excludeKeywords.some((keyword) => fullText.includes(keyword.toLowerCase()));
                    });
                }

                // 限制条数
                filteredItems = filteredItems.slice(0, limit);

                // 格式化输出
                const processedItems = filteredItems.map((item) => ({
                    title: item.title || '',
                    link: item.link || '',
                    description: item.content || item.description || '',
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
            } catch {
                return {
                    title: `RSS获取失败 - ${mpId}`,
                    description: `无法获取上游RSS源: ${upstreamUrl}`,
                    link: upstreamUrl,
                    item: [],
                };
            }
        },
        3600
    ); // 缓存1小时

    return result;
}
