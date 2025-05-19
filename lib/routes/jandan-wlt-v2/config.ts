export default {
    pages: [8, 9, 10], // 取第八页、九页、十页这三页的内容
    vote_positive: 50, // 点赞数大于50
    positive_rate: 0.7, // 点赞率大于70%, 点赞率 = 点赞数 / (点赞数 + 踩数)
    sizeLimit: 5, // 图片大小限制小于15M
    authorBlackList: ['猫与牛仔裤', '每日美足', '墨鱼蛋'], // 作者黑名单
};
