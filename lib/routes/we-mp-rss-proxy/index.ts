import { Route, Data } from '@/types';
import { Context } from 'hono';
import cache from '@/utils/cache';
import got from '@/utils/got';
import parser from '@/utils/rss-parser';
import { parseDate } from '@/utils/parse-date';
import { load } from 'cheerio';
import * as xml2js from 'xml2js';
import { writeFile } from 'fs/promises';
import path from 'path';

// HTML 自动生成开关
const ENABLE_HTML_GENERATION = process.env.ENABLE_LANDE_HTML === 'true';

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

// 辅助函数：提取HTML中的纯文本
function extractText(html: any): string {
    if (!html) {
        return '';
    }
    const $ = load(html);
    return $.text().trim();
}

// 辅助函数：判断图片是否为GIF格式
function isGifImage(src: string): boolean {
    const lowerSrc = src.toLowerCase();
    // 检查文件扩展名或微信URL参数
    return lowerSrc.endsWith('.gif') || lowerSrc.includes('wx_fmt=gif');
}

// 辅助函数：清理HTML内容，只保留文本和图片，并在文本后添加换行符
function cleanHtmlContent(html: any, includeKeywords: string[] = []): string {
    if (!html) {
        return '';
    }

    const $ = load(html);
    const allContent: string[] = [];
    const prioritizedContent: string[] = [];

    // 递归处理节点，保持原文顺序
    function processNode(element: any): void {
        if (element.type === 'text') {
            const text = $(element).text().trim();
            if (text) {
                allContent.push(text);
            }
        } else if (element.type === 'tag') {
            const tagName = element.tagName?.toLowerCase();

            if (tagName === 'img') {
                // 保留图片标签，但过滤掉GIF图片
                const src = $(element).attr('src');
                const alt = $(element).attr('alt') || '';
                if (src && !isGifImage(src)) {
                    allContent.push(`<img src="${src}" alt="${alt}" />`);
                }
            } else {
                // 对于其他标签，递归处理子节点
                $(element)
                    .contents()
                    .each((_: any, child: any) => {
                        processNode(child);
                    });
            }
        }
    }

    // 处理根节点下的所有内容
    $.root()
        .contents()
        .each((_: any, element: any) => {
            processNode(element);
        });

    // 如果有包含关键词，进行内容重排
    if (includeKeywords.length > 0) {
        const usedIndices = new Set<number>();

        // 首先找到所有包含关键词的内容块
        for (let i = 0; i < allContent.length; i++) {
            if (usedIndices.has(i)) {
                continue;
            }

            const currentContent = allContent[i];
            const isTextContent = !currentContent.includes('<img');

            if (isTextContent) {
                const containsKeyword = includeKeywords.some((keyword) => currentContent.toLowerCase().includes(keyword.toLowerCase()));

                if (containsKeyword) {
                    // 找到包含关键词的内容，收集这个文本和后续文本，直到遇到图片
                    const matchedContent: string[] = [];
                    let j = i;

                    // 收集从当前位置开始到第一张图片的所有内容
                    while (j < allContent.length && !allContent[j].includes('<img')) {
                        matchedContent.push(allContent[j]);
                        usedIndices.add(j);
                        j++;
                    }

                    // 如果遇到了图片，也收集这张图片
                    if (j < allContent.length && allContent[j].includes('<img')) {
                        matchedContent.push(allContent[j]);
                        usedIndices.add(j);
                        j++;
                    }

                    // 将匹配的内容块添加到优先内容中
                    prioritizedContent.push(...matchedContent);
                }
            }
        }

        // 添加未被使用的内容到剩余内容中
        const remainingContent: string[] = [];
        for (const [index, content] of allContent.entries()) {
            if (!usedIndices.has(index)) {
                remainingContent.push(content);
            }
        }

        // 组合结果：优先内容在前，剩余内容在后
        const finalContent = [...prioritizedContent, ...remainingContent];
        return finalContent.map((content) => content + '<br>').join('');
    }

    // 在每个内容后添加<br>
    return allContent.map((content) => content + '<br>').join('');
}

