import { cleanHtmlContent } from './utils/html-processor';
import { parseLandeContent, ProductInfo } from './utils/product-parser';
import { generateProductTable, generateLandeJson } from './utils/file-generator';
import { parseDate } from '../../utils/parse-date';

export async function handleLande(items: any[], includeKeywords: string[]) {
    const allProducts: ProductInfo[][] = [];

    const processedItems = items.map((item) => {
        let description: string;
        try {
            const products = parseLandeContent(item.content || item.summary || '');
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
            allProducts.push([]);
        }

        return {
            title: item.title || '',
            link: item.link || '',
            description,
            pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
            author: item.creator || item.author || '',
            category: item.categories || [],
            guid: item.guid || item.link,
        };
    });

    // Generate files asynchronously
    if (processedItems.length > 0) {
        for (const [index, processedItem] of processedItems.entries()) {
            const products = allProducts[index] || [];
            generateLandeJson(processedItem.title || '', products).catch((error) => {
                // eslint-disable-next-line no-console
                console.error('异步生成 JSON 文件失败:', error);
            });
        }
    }

    return processedItems;
}
