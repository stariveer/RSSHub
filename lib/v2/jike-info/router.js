module.exports = function (router) {
    router.get('/category/:cate?', require('./index'));
};
