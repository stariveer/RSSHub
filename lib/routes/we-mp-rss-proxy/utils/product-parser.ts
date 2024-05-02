import { load } from 'cheerio';
import { extractPricesFromText } from './price-processor';

// 产品信息接口定义
export interface ProductInfo {
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

/**
 * 检测品牌 - 只检测Apple产品，其他都返回null
 */
export function detectBrand(model: string): string | null {
    const modelLower = model.toLowerCase();
    if (modelLower.includes('iphone') || modelLower.includes('ipad') || modelLower.includes('mac') || modelLower.includes('apple watch') || modelLower.includes('airpods') || modelLower.includes('apple')) {
        return 'Apple';
    }
    return null; // 非Apple产品返回null
}

/**
 * 格式化产品名称，统一空格格式
 */
export function formatProductName(model: string): string {
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

/**
 * 提取地区信息
 */
export function extractRegion(version: string): string {
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

/**
 * 提取颜色信息
 */
export function extractColors(colorText: string): string[] {
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

/**
 * 提取存储容量数值（用于排序）
 */
export function getStorageSize(storage: string): number {
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

/**
 * 解析lande分类的产品信息
 */
export function parseLandeContent(html: any): ProductInfo[] {
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
