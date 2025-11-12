import { extractText } from './html-processor';

/**
 * 解析过滤参数，提取包含和排除的关键词
 */
export function parseFilterParams(filterParam: string): { includeKeywords: string[]; excludeKeywords: string[] } {
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

    return { includeKeywords, excludeKeywords };
}

/**
 * 应用内容过滤器
 */
export function applyContentFilter(items: any[], category: string, includeKeywords: string[], excludeKeywords: string[]): any[] {
    let filteredItems = items || [];

    // 特殊处理：如果是lande分类，只保留标题包含"零售参考报价"的文章
    if (category === 'lande') {
        filteredItems = filteredItems.filter((item) => {
            const title = item.title || '';
            return title.includes('零售参考报价');
        });

        // eslint-disable-next-line no-console
        console.log('Land分类过滤结果:', {
            原始条目数: items?.length || 0,
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

    return filteredItems;
}