// 产品信息接口定义
interface ProductInfo {
    brand?: string | null; // 允许为null，用于过滤非Apple产品
    model: string;
    version: string;
    region: string;
    storage: string;
    colors: string[];
    status: string;
    prices: number[];
    notes: string;
    originalText: string;
}

// 解析lande分类的产品信息
function parseLandeContent(html: any): ProductInfo[] {
    if (!html) {
        return [];
    }

    const $ = load(html);
    const textContent = $.text().trim();

    // 按行分割文本
    const lines = textContent.split('\n').filter((line) => line.trim());
    const products: ProductInfo[] = [];

    // Apple产品专用正则表达式模式
    const appleProductPatterns = [
        // 完整模式: iPhone17ProMax行换行双卡全网（256G）官换单机未激活 银/蓝/橙【现货】9690/9690/9570
        /((?:iPhone|iPad|MacBook|iMac|Mac|Apple\s*Watch|AirPods)[\d\sA-Za-z]*)([^（]*?)（(\d+[GT]?)）([^【]*?)【([^】]+)】\s*([\d/]+)?(.*)?/,
        // 无存储版本: iPhone17ProMax美版全网银/蓝/橙【现货】9690/9690/9570
        /((?:iPhone|iPad|MacBook|iMac|Mac|Apple\s*Watch|AirPods)[\d\sA-Za-z]*)([^【（]*?)【([^】]+)】\s*([\d/]+)?(.*)?/,
    ];

    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.length < 10) {
            continue;
        }

        // 跳过标题行和无关内容
        if (cleanLine.includes('云鹏数码') || cleanLine.includes('报价单') || cleanLine.includes('零售参考报价') || cleanLine.includes('﹀') || cleanLine.length < 20) {
            continue;
        }

        let matched = false;

        // 使用Apple产品专用正则表达式模式
        for (const pattern of appleProductPatterns) {
            const match = cleanLine.match(pattern);
            if (match) {
                const rawModel = match[1].trim();
                const brand = detectBrand(rawModel);

                // 只处理Apple产品，非Apple产品直接跳过
                if (!brand || brand !== 'Apple') {
                    matched = true; // 标记为已匹配，但跳过
                    break;
                }

                // 格式化产品名称
                const formattedModel = formatProductName(rawModel);

                // 使用不同的匹配组索引，根据正则表达式模式
                let versionAndRegion = '';
                let storage = '';
                let colorsText = '';
                let status = '';
                let pricesText = '';
                let notes = '';

                if (match[3]) {
                    // 有存储容量的模式: ((model)(versionAndRegion)(storage)(statusAndColors)【status】(prices)(notes)
                    versionAndRegion = match[2]?.trim() || '';
                    storage = match[3] || '';
                    // 这里需要从 match[4] 中分离状态和颜色
                    const beforeBrackets = match[4] || '';
                    const lastSpaceIndex = beforeBrackets.lastIndexOf(' ');
                    if (lastSpaceIndex > 0) {
                        status = beforeBrackets.substring(0, lastSpaceIndex);
                        colorsText = beforeBrackets.substring(lastSpaceIndex + 1);
                    } else {
                        colorsText = beforeBrackets;
                        status = '现货';
                    }
                    const statusMatch = cleanLine.match(/【([^】]+)】/);
                    status = statusMatch ? statusMatch[1] : status || '现货';
                    pricesText = match[7] || '';
                    notes = (match[8] || '').trim();
                } else {
                    // 无存储容量的模式: ((model)(versionAndStatusAndColors)【status】(prices)(notes)
                    versionAndRegion = match[2]?.trim() || '';
                    const beforeBrackets = match[4] || '';
                    // 从版本、状态和颜色混合中分离
                    const parts = beforeBrackets.split(' ');
                    if (parts.length >= 2) {
                        // 最后一个部分应该是颜色
                        colorsText = parts.at(-1) || '';
                        // 前面的部分是版本和状态
                        versionAndRegion = parts.slice(0, -1).join(' ');
                    } else {
                        // 如果没有空格，可能只是版本信息
                        versionAndRegion = beforeBrackets;
                    }
                    const statusMatch = cleanLine.match(/【([^】]+)】/);
                    status = statusMatch ? statusMatch[1] : '现货';
                    pricesText = match[6] || '';
                    notes = (match[7] || '').trim();
                }

                const region = extractRegion(versionAndRegion);
                const version = versionAndRegion.replaceAll(/(国行|港行|台版|美版|欧版|韩版|日版)/g, '').trim();

                // 改进存储和地区信息解析
                let finalRegion = region;

                // 如果storage中包含地区信息，将其分离
                if (storage && (storage.includes('版') || storage.includes('港') || storage.includes('台'))) {
                    const storageRegion = extractRegion(storage);
                    if (storageRegion) {
                        finalRegion = storageRegion;
                        storage = storage.replaceAll(/(国行|港行|台版|美版|欧版|韩版|日版)/g, '').trim();
                    }
                }

                // 直接从原始文本中提取价格，这样更准确
                const actualPrices = extractPricesFromText(cleanLine);

                // 从【】中提取真实状态，而不是价格
                const statusMatch = cleanLine.match(/【([^】]+)】/);
                const realStatus = statusMatch ? statusMatch[1] : '现货';

                const product: ProductInfo = {
                    brand,
                    model: formattedModel,
                    version:
                        version ||
                        cleanLine
                            .replace(rawModel, '')
                            .replace(/（[^）]*）/, '')
                            .replace(/【[^】]*】/, '')
                            .trim(),
                    region: finalRegion,
                    storage,
                    colors: extractColors(colorsText),
                    status: realStatus,
                    prices: actualPrices,
                    notes,
                    originalText: cleanLine,
                };

                products.push(product);
                matched = true;
                break;
            }
        }

        // 如果没有匹配到标准模式，但包含Apple关键词，尝试简单提取
        if (!matched && cleanLine.includes('【')) {
            const appleKeywords = ['iPhone', 'iPad', 'Mac', 'Apple Watch', 'AirPods', 'MacBook', 'iMac'];
            const hasAppleKeyword = appleKeywords.some((keyword) => cleanLine.toLowerCase().includes(keyword.toLowerCase()));

            if (hasAppleKeyword) {
                const simpleMatch = cleanLine.match(/([^【]+)【([^】]+)】\s*([\d/]+)?(.*)?/);
                if (simpleMatch) {
                    const rawModel = simpleMatch[1].trim();
                    const brand = detectBrand(rawModel);

                    // 只处理Apple产品
                    if (brand && brand === 'Apple') {
                        // 直接从原始文本中提取价格
                        const actualPrices = extractPricesFromText(cleanLine);

                        // 从【】中提取真实状态
                        const statusMatch = cleanLine.match(/【([^】]+)】/);
                        const realStatus = statusMatch ? statusMatch[1] : '现货';

                        const product: ProductInfo = {
                            brand,
                            model: formatProductName(rawModel),
                            version: '',
                            region: '',
                            storage: '',
                            colors: [],
                            status: realStatus,
                            prices: actualPrices,
                            notes: (simpleMatch[4] || '').trim(),
                            originalText: cleanLine,
                        };
                        products.push(product);
                    }
                }
            }
        }
    }

    return products;
}

