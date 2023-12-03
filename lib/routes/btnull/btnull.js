const got = require('@/utils/got');

const catesMap = {
    all: { text: '全部', key: '' },
    cn: { text: '大陆', key: '大陆' },
    hk: { text: '香港', key: '香港' },
    tw: { text: '台湾', key: '台湾' },
    us: { text: '美国', key: '美国' },
    jp: { text: '日本', key: '日本' },
    kr: { text: '韩国', key: '韩国' },
};

const tagPool = ['美国', '大陆', '日本', '剧情', '科幻', '动作', '喜剧', '爱情', '冒险', '犯罪', '悬疑', '儿童', '歌舞', '音乐', '奇幻', '动画', '恐怖', '惊悚', '丧尸', '战争', '传记', '纪录', '西部', '灾难', '古装', '武侠', '家庭', '短片', '校园', '文艺', '运动', '青春', '同性', '励志', '人性', '美食', '女性', '治愈', '历史', '真人秀', '脱口秀', '萌系', '日常', '热血', '机战', '游戏', '情色', '搞笑', '恋爱', '后宫', '百合', '基腐', '致郁', '异世界', '泡面', '战斗', '加拿大', '香港', '台湾', '韩国', '印度', '德国', '法国', '英国', '意大利'];

const imgPre = `https://tutu.pm/img/mv`

// https://rsshub.trainspott.in/btnull/cn/7/2023
// https://rsshub.trainspott.in/btnull/hk/7/2023
// https://rsshub.trainspott.in/btnull/tw/7/2023
// https://rsshub.trainspott.in/btnull/all/8/2023


// https://rsshub.trainspott.in/btnull/cn/7/2022
// https://rsshub.trainspott.in/btnull/hk/7/2022
// https://rsshub.trainspott.in/btnull/tw/7/2022
// https://rsshub.trainspott.in/btnull/all/8/2022

// https://rsshub.trainspott.in/btnull/cn/7/2021
// https://rsshub.trainspott.in/btnull/hk/7/2021
// https://rsshub.trainspott.in/btnull/tw/7/2021
// https://rsshub.trainspott.in/btnull/all/8/2021

const envs = process.env;

module.exports = async (ctx) => {
    const cate = ctx.params.cate || '';
    const score = ctx.params.score || 7;
    const year = ctx.params.year || '';

    const url = `https://www.btnull.org/mv/-${year}-${catesMap[cate].key}--${score},10`;
    const response = await got({
        method: 'get',
        url,
        headers: {
            Host: 'www.btnull.org',
            // Referer: url,
            Cookie: envs.BTNULL_AUTH_COOKIE,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25',
        },
    });
    // console.log('==response.data', response.data);

    // _BT.M.inlist('.pic-list',{"l":{
    // ,"d":"mv"},1);

    // const regexp = /<script>_BT\.M\.inlist\('\.pic-list',{"l":(.*?),"d":"mv"},1\);<\/script>/;
    const regexp = /_obj\.inlist\s*=\s*(\{.*?\});/;
    // console.log('==response.data.match(regexp)[1].t', '\n', response.data.match(regexp)[1]);
    const obj = JSON.parse(response.data.match(regexp)[1]);

    // ##obj {
    //     t: [ '长安三万里', '流浪地球2' ],
    //     a: [ [ 2023, 1, 15, 38 ], [ 2023, 1, 4, 8, 23 ] ],
    //     r: [ '52.6万', '125.1万' ],
    //     g: [ '标清', '高清' ],
    //     z: [ 1, 1 ],
    //     d: [ 8.3, 8.3 ],
    //     ty: 'mv',
    //     i: [ 'KGLG', 'nKdd' ]
    // }
    const {
        t, // 标题
        a, // tags
        // r, // 不知道是什么
        // g, // 清晰度
        // z, // 不知道是什么
        // m, // 海报
        d, // 豆瓣评分
        i, // 短链
    } = obj;

    // console.log('==obj', '\n', obj);
    let out = [
        {
            title: 'empty for now',
            link: `https://btnull.org/`,
            // pubDate:''
            description: `empty for now`,
        },
    ];
    if (obj.t && obj.t.length) {

        out = t.map((title, index) => {
            console.log('##a[index]', t[index]);
            const point = d[index];
            // 取 a 的第二个以后的所有元素
            const year = a[index][0];
            const tags = a[index].slice(1).map((tagIndex) => tagPool[tagIndex]).join(' ');
            const item = {
                title: `[${point}][${year} ${tags}]${title}`,
                link: `https://btnull.org/mv/${i[index]}.html`,
                // pubDate:''
                description: `<img src="${imgPre}/${i[index]}.webp">`,
            };
            return item;
        });
    }

    // const out = newsflashes.newsflashList.flow.itemList.map((item) => {
    //     const link = item.templateMaterial.sourceUrlRoute ? new URL(`http://www.example.com/${item.templateMaterial.sourceUrlRoute}`).searchParams.get('url') : `https://36kr.com/newsflashes/${item.itemId}`;
    //     const date = item.templateMaterial.publishTime;
    //     const title = item.templateMaterial.widgetTitle;
    //     const description = item.templateMaterial.widgetContent;

    //     const single = {
    //         title,
    //         link,
    //         pubDate: new Date(date).toUTCString(),
    //         description,
    //     };

    //     return single;
    // });

    // const out = newsflashes;

    ctx.state.data = {
        title: `btnull-${year ? year + '年' : ''}${catesMap[cate].text}[${score}]分以上的电影`,
        link: url,
        item: out,
    };
};
