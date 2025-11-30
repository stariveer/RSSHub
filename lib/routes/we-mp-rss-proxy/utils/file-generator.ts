import path from 'path';
import { writeFile, mkdir, stat, readFile } from 'fs/promises';
import { ProductInfo } from './product-parser';
import { compareiPhoneProducts, getProductSortWeight } from './price-processor';



// JSON 自动生成开关（默认开启）
const ENABLE_JSON_GENERATION = process.env.ENABLE_LANDE_JSON !== 'false';

/**
 * 从文章标题中提取日期
 */
function extractDateFromTitle(title: string): string {
    // 匹配格式：YYYY年M月D日 或 YYYY-MM-DD 等
    const dateMatch = title.match(/(\d{4})[/年\-](\d{1,2})[/月\-](\d{1,2})日?/);
    if (dateMatch) {
        const year = dateMatch[1];
        const month = String(dateMatch[2]).padStart(2, '0');
        const day = String(dateMatch[3]).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 如果没有找到日期，使用当前日期
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
}

/**
 * 从产品信息中提取价格信息用于文件名
 */
function extractPriceForFileName(products: ProductInfo[]): string {
    if (products.length === 0) {
        return 'no-price';
    }

    // 获取第一个产品的价格作为文件名
    const firstProduct = products[0];
    if (firstProduct.prices.length > 0) {
        return `price-${firstProduct.prices[0]}`;
    }

    return 'no-price';
}

/**
 * 生成产品表格HTML
 */
export function generateProductTable(products: ProductInfo[]): string {
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



/**
 * 生成 JSON 文件并保存到本地
 */
export async function generateLandeJson(title: string, products: ProductInfo[]): Promise<void> {
    if (!ENABLE_JSON_GENERATION) {
        return;
    }

    try {
        if (products.length === 0) {
            return;
        }

        // 使用新的命名规则：yyyy-mm-dd-price.json
        const dateStr = extractDateFromTitle(title);
        const priceStr = extractPriceForFileName(products);
        const fileName = `${dateStr}-${priceStr}.json`;

        // 按产品类别分组
        const categories: Record<string, any[]> = {};

        for (const product of products) {
            // 确定产品类别
            let category = 'Other';
            const modelLower = product.model.toLowerCase();

            if (modelLower.includes('iphone')) {
                category = 'iPhone';
            } else if (modelLower.includes('ipad')) {
                category = 'iPad';
            } else if (modelLower.includes('macbook') || modelLower.includes('imac') || modelLower.includes('mac')) {
                category = 'Mac';
            } else if (modelLower.includes('watch')) {
                category = 'Watch';
            } else if (modelLower.includes('airpods')) {
                category = 'AirPods';
            }

            if (!categories[category]) {
                categories[category] = [];
            }

            // 转换为JSON格式
            categories[category].push({
                brand: product.brand || undefined,
                model: product.model,
                version: product.version,
                region: product.region,
                storage: product.storage,
                colors: product.colors,
                status: product.status,
                prices: product.prices,
                notes: product.notes,
                originalText: product.originalText,
            });
        }

        // 创建JSON数据结构
        const jsonData = {
            date: dateStr,
            title,
            generatedAt: new Date().toISOString(),
            categories,
        };

        // 确保data目录存在
        const dataDir = path.join(__dirname, '..', 'data');
        try {
            await mkdir(dataDir, { recursive: true });
        } catch {
            // 目录已存在或创建失败，忽略
        }

        // 保存JSON文件
        const filePath = path.join(dataDir, fileName);
        let fileExists = false;

        // 检查文件是否已存在
        try {
            const fileStat = await stat(filePath);
            if (fileStat.isFile()) {
                fileExists = true;
                // 文件已存在，跳过生成
                // eslint-disable-next-line no-console
                console.log(`JSON 文件已存在，跳过生成: ${filePath}`);
            }
        } catch {
            // 文件不存在，继续生成
        }

        if (!fileExists) {
            await writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
            // eslint-disable-next-line no-console
            console.log(`JSON 文件已自动更新: ${filePath}`);
        }

        // 更新 index.json
        await updateIndexJson(dataDir, {
            fileName,
            date: dateStr,
            title,
            priceStr
        });

    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('JSON 文件生成失败:', error);
    }
}

async function updateIndexJson(dataDir: string, newItem: { fileName: string; date: string; title: string; priceStr: string }) {
    const indexFilePath = path.join(dataDir, 'index.json');
    let indexData: any[] = [];

    try {
        const content = await readFile(indexFilePath, 'utf-8');
        indexData = JSON.parse(content);
    } catch {
        // index.json 不存在或解析失败，使用空数组
    }

    // 检查是否已存在
    const exists = indexData.some(item => item.fileName === newItem.fileName);
    if (!exists) {
        indexData.push(newItem);
        // 按日期倒序排序
        indexData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        await writeFile(indexFilePath, JSON.stringify(indexData, null, 2), 'utf-8');
        // eslint-disable-next-line no-console
        console.log(`index.json 已更新`);
    }
}
