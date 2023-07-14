module.exports = function (router) {
    router.get('/wechat2rss/:id', require('./wechat2rss'));
    router.get('/my', require('./my'));
};