// 检测品牌 - 只检测Apple产品，其他都返回null
function detectBrand(model: string): string | null {
    const modelLower = model.toLowerCase();
    if (modelLower.includes('iphone') || modelLower.includes('ipad') || modelLower.includes('mac') || modelLower.includes('apple watch') || modelLower.includes('airpods') || modelLower.includes('apple')) {
        return 'Apple';
    }
    return null; // 非Apple产品返回null
}

// 格式化产品名称，统一空格格式
function formatProductName(model: string): string {
    let formatted = model.trim();

    // iPhone 系列格式化
    if (formatted.toLowerCase().includes('iphone')) {
        // 处理特殊格式：iPhone17PROMAX -> iPhone 17 Pro Max (必须先处理，因为PROMAX是一个整体)
        formatted = formatted.replace(/iphone\s*(\d+)promax/i, 'iPhone $1 Pro Max');
        formatted = formatted.replace(/iphone(\d+)promax/i, 'iPhone $1 Pro Max');
        formatted = formatted.replace(/iphone\s*(\d+)pro/i, 'iPhone $1 Pro');
        formatted = formatted.replace(/iphone(\d+)pro/i, 'iPhone $1 Pro');
        formatted = formatted.replace(/iphone\s*(\d+)max/i, 'iPhone $1 Max');
        formatted = formatted.replace(/iphone(\d+)max/i, 'iPhone $1 Max');
        formatted = formatted.replace(/iphone\s*(\d+)plus/i, 'iPhone $1 Plus');
        formatted = formatted.replace(/iphone(\d+)plus/i, 'iPhone $1 Plus');
        formatted = formatted.replace(/iphone\s*(\d+)mini/i, 'iPhone $1 mini');
        formatted = formatted.replace(/iphone(\d+)mini/i, 'iPhone $1 mini');
        formatted = formatted.replace(/iphone\s*(\d+)air/i, 'iPhone $1 Air');
        formatted = formatted.replace(/iphone(\d+)air/i, 'iPhone $1 Air');

        // iPhone17ProMax -> iPhone 17 Pro Max (当Pro和Max分开时)
        formatted = formatted.replace(/iphone(\d+)(pro)?(max)?(air)?(mini)?(plus)?/i, (_match, num, pro, max, air, mini, plus) => {
            let result = 'iPhone ' + num;
            if (pro?.toLowerCase() === 'pro') {
                result += ' Pro';
            }
            if (max?.toLowerCase() === 'max') {
                result += ' Max';
            }
            if (air?.toLowerCase() === 'air') {
                result += ' Air';
            }
            if (mini?.toLowerCase() === 'mini') {
                result += ' mini';
            }
            if (plus?.toLowerCase() === 'plus') {
                result += ' Plus';
            }
            return result;
        });
    }
    // iPad 系列格式化
    else if (formatted.toLowerCase().includes('ipad')) {
        // iPadPro -> iPad Pro
        formatted = formatted.replace(/ipad\s*pro/i, 'iPad Pro');
        // iPadAir -> iPad Air
        formatted = formatted.replace(/ipad\s*air/i, 'iPad Air');
        // iPadmini -> iPad mini
        formatted = formatted.replace(/ipad\s*mini/i, 'iPad mini');
    }
    // Mac 系列格式化
    else if (formatted.toLowerCase().includes('mac')) {
        // MacBookPro -> MacBook Pro
        formatted = formatted.replace(/macbook\s*pro/i, 'MacBook Pro');
        // MacBookAir -> MacBook Air
        formatted = formatted.replace(/macbook\s*air/i, 'MacBook Air');
        // MacPro -> Mac Pro
        formatted = formatted.replace(/mac\s*pro/i, 'Mac Pro');
        // MacMini -> Mac mini
        formatted = formatted.replace(/mac\s*mini/i, 'Mac mini');
        // iMac -> iMac
        formatted = formatted.replace(/imac/i, 'iMac');
    }
    // Apple Watch 系列
    else if (formatted.toLowerCase().includes('apple watch') || formatted.toLowerCase().includes('iwatch')) {
        formatted = formatted.replace(/(apple\s*watch|iwatch)\s*(\d+)/i, 'Apple Watch $2');
        formatted = formatted.replace(/apple\s*watch/i, 'Apple Watch');
    }

    return formatted;
}

