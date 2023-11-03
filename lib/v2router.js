const dirname = __dirname + '/v2';

// 遍历整个 routes 文件夹，收集模块路由 router.js
const RouterPath = require('require-all')({
    dirname,
    filter: /router\.js$/,
});

const routes = {};

// 将收集到的自定义模块路由进行合并
for (const dir in RouterPath) {
    const project = RouterPath[dir]['router.js']; // Do not merge other file
    routes[dir] = project;
}


// module.exports = routes;
module.exports = {
    'smzdm': require(`${dirname}/smzdm-srr/router.js`),
    'ixigua': require(`${dirname}/ixigua/router.js`),
    'bilibili': require(`${dirname}/bilibili/router.js`),
    'github': require(`${dirname}/github/router.js`),
    'zhihu': require(`${dirname}/zhihu/router.js`),
    'jandan': require(`${dirname}/jandan/router.js`),
    'jandan-srr': require(`${dirname}/jandan-srr/router.js`),
    'dapenti': require(`${dirname}/dapenti/router.js`),
    'dongqiudi': require(`${dirname}/dongqiudi/router.js`),
    'wechat': require(`${dirname}/wechat/router.js`),
    'flyert': require(`${dirname}/flyert/router.js`),
    'weibo': require(`${dirname}/weibo/router.js`),
    'telegram': require(`${dirname}/telegram/router.js`),
    'landejiaru': require(`${dirname}/landejiaru/router.js`),
    'werss': require(`${dirname}/werss/router.js`),
    // 'v2ex-1': require(`${dirname}/v2ex/router.js`),
};
