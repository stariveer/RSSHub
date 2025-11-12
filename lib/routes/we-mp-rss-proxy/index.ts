import { Route, Data } from '@/types';
import { Context } from 'hono';
import cache from '@/utils/cache';
import got from '@/utils/got';
import parser from '@/utils/rss-parser';
import { parseDate } from '@/utils/parse-date';
import * as xml2js from 'xml2js';

// 导入工具模块
import { cleanHtmlContent } from './utils/html-processor';
import { parseLandeContent, ProductInfo } from './utils/product-parser';
import { generateProductTable, generateLandeHtml, generateLandeJson } from './utils/file-generator';
import { parseFilterParams, applyContentFilter } from './utils/content-filter';

export const route: Route = {
    path: '/:mp-id/:category/:include?',
    categories: ['new-media', 'social-media'],
    example: '/we-mp-rss-proxy/MP_WXS_3941413004/travel/+旅游,攻略',
    parameters: {
        'mp-id': '微信公众号ID，例如 MP_WXS_3941413004',
        category: '分类标签，例如 travel',
        filter: '过滤条件，支持：+旅游,攻略（包含）或 -广告,推广（排除），可组合：+旅游,-广告',
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

**路径参数：**
- \`filter\`: 过滤条件，支持以下格式：
  - \`+旅游,攻略\`：包含"旅游"或"攻略"的内容
  - \`-广告,推广\`：排除包含"广告"或"推广"的内容
  - \`+旅游,-广告\`：包含"旅游"但排除"广告"的内容
  - 支持多个组合，用逗号分隔
- 固定返回20条内容

**特殊分类：**
- \`lande\`：该分类会自动过滤，只保留标题包含"零售参考报价"的文章，忽略其他过滤参数

**使用示例：**
- \`/we-mp-rss-proxy/MP_WXS_3941413004/default\` - 获取所有内容
- \`/we-mp-rss-proxy/MP_WXS_3941413004/travel\` - 标记为旅游分类
- \`/we-mp-rss-proxy/MP_WXS_3941413004/travel/+旅游,攻略\` - 只包含"旅游"或"攻略"的内容
- \`/we-mp-rss-proxy/MP_WXS_3941413004/default/-广告,推广\` - 排除包含"广告"或"推广"的内容
- \`/we-mp-rss-proxy/MP_WXS_3941413004/travel/+旅游,-广告\` - 包含"旅游"但排除"广告"的内容
- \`/we-mp-rss-proxy/MP_WXS_2397228061/lande\` - 只保留标题包含"零售参考报价"的文章`,
};

async function handler(ctx: Context): Promise<Data> {
    const mpId = ctx.req.param('mp-id');
    const category = ctx.req.param('category') || 'default';
    const filterParam = ctx.req.param('include') || '';

    // eslint-disable-next-line no-console
    console.log('请求参数:', {
        mpId,
        category,
        filter: filterParam,
    });

    // 解析过滤参数
    const { includeKeywords, excludeKeywords } = parseFilterParams(filterParam);

    const limit = 20; // 写死为20条

    // 上游RSS URL
    const upstreamUrl = `https://we-mp-rss.trainspott.in/feed/${mpId}.atom`;

    // 获取缓存键 - 基于路径参数，确保不同关键词有不同缓存
    const cacheKey = `we-mp-rss-proxy:${mpId}:${category}:${filterParam}`;

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
                let filteredItems = applyContentFilter(feed.items, category, includeKeywords, excludeKeywords);

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

                // 存储每篇文章的产品数据，用于JSON生成
                const allProducts: ProductInfo[][] = [];

                // 格式化输出
                const processedItems = filteredItems.map((item) => {
                    let description: string;

                    if (category === 'lande') {
                        // 对于lande分类，使用表格化处理
                        try {
                            const products = parseLandeContent(item.content || item.summary || '');
                            // 保存每篇文章的产品数据
                            allProducts.push(products);
                            if (products.length > 0) {
                                description = generateProductTable(products);
                                // eslint-disable-next-line no-console
                                console.log(`Lande分类处理成功: 解析出${products.length}个产品`);
                            } else {
                                description = cleanHtmlContent(item.content || item.summary || '', includeKeywords);
                                // eslint-disable-next-line no-console
                                console.log('Lande分类未解析到产品信息，使用默认处理');
                            }
                        } catch (error) {
                            // eslint-disable-next-line no-console
                            console.error('Lande分类解析失败:', error);
                            description = cleanHtmlContent(item.content || item.summary || '', includeKeywords);
                            allProducts.push([]); // 确保数组长度对应
                        }
                    } else if (category === 'travel') {
                        // travel分类使用原有的清理逻辑
                        description = cleanHtmlContent(item.content || item.summary || '', includeKeywords);
                        allProducts.push([]); // 非lande分类，添加空数组
                    } else {
                        // 其他分类直接返回原内容
                        description = item.content || item.summary || '';
                        allProducts.push([]); // 非lande分类，添加空数组
                    }

                    return {
                        title: item.title || '',
                        link: item.link || '',
                        description,
                        pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
                        author: (item as any).creator || (item as any).author || '',
                        category: item.categories || [],
                        guid: item.guid || item.link,
                    };
                });

                const result = {
                    title: `${feed.title || mpId} - ${category} | RSSHub代理`,
                    description: `${feed.description || `微信公众号 ${mpId} 的 ${category} 分类内容`} | 已过滤: ${
                        includeKeywords.length > 0 ? `包含[${includeKeywords.join(', ')}]` : '无'
                    } ${excludeKeywords.length > 0 ? `排除[${excludeKeywords.join(', ')}]` : ''}`,
                    link: feed.link || upstreamUrl,
                    image: feed.image?.url || feed.image,
                    language: feed.language || 'zh-cn',
                    lastBuildDate: feed.lastBuildDate,
                    item: processedItems,
                };

                // 如果是 lande 分类，为每篇文章自动生成 HTML 和 JSON 文件
                if (category === 'lande' && processedItems.length > 0) {
                    for (const [index, processedItem] of processedItems.entries()) {
                        // 获取对应的产品数据
                        const products = allProducts[index] || [];

                        // 异步生成 HTML 文件，不阻塞 RSS 响应
                        generateLandeHtml(processedItem.title || '', processedItem.description || '', products).catch((error) => {
                            // eslint-disable-next-line no-console
                            console.error('异步生成 HTML 文件失败:', error);
                        });

                        // 异步生成 JSON 文件，不阻塞 RSS 响应，传入产品数据
                        generateLandeJson(processedItem.title || '', products).catch((error) => {
                            // eslint-disable-next-line no-console
                            console.error('异步生成 JSON 文件失败:', error);
                        });
                    }
                }

                return result;
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

    // 确保 result 符合 Data 类型，处理可能的 null 或字符串类型
    if (!result || typeof result === 'string') {
        return {
            title: `RSS获取失败 - ${mpId}`,
            description: `缓存获取失败: ${upstreamUrl}`,
            link: upstreamUrl,
            item: [],
        };
    }

    return result as Data;
}
