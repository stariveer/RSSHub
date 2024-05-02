import process from 'node:process';

// SMZDM_SEARCH_URLS="https://search.smzdm.com?c=faxian&v=a&mx_v=a&f_c=zhi&order=time&s=dolce+gusto+胶囊&max_price=200&brand_id=33743&custom_params=eyJ6aGlQYXJhbSI6NSwicmF0ZVBhcmFtIjowLjcsImRheXMiOjV9,https://search.smzdm.com?c=faxian&v=a&mx_v=a&f_c=zhi&order=time&s=蛋白粉&custom_params=eyJ6aGlQYXJhbSI6MjAsInJhdGVQYXJhbSI6MC42LCJkYXlzIjo1fQ=="

// Default URLs, matching the previous hardcoded values.
// These are used if the SMZDM_SEARCH_URLS environment variable is not set or is empty.
const defaultUrls: string[] = [
    'https://search.smzdm.com?c=faxian&v=a&mx_v=a&f_c=zhi&order=time&s=dolce%2Bgusto%2B%E8%83%B6%E5%9B%8A&max_price=200&brand_id=33743&custom_params=eyJ6aGlQYXJhbSI6NSwicmF0ZVBhcmFtIjowLjcsImRheXMiOjUwfQ==',
    'https://search.smzdm.com?c=faxian&v=a&mx_v=a&f_c=zhi&order=time&s=%E8%9B%8B%E7%99%BD%E7%B2%89&custom_params=eyJ6aGlQYXJhbSI6MjAsInJhdGVQYXJhbSI6MC42LCJkYXlzIjo1MH0=',
];

let exportableUrls: string[];

const smzdmSearchUrlsEnv = process.env.SMZDM_SEARCH_URLS;

if (smzdmSearchUrlsEnv && smzdmSearchUrlsEnv.trim() !== '') {
    const rawUrlStrings = smzdmSearchUrlsEnv.split(',');
    const processedUrls = rawUrlStrings
        .map((rawUrl) => {
            const trimmedUrl = rawUrl.trim();
            if (!trimmedUrl) {
                return null; // Will be filtered out
            }

            const questionMarkIndex = trimmedUrl.indexOf('?');

            // Case 1: No query string
            if (questionMarkIndex === -1) {
                return trimmedUrl;
            }

            const baseUrl = trimmedUrl.substring(0, questionMarkIndex);
            const queryString = trimmedUrl.substring(questionMarkIndex + 1);

            // Case 2: URL has '?' but no actual query string (e.g., "http://example.com?")
            if (!queryString) {
                return baseUrl; // Return base URL without trailing '?'
            }

            const params = queryString.split('&');
            const encodedQueryParts: string[] = [];

            for (const param of params) {
                // Skip empty segments that might arise from "&&" or leading/trailing "&"
                if (param === '') {
                    continue;
                }

                const [key, ...valueParts] = param.split('=');
                const value = valueParts.join('='); // Correctly handles '=' characters within the value

                encodedQueryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }

            // Case 3: Query string existed but all parts were empty or skipped (e.g. "url?&&&")
            if (encodedQueryParts.length === 0) {
                return baseUrl; // Return base URL without trailing '?'
            }

            return `${baseUrl}?${encodedQueryParts.join('&')}`;
        })
        .filter((url): url is string => url !== null); // Type guard to ensure array of strings

    exportableUrls = processedUrls.length > 0 ? processedUrls : defaultUrls;
} else {
    // Environment variable is not set, empty, or only whitespace
    exportableUrls = defaultUrls;
}

export default exportableUrls;
