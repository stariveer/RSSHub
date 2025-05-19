// 从环境变量中获取配置，提供默认值
const getEnv = (key: string, defaultValue: string) => process.env[`JANDAN_WLT_${key}`] || defaultValue;

// 将逗号分隔的字符串转换为数组
const parseArray = (value: string) => value.split(',').map((item) => item.trim());

// 将逗号分隔的数字字符串转换为数字数组
const parseNumberArray = (value: string) => value.split(',').map((item) => Number.parseInt(item.trim(), 10));

export default {
    // API接口URL，可通过环境变量 JANDAN_WLT_API_URL 修改
    apiUrl: getEnv('API_URL', 'https://jandan.net/api/comment/post/26402'),

    // 默认取第8、9、10页，可通过环境变量 JANDAN_WLT_PAGES 修改，格式为逗号分隔的数字
    pages: parseNumberArray(getEnv('PAGES', '8,9,10')),

    // 默认点赞数大于50，可通过环境变量 JANDAN_WLT_VOTE_POSITIVE 修改
    vote_positive: Number.parseInt(getEnv('VOTE_POSITIVE', '50'), 10),

    // 默认点赞率大于70%，可通过环境变量 JANDAN_WLT_POSITIVE_RATE 修改
    positive_rate: Number.parseFloat(getEnv('POSITIVE_RATE', '0.7')),

    // 默认图片大小限制5MB，可通过环境变量 JANDAN_WLT_SIZE_LIMIT 修改
    sizeLimit: Number.parseInt(getEnv('SIZE_LIMIT', '5'), 10),

    // 默认作者黑名单，可通过环境变量 JANDAN_WLT_AUTHOR_BLACKLIST 修改，格式为逗号分隔的字符串
    authorBlackList: parseArray(getEnv('AUTHOR_BLACKLIST', '用户1,用户2,用户3')),
};
