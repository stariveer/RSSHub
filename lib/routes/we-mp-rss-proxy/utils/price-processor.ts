import { ProductInfo, getStorageSize } from './product-parser';

/**
 * 解析价格信息
 */
export function parsePrices(priceText: string): number[] {
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

/**
 * 从完整文本中提取价格信息（在【】后面的数字）
 */
export function extractPricesFromText(text: string): number[] {
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

/**
 * iPhone专用排序比较函数
 */
export function compareiPhoneProducts(a: ProductInfo, b: ProductInfo): number {
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

/**
 * 获取产品排序权重
 */
export function getProductSortWeight(product: ProductInfo): number {
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
