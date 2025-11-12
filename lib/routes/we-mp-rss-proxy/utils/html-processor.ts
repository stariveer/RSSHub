import { load } from 'cheerio';

/**
 * 辅助函数：提取HTML中的纯文本
 */
export function extractText(html: any): string {
    if (!html) {
        return '';
    }
    const $ = load(html);
    return $.text().trim();
}

/**
 * 辅助函数：判断图片是否为GIF格式
 */
export function isGifImage(src: string): boolean {
    const lowerSrc = src.toLowerCase();
    // 检查文件扩展名或微信URL参数
    return lowerSrc.endsWith('.gif') || lowerSrc.includes('wx_fmt=gif');
}

/**
 * 辅助函数：清理HTML内容，只保留文本和图片，并在文本后添加换行符
 */
export function cleanHtmlContent(html: any, includeKeywords: string[] = []): string {
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