// 提取地区信息
function extractRegion(version: string): string {
    if (version.includes('国行')) {
        return '国行';
    }
    if (version.includes('港行')) {
        return '港行';
    }
    if (version.includes('台版')) {
        return '台版';
    }
    if (version.includes('美版')) {
        return '美版';
    }
    if (version.includes('欧版')) {
        return '欧版';
    }
    if (version.includes('韩版')) {
        return '韩版';
    }
    if (version.includes('日版')) {
        return '日版';
    }
    return '';
}

// 提取颜色信息
function extractColors(colorText: string): string[] {
    if (!colorText) {
        return [];
    }

    // 移除状态标记和价格信息
    const cleanColorText = colorText
        .replaceAll(/【[^】]*】/g, '')
        .replace(/[\d/]+$/, '')
        .trim();

    // 按斜杠分割颜色
    const colors = cleanColorText
        .split('/')
        .map((color) => color.trim())
        .filter(
            (color) => color && !color.includes('现货') && !color.includes('带票') && !color.includes('联保') && !color.includes('改好') && !color.includes('卡贴') && !/\d/.test(color) // 排除包含数字的项（通常是价格）
        );

    return colors.length > 0 ? colors : [];
}

// 解析价格信息
function parsePrices(priceText: string): number[] {
    if (!priceText) {
        return [];
    }

    // 提取所有数字，包括斜杠分隔的价格
    const numbers = priceText.match(/\d+/g);
    if (!numbers) {
        return [];
    }

    return numbers.map((num) => Number.parseInt(num, 10)).filter((num) => num > 0 && num < 100000);
}

