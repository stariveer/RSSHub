const got = require('@/utils/got');

const catesMap = {
    all: { text: '全部', key: '' },
    cn: { text: '中国', key: '_E5_A4_A7_E9_99_86' },
    hk: { text: '香港', key: '_E9_A6_99_E6_B8_AF' },
    tw: { text: '台湾', key: '_E5_8F_B0_E6_B9_BE' },
    us: { text: '美国', key: '_E7_BE_8E_E5_9B_BD' },
    jp: { text: '日本', key: '_E6_97_A5_E6_9C_AC' },
    kr: { text: '韩国', key: '_E9_9F_A9_E5_9B_BD' },
};

// https://rsshub.trainspott.in/btnull/cn/7/2022
// https://rsshub.trainspott.in/btnull/cn/7/2021
// https://rsshub.trainspott.in/btnull/cn/7/2020

// https://rsshub.trainspott.in/btnull/hk/7/2022
// https://rsshub.trainspott.in/btnull/hk/7/2021
// https://rsshub.trainspott.in/btnull/hk/7/2020

// https://rsshub.trainspott.in/btnull/tw/7/2022
// https://rsshub.trainspott.in/btnull/tw/7/2021
// https://rsshub.trainspott.in/btnull/tw/7/2020

// https://rsshub.trainspott.in/btnull/all/8/2022
// https://rsshub.trainspott.in/btnull/all/8/2021
// https://rsshub.trainspott.in/btnull/all/8/2020
const envs = process.env;

module.exports = async (ctx) => {
    const cate = ctx.params.cate || '';
    const score = ctx.params.score || 7;
    const year = ctx.params.year || '';

    const url = `https://www.btnull.in/mv/-${year}-${catesMap[cate].key}--${score},10--.html`;
    const response = await got({
        method: 'get',
        url,
        headers: {
            Host: 'www.btnull.in',
            Referer: url,
            Cookie: envs.BTNULL_AUTH_COOKIE,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25',
        },
    });

    // _BT.M.inlist('.pic-list',{"l":{
    // ,"d":"mv"},1);

    const regexp = /<script>_BT\.M\.inlist\('\.pic-list',{"l":(.*?),"d":"mv"},1\);<\/script>/;
    // console.log('==response.data.match(regexp)[1].t', '\n', response.data.match(regexp)[1]);
    const arr = JSON.parse(response.data.match(regexp)[1]);

    // console.log('==arr', '\n', arr);

    const {
        t, // 标题
        a, // tags
        // r, // 不知道是什么
        // g, // 清晰度
        // z, // 不知道是什么
        m, // 海报
        d, // 豆瓣评分
        i, // 短链
    } = arr;
    let out = [
        {
            title: 'empty for now',
            link: `https://m.btnull.in/`,
            // pubDate:''
            description: `empty for now`,
        },
    ];
    if (arr.t && arr.t.length) {
        out = t.map((title, index) => {
            const item = {
                title: `[${d[index]}][${a[index].replace(/ /g, '')}]${title}`,
                link: `https://m.btnull.in/mv/${i[index]}.html`,
                // pubDate:''
                description: `<img src="${m[index]}">`,
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
