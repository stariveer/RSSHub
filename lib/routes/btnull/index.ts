import { Route } from '@/types';
import got from '@/utils/got';

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

const tagPool: string[] = [
    '美国',
    '大陆',
    '日本',
    '剧情',
    '科幻',
    '动作',
    '喜剧',
    '爱情',
    '冒险',
    '犯罪',
    '悬疑',
    '儿童',
    '歌舞',
    '音乐',
    '奇幻',
    '动画',
    '恐怖',
    '惊悚',
    '丧尸',
    '战争',
    '传记',
    '纪录',
    '西部',
    '灾难',
    '古装',
    '武侠',
    '家庭',
    '短片',
    '校园',
    '文艺',
    '运动',
    '青春',
    '同性',
    '励志',
    '人性',
    '美食',
    '女性',
    '治愈',
    '历史',
    '真人秀',
    '脱口秀',
    '萌系',
    '日常',
    '热血',
    '机战',
    '游戏',
    '情色',
    '搞笑',
    '恋爱',
    '后宫',
    '百合',
    '基腐',
    '致郁',
    '异世界',
    '泡面',
    '战斗',
    '加拿大',
    '香港',
    '台湾',
    '韩国',
    '印度',
    '德国',
    '法国',
    '英国',
    '意大利',
];

const imgPre = `https://tutu.pm/img/mv`;

const envs = process.env;

async function handler(ctx: any) {
    const { req } = ctx;
    const params = req.param();
    const cate = params.cate || '';
    const score = params.score || 7;
    const year = params.year || '';

    const url = `https://www.gying.in/mv/-${year}-${catesMap[cate].key}--${score},10`;
    const response = await got({
        method: 'get',
        url,
        headers: {
            Host: 'www.gying.in',
            Cookie: envs.BTNULL_AUTH_COOKIE,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25',
        },
    });
    const regexp = /_obj\.inlist\s*=\s*({.*?});/;
    const obj = JSON.parse(response.data.match(regexp)[1]);

    const {
        t, // 标题
        a, // tags
        d, // 豆瓣评分
        i, // 短链
    } = obj;

    let out = [
        {
            title: 'empty for now',
            link: `https://gying.in/`,
            description: `empty for now`,
        },
    ];
    if (obj.t && obj.t.length) {
        out = t.map((title: string, index: number) => {
            const point = d[index];
            const year = a[index][0];
            const tags = a[index]
                .slice(1)
                .map((tagIndex: number) => tagPool[tagIndex])
                .join(' ');
            const item = {
                title: `[${point}][${year} ${tags}]${title}`,
                link: `https://gying.in/mv/${i[index]}.html`,
                description: `<img src="${imgPre}/${i[index]}.webp">`,
            };
            return item;
        });
    }

    return {
        title: `btnull-${year ? year + '年' : ''}${catesMap[cate].text}[${score}]分以上的电影`,
        link: url,
        item: out,
    };
}

export const route: Route = {
    path: '/:cate/:score/:year',
    name: 'Btnull',
    example: '/btnull/hk/7/2020',
    maintainers: [],
    handler,
};