// 从完整文本中提取价格信息（在【】后面的数字）
function extractPricesFromText(text: string): number[] {
    // 查找【】后面的价格
    const priceMatch = text.match(/【([^】]+)】\s*([\d/]+)/);
    if (priceMatch) {
        return parsePrices(priceMatch[2]);
    }

    // 如果没找到【】，尝试直接查找斜杠分隔的数字
    const directPriceMatch = text.match(/([\d/]+)\s*$/);
    if (directPriceMatch) {
        return parsePrices(directPriceMatch[1]);
    }

    return [];
}

// 提取存储容量数值（用于排序）
function getStorageSize(storage: string): number {
    if (!storage) {
        return 0;
    }

    // 提取数字和单位部分，支持 G, GB, T, TB 单位
    const match = storage.match(/(\d+)\s*([gt]?b?)/i);
    if (match) {
        const size = Number.parseInt(match[1], 10);
        const unit = (match[2] || '').toLowerCase();

        // 将T单位转换为GB
        if (unit.includes('t')) {
            return size * 1024; // 1T = 1024GB
        }
        return size; // GB单位直接返回
    }

    return 0;
}

// iPhone专用排序比较函数
function compareiPhoneProducts(a: ProductInfo, b: ProductInfo): number {
    const aModel = a.model.toLowerCase();
    const bModel = b.model.toLowerCase();

    // 提取iPhone型号数字
    const aMatch = aModel.match(/iphone\s*(\d+)/i);
    const bMatch = bModel.match(/iphone\s*(\d+)/i);
    const aModelNum = aMatch ? Number.parseInt(aMatch[1], 10) : 0;
    const bModelNum = bMatch ? Number.parseInt(bMatch[1], 10) : 0;

    // 1. 首先按型号排序：17 > 16 > 15 > ... (新机型在前)
    if (aModelNum !== bModelNum) {
        return bModelNum - aModelNum; // 新型号在前
    }

    // 2. 同型号按等级排序：Pro Max > Pro > Plus > 标准 > mini
    function getTierWeight(model: string): number {
        if (model.includes('pro max')) {
            return 1;
        }
        if (model.includes('pro')) {
            return 2;
        }
        if (model.includes('plus')) {
            return 3;
        }
        if (model.includes('mini')) {
            return 4;
        }
        if (model.includes('se')) {
            return 5;
        }
        return 3; // 标准版
    }

    const aTierWeight = getTierWeight(aModel);
    const bTierWeight = getTierWeight(bModel);

    if (aTierWeight !== bTierWeight) {
        return aTierWeight - bTierWeight; // Pro Max在最前
    }

    // 3. 同型号同等级按存储容量排序：容量大的在前
    const aStorage = getStorageSize(a.storage);
    const bStorage = getStorageSize(b.storage);

    if (aStorage !== bStorage) {
        return bStorage - aStorage; // 容量大的在前
    }

    // 4. 最后按版本排序：国行 > 港行 > 台版 > 美版 > 欧版 > 其他
    function getRegionWeight(region: string): number {
        if (region.includes('国行')) {
            return 1;
        }
        if (region.includes('港行')) {
            return 2;
        }
        if (region.includes('台版')) {
            return 3;
        }
        if (region.includes('美版')) {
            return 4;
        }
        if (region.includes('欧版')) {
            return 5;
        }
        if (region.includes('韩版')) {
            return 6;
        }
        if (region.includes('日版')) {
            return 7;
        }
        return 8; // 其他
    }

    const aRegionWeight = getRegionWeight(a.region);
    const bRegionWeight = getRegionWeight(b.region);

    return aRegionWeight - bRegionWeight;
}

