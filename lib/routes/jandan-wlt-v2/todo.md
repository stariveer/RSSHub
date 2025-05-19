这个页面改版了,現在這個頁面可以直接 它前後端分離了,然後現在要用 直接用接口請求的方式可以拿到
https://jandan.net/api/comment/post/26402?order=desc&page=1 这是第一页

现在这个代码的逻辑有点复杂, 你可以重构一下, 只需要现在取config.pages 中包含的页面的内容, 然后去重就行了。

config改成: 

export default {
    pages: [8,9,10], // 取第八页、九页、十页这三页的内容
    vote_positive: 50, // 点赞数大于50
    positive_rate: 0.7, // 点赞率大于70%, 点赞率 = 点赞数 / (点赞数 + 踩数)
    sizeLimit: 5, // 图片大小限制小于15M
    authorBlackList: ['猫与牛仔裤', '每日美足', '墨鱼蛋'], // 作者黑名单
};

其他的逻辑能够沿用就沿用, 最终是需要你输出rss, 