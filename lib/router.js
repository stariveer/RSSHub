const Router = require('@koa/router');
const config = require('@/config').value;
const router = new Router();

// 遍历整个 routes 文件夹，导入模块路由 router.js 和 router-custom.js 文件
// 格式参考用例：routes/epicgames/router.js
const RouterPath = require('require-all')({
    dirname: __dirname + '/routes',
    filter: /^.*router([-_]custom[s]?)?\.js$/,
});

// 将收集到的自定义模块路由进行合并
for (const project in RouterPath) {
    for (const routerName in RouterPath[project]) {
        const proRouter = RouterPath[project][routerName]();
        proRouter.stack.forEach((nestedLayer) => {
            router.stack.push(nestedLayer);
        });
    }
}

// index
router.get('/', require('./routes/index'));

// 煎蛋
router.get('/jandan/:sub_model', require('./routes/jandan/pic'));

// 懂球帝
router.get('/dongqiudi/daily', require('./routes/dongqiudi/daily'));
router.get('/dongqiudi/result/:team', require('./routes/dongqiudi/result'));
router.get('/dongqiudi/team_news/:team', require('./routes/dongqiudi/team_news'));
router.get('/dongqiudi/player_news/:id', require('./routes/dongqiudi/player_news'));
router.get('/dongqiudi/special/:id', require('./routes/dongqiudi/special'));
router.get('/dongqiudi/top_news/:id?', require('./routes/dongqiudi/top_news'));

// 知乎
router.get('/zhihu/collection/:id', require('./routes/zhihu/collection'));
router.get('/zhihu/people/activities/:id', require('./routes/zhihu/activities'));
router.get('/zhihu/people/answers/:id', require('./routes/zhihu/answers'));
router.get('/zhihu/people/posts/:id', require('./routes/zhihu/posts'));
router.get('/zhihu/zhuanlan/:id', require('./routes/zhihu/zhuanlan'));
router.get('/zhihu/daily', require('./routes/zhihu/daily'));
router.get('/zhihu/daily/section/:sectionId', require('./routes/zhihu/daily_section'));
router.get('/zhihu/hotlist', require('./routes/zhihu/hotlist'));
router.get('/zhihu/pin/hotlist', require('./routes/zhihu/pin/hotlist'));
router.get('/zhihu/question/:questionId', require('./routes/zhihu/question'));
router.get('/zhihu/topic/:topicId', require('./routes/zhihu/topic'));
router.get('/zhihu/people/pins/:id', require('./routes/zhihu/pin/people'));
router.get('/zhihu/bookstore/newest', require('./routes/zhihu/bookstore/newest'));
router.get('/zhihu/pin/daily', require('./routes/zhihu/pin/daily'));
router.get('/zhihu/weekly', require('./routes/zhihu/weekly'));

// AppStore
router.get('/appstore/update/:country/:id', require('./routes/apple/appstore/update'));
router.get('/appstore/price/:country/:type/:id', require('./routes/apple/appstore/price'));
router.get('/appstore/iap/:country/:id', require('./routes/apple/appstore/in-app-purchase'));
router.get('/appstore/xianmian', require('./routes/apple/appstore/xianmian'));
router.get('/appstore/gofans', require('./routes/apple/appstore/gofans'));

// 理想生活实验室
router.get('/toodaylab/city/:city?', require('./routes/toodaylab/city'));

// 4563
router.get('/4563/:cat?', require('./routes/4563/cat'));

router.get('/robots.txt', async (ctx) => {
    if (config.disallowRobot) {
        ctx.set('Content-Type', 'text/plain');
        ctx.body = 'User-agent: *\nDisallow: /';
    } else {
        ctx.throw(404, 'Not Found');
    }
});

module.exports = router;