// 获取产品排序权重
function getProductSortWeight(product: ProductInfo): number {
    const modelLower = product.model.toLowerCase();

    // 产品系列优先级：iPhone > iPad > Mac > Apple Watch > AirPods
    let seriesWeight = 1000;
    if (modelLower.includes('iphone')) {
        seriesWeight = 1; // iPhone 权重设为最小，确保排在最前
    } else if (modelLower.includes('ipad')) {
        seriesWeight = 100; // iPad 权重大一些
    } else if (modelLower.includes('macbook') || modelLower.includes('imac') || (modelLower.includes('mac') && !modelLower.includes('ipad'))) {
        seriesWeight = 300;
    } else if (modelLower.includes('apple watch') || (modelLower.includes('watch') && !modelLower.includes('ipad'))) {
        seriesWeight = 400;
    } else if (modelLower.includes('airpods')) {
        seriesWeight = 500;
    }

    // iPhone 特殊排序：按型号和等级
    if (modelLower.includes('iphone')) {
        const modelMatch = modelLower.match(/iphone\s*(\d+)/i);
        const modelNumber = modelMatch ? Number.parseInt(modelMatch[1], 10) : 0;

        // 型号权重：新机型权重更低（排在前面）
        const modelWeight = (100 - modelNumber) * 10;

        // 等级权重：Pro Max < Pro < Plus < 标准 < mini（数值越小越靠前）
        let tierWeight = 50;
        if (modelLower.includes('pro max')) {
            tierWeight = 10;
        } else if (modelLower.includes('pro')) {
            tierWeight = 20;
        } else if (modelLower.includes('plus')) {
            tierWeight = 30;
        } else if (modelLower.includes('mini')) {
            tierWeight = 40;
        } else if (modelLower.includes('se')) {
            tierWeight = 60;
        }

        // 存储容量权重：容量越大权重越小（排在前面）
        const storageSize = getStorageSize(product.storage);
        const storageWeight = storageSize > 0 ? Math.max(0, 1000 - storageSize) : 999; // 无容量信息排在最后

        return seriesWeight + modelWeight + tierWeight + storageWeight;
    }

    // iPad 排序逻辑
    if (modelLower.includes('ipad')) {
        let tierWeight = 50;
        if (modelLower.includes('pro')) {
            tierWeight = 10;
        } else if (modelLower.includes('air')) {
            tierWeight = 20;
        } else if (modelLower.includes('mini')) {
            tierWeight = 30;
        }
        return seriesWeight + tierWeight;
    }

    // Mac 排序逻辑
    if (modelLower.includes('mac')) {
        let tierWeight = 50;
        if (modelLower.includes('macbook pro')) {
            tierWeight = 10;
        } else if (modelLower.includes('macbook air')) {
            tierWeight = 20;
        } else if (modelLower.includes('mac pro')) {
            tierWeight = 30;
        } else if (modelLower.includes('imac')) {
            tierWeight = 40;
        }
        return seriesWeight + tierWeight;
    }

    // 其他产品使用默认排序
    return seriesWeight;
}

