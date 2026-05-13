import { Route } from '@/types';
import puppeteer from '@/utils/puppeteer';

interface CatesMap {
    [key: string]: { text: string; key: string };
}

const catesMap: CatesMap = {
    all: { text: '全部', key: '' },
    cn: { text: '大陆', key: '大陆' },
    hk: { text: '香港', key: '香港' },
    tw: { text: '台湾', key: '台湾' },
    us: { text: '美国', key: '美国' },
    jp: { text: '日本', key: '日本' },
    kr: { text: '韩国', key: '韩国' },
};

const envs = process.env;
const btnullDomain = envs.BTNULL_DOMAIN || '教父.com';
const volatileCookieNames = new Set(['browser_verified', 'vrg_go', 'vrg_sc']);

function getAuthCookies(cookieString: string | undefined, domain: string) {
    if (!cookieString) {
        return [];
    }

    return cookieString
        .split(/;\s*/)
        .map((pair) => {
            const eqIdx = pair.indexOf('=');
            if (eqIdx === -1) {
                return null;
            }

            const name = pair.slice(0, eqIdx).trim();
            if (!name || volatileCookieNames.has(name)) {
                return null;
            }

            return {
                name,
                value: pair.slice(eqIdx + 1).trim(),
                domain: `.${domain}`,
                path: '/',
            };
        })
        .filter(Boolean);
}

async function handler(ctx: any) {
    const { req } = ctx;
    const params = req.param();
    const cate = params.cate || '';
    const score = params.score || 7;
    const year = params.year || '';

    // 使用 URL 对象自动将中文域名转换为 Punycode (如 教父.com -> xn--wcv59z.com)，
    // 否则在配合 Clash TUN/无头浏览器时容易引发 ERR_CONNECTION_RESET
    const baseUrl = new URL(`https://www.${btnullDomain}/mv`);
    baseUrl.searchParams.set('year', year);
    baseUrl.searchParams.set('region', catesMap[cate].key);
    baseUrl.searchParams.set('sort', 'addtime');
    baseUrl.searchParams.set('rrange', `${score}_10`);

    const url = baseUrl.href;
    const punycodeDomain = baseUrl.hostname.replace(/^www\./, '');

    const browser = await puppeteer({ stealth: true, browserTimeout: 120000 });
    let out = [
        {
            title: 'empty for now',
            link: `https://${btnullDomain}/`,
            description: `empty for now`,
        },
    ];

    try {
        const page = await browser.newPage();
        // 设置真实的桌面 UA
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36');

        // 只注入长期登录 Cookie；browser_verified 等短期安全验证 Cookie 交给浏览器实时生成。
        const cookies = getAuthCookies(envs.BTNULL_AUTH_COOKIE, punycodeDomain) as Parameters<typeof page.setCookie>[0][];
        if (cookies.length > 0) {
            await page.setCookie(...cookies);
        }

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // WASM PoW 验证约需几十秒；通过后新版页面由外部脚本渲染 DOM，不再暴露 _obj.inlist。
        const result = await page.waitForFunction(
            () => {
                if (document.querySelector('.nologin') || document.title.includes('未登录') || document.body?.innerHTML?.includes("_BT.M.HTML('login')")) {
                    return 'nologin';
                }
                if (document.querySelector('ul.content-list')) {
                    return 'ok';
                }
                return false;
            },
            { timeout: 90000, polling: 1000 }
        );

        const resultValue = await result.jsonValue();
        if (resultValue === 'nologin') {
            throw new Error('Access denied: Login required. Please update BTNULL_AUTH_COOKIE in .env with a valid app_auth session cookie from your browser.');
        }

        const items = await page.$$eval('ul.content-list > li', (elements) =>
            elements.flatMap((element) => {
                const imageLink = element.querySelector<HTMLAnchorElement>('.li-img a[href*="/mv/"]');
                const titleLink = element.querySelector<HTMLAnchorElement>('.li-bottom h3 a[href*="/mv/"]') ?? imageLink;
                const image = imageLink?.querySelector<HTMLImageElement>('img');
                const imageUrl = image?.dataset.src ?? image?.src;
                const rating = element.querySelector<HTMLElement>('.li-bottom h3 span')?.textContent?.trim();
                const meta = element.querySelector<HTMLElement>('.li-bottom .tag')?.textContent?.trim();
                const title = titleLink?.textContent?.trim() || titleLink?.title || image?.alt;
                const link = titleLink?.href ?? imageLink?.href;

                if (!title || !link) {
                    return [];
                }

                return [
                    {
                        title: `${rating ? `[${rating}]` : ''}${meta ? `[${meta}]` : ''}${title}`,
                        link,
                        description: [imageUrl ? `<img src="${imageUrl}">` : '', meta ? `<p>${meta}</p>` : ''].filter(Boolean).join(''),
                    },
                ];
            })
        );

        if (items.length > 0) {
            out = items;
        }

        await page.close();
    } finally {
        await browser.close();
    }

    // year 参数支持两种格式：
    // - 具体年份（如 2024），判断依据：数值 >= 1000
    // - 近N年（如 3 表示近3年），判断依据：数值 < 1000
    const yearLabel = year ? (Number(year) >= 1000 ? `${year}年` : `近${year}年`) : '';

    return {
        title: `btnull-${yearLabel}${catesMap[cate].text}[${score}]分以上的电影`,
        link: url,
        item: out,
    };
}

export const route: Route = {
    path: '/:cate/:score/:year',
    name: 'Btnull',
    example: '/btnull/hk/7/3',
    maintainers: [],
    handler,
};