// 生成产品表格HTML
function generateProductTable(products: ProductInfo[]): string {
    if (!products || products.length === 0) {
        return '<p>未找到产品信息</p>';
    }

    // 首先按产品系列分离：iPhone > iPad > Mac > Apple Watch > AirPods > 其他
    const iPhoneProducts = products.filter((p) => p.model.toLowerCase().includes('iphone'));
    const iPadProducts = products.filter((p) => p.model.toLowerCase().includes('ipad'));
    const macProducts = products.filter((p) => p.model.toLowerCase().includes('macbook') || p.model.toLowerCase().includes('imac') || (p.model.toLowerCase().includes('mac') && !p.model.toLowerCase().includes('ipad')));
    const watchProducts = products.filter((p) => p.model.toLowerCase().includes('apple watch') || (p.model.toLowerCase().includes('watch') && !p.model.toLowerCase().includes('ipad')));
    const airpodsProducts = products.filter((p) => p.model.toLowerCase().includes('airpods'));
    const otherProducts = products.filter(
        (p) =>
            !p.model.toLowerCase().includes('iphone') &&
            !p.model.toLowerCase().includes('ipad') &&
            !p.model.toLowerCase().includes('macbook') &&
            !p.model.toLowerCase().includes('imac') &&
            !(p.model.toLowerCase().includes('mac') && !p.model.toLowerCase().includes('ipad')) &&
            !p.model.toLowerCase().includes('apple watch') &&
            !(p.model.toLowerCase().includes('watch') && !p.model.toLowerCase().includes('ipad')) &&
            !p.model.toLowerCase().includes('airpods')
    );

    // 对每个系列内部进行排序
    const sortediPhoneProducts = iPhoneProducts.sort(compareiPhoneProducts);
    const sortediPadProducts = iPadProducts.sort((a, b) => getProductSortWeight(a) - getProductSortWeight(b));
    const sortedMacProducts = macProducts.sort((a, b) => getProductSortWeight(a) - getProductSortWeight(b));
    const sortedWatchProducts = watchProducts.sort((a, b) => getProductSortWeight(a) - getProductSortWeight(b));
    const sortedAirpodsProducts = airpodsProducts.sort((a, b) => getProductSortWeight(a) - getProductSortWeight(b));
    const sortedOtherProducts = otherProducts.sort((a, b) => a.model.localeCompare(b.model));

    // 合并排序结果
    const sortedProducts = [...sortediPhoneProducts, ...sortediPadProducts, ...sortedMacProducts, ...sortedWatchProducts, ...sortedAirpodsProducts, ...sortedOtherProducts];

    const tableRows = sortedProducts
        .map((product) => {
            const priceDisplay = product.prices.length > 0 ? (product.prices.length === 1 ? `¥${product.prices[0]}` : `¥${product.prices.join('/')} ${product.colors.length > 1 ? `(${product.colors.join('/')})` : ''}`) : '价格面议';

            const colorDisplay = product.colors.length > 0 ? product.colors.join('/') : '-';

            const specDisplay = [product.storage, product.region].filter(Boolean).join(' ') || '-';

            const versionDisplay = product.version || '-';

            return `
            <tr>
                <td>
                    <strong>${product.model}</strong><br>
                    <small>${versionDisplay}</small>
                </td>
                <td>${specDisplay}</td>
                <td>${colorDisplay}</td>
                <td style="text-align: left; font-weight: bold; color: #e74c3c;">
                    ${priceDisplay}
                </td>
            </tr>
        `;
        })
        .join('');

    return `
        <style>
            .product-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .product-table th {
                background: #3498db;
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: bold;
                border-bottom: 2px solid #2980b9;
            }
            .product-table td {
                padding: 10px 8px;
                border-bottom: 1px solid #ecf0f1;
                vertical-align: top;
            }
            .product-table tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            .product-table tr:hover {
                background-color: #e3f2fd;
            }
            @media (max-width: 768px) {
                .product-table {
                    font-size: 12px;
                }
                .product-table th, .product-table td {
                    padding: 6px 4px;
                }
            }
        </style>
        <table class="product-table">
            <thead>
                <tr>
                    <th width="30%">产品名称</th>
                    <th width="20%">规格</th>
                    <th width="20%">颜色</th>
                    <th width="30%">价格</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        <p style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 10px;">
            * 价格单位：人民币元 | * 现货价格为最新报价，颜色后面对应不同颜色价格
        </p>
    `;
}

// 生成 HTML 文件并保存到本地
async function generateLandeHtml(title: string, description: string): Promise<void> {
    if (!ENABLE_HTML_GENERATION) {
        return;
    }

    try {
        const currentTime = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>云鹏数码零售参考报价 - 表格预览</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px; color: #333;">
            <h1>云鹏数码零售参考报价</h1>
            <h2>${title}</h2>
            <div style="color: #666; font-size: 14px; margin-bottom: 20px;">生成时间: ${currentTime}</div>
        </div>

        <div class="content">
            ${description}
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>此页面由 RSSHub we-mp-rss-proxy 路由自动生成</p>
            <p>数据来源: 云鹏数码懒得假如 微信公众号</p>
            <p style="color: #999; font-size: 10px; margin-top: 10px;">自动生成功能 ${ENABLE_HTML_GENERATION ? '已启用' : '已禁用'}</p>
        </div>
    </div>
</body>
</html>`;

        // 保存 HTML 文件到当前目录
        const filePath = path.join(__dirname, 'lande.html');
        await writeFile(filePath, htmlTemplate, 'utf-8');

        // eslint-disable-next-line no-console
        console.log(`HTML 文件已自动更新: ${filePath}`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('HTML 文件生成失败:', error);
    }
}

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
    const includeKeywords: string[] = [];
    const excludeKeywords: string[] = [];

    if (filterParam) {
        const filterParts = filterParam
            .split(',')
            .map((k: string) => k.trim())
            .filter(Boolean);

        for (const part of filterParts) {
            if (part.startsWith('+')) {
                const keyword = part.slice(1);
                if (keyword) {
                    includeKeywords.push(keyword);
                }
            } else if (part.startsWith('-')) {
                const keyword = part.slice(1);
                if (keyword) {
                    excludeKeywords.push(keyword);
                }
            } else {
                // 默认为包含关键词（向后兼容）
                includeKeywords.push(part);
            }
        }
    }

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
                let filteredItems = feed.items || [];

                // 特殊处理：如果是lande分类，只保留标题包含"零售参考报价"的文章
                if (category === 'lande') {
                    filteredItems = filteredItems.filter((item) => {
                        const title = item.title || '';
                        return title.includes('零售参考报价');
                    });

                    // eslint-disable-next-line no-console
                    console.log('Land分类过滤结果:', {
                        原始条目数: feed.items?.length || 0,
                        过滤后条目数: filteredItems.length,
                        过滤条件: '标题包含"零售参考报价"',
                    });
                } else {
                    // 其他分类应用原有的包含/排除过滤器
                    // 应用包含过滤器
                    if (includeKeywords.length > 0) {
                        filteredItems = filteredItems.filter((item) => {
                            const title = (item.title || '').toLowerCase();
                            // 优先使用content字段，如果没有则使用summary
                            const fullContent = item.content || item.summary || '';
                            const content = typeof fullContent === 'string' ? fullContent : extractText(fullContent).toLowerCase();
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
                            const content = typeof fullContent === 'string' ? fullContent : extractText(fullContent).toLowerCase();
                            const fullText = `${title} ${content}`;

                            return !excludeKeywords.some((keyword) => fullText.includes(keyword.toLowerCase()));
                        });
                    }
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
                const processedItems = filteredItems.map((item) => {
                    let description: string;

                    if (category === 'lande') {
                        // 对于lande分类，使用表格化处理
                        try {
                            const products = parseLandeContent(item.content || item.summary || '');
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
                        }
                    } else if (category === 'travel') {
                        // travel分类使用原有的清理逻辑
                        description = cleanHtmlContent(item.content || item.summary || '', includeKeywords);
                    } else {
                        // 其他分类直接返回原内容
                        description = item.content || item.summary || '';
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
                    description: `${feed.description || `微信公众号 ${mpId} 的 ${category} 分类内容`} | 已过滤: ${includeKeywords.length > 0 ? `包含[${includeKeywords.join(', ')}]` : '无'} ${excludeKeywords.length > 0 ? `排除[${excludeKeywords.join(', ')}]` : ''}`,
                    link: feed.link || upstreamUrl,
                    image: feed.image?.url || feed.image,
                    language: feed.language || 'zh-cn',
                    lastBuildDate: feed.lastBuildDate,
                    item: processedItems,
                };

                // 如果是 lande 分类，自动生成 HTML 文件
                if (category === 'lande' && processedItems.length > 0) {
                    // 获取第一个 lande 条目的内容用于生成 HTML
                    const firstLandeItem = processedItems[0];
                    if (firstLandeItem?.description) {
                        // 异步生成 HTML 文件，不阻塞 RSS 响应
                        generateLandeHtml(firstLandeItem.title || '', firstLandeItem.description).catch((error) => {
                            // eslint-disable-next-line no-console
                            console.error('异步生成 HTML 文件失败:', error);
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
