import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '@/config';
import logger from '@/utils/logger';

interface BilibiliUser {
    uid: string;
    cookie: string;
    updated_at?: string;
    username?: string;
}

interface BilibiliConfig {
    users: BilibiliUser[];
}

const YAML_CONFIG_PATH = path.join(process.cwd(), 'bilibili-cookies.yml');

let yamlConfig: BilibiliConfig | null = null;
let lastReadTime = 0;
const READ_INTERVAL = 1000; // 1秒内不重复读取文件

/**
 * 读取YAML配置文件
 * @returns YAML配置对象
 */
const readYamlConfig = (forceRead = false): BilibiliConfig => {
    const now = Date.now();
    // 如果距离上次读取时间小于READ_INTERVAL且不是强制读取，则返回缓存的配置
    if (!forceRead && yamlConfig && now - lastReadTime < READ_INTERVAL) {
        return yamlConfig;
    }

    try {
        if (fs.existsSync(YAML_CONFIG_PATH)) {
            const fileContent = fs.readFileSync(YAML_CONFIG_PATH, 'utf8');
            yamlConfig = yaml.load(fileContent) as BilibiliConfig;
            lastReadTime = now;
            logger.debug(`Loaded bilibili cookies from YAML config: ${YAML_CONFIG_PATH}`);
            return yamlConfig;
        } else {
            logger.warn(`Bilibili YAML config file not found: ${YAML_CONFIG_PATH}`);
            return { users: [] };
        }
    } catch (error) {
        logger.error(`Failed to read bilibili YAML config: ${error}`);
        return { users: [] };
    }
};

// 监听文件变化 - 只在非构建模式下启用
if (process.env.NODE_ENV !== 'build' && !process.env.RSSHUB_BUILDING) {
    try {
        fs.watchFile(YAML_CONFIG_PATH, { interval: 1000 }, (curr, prev) => {
            if (curr.mtime !== prev.mtime) {
                logger.info(`Bilibili cookies YAML file changed, reloading...`);
                readYamlConfig(true);
            }
        });
        logger.info(`Watching bilibili cookies YAML file: ${YAML_CONFIG_PATH}`);
    } catch (error) {
        logger.error(`Failed to watch bilibili cookies YAML file: ${error}`);
    }
}

/**
 * 获取指定用户的cookie
 * @param uid 用户ID
 * @returns cookie字符串或undefined
 */
export const getUserCookie = (uid: string): string | undefined => {
    // 读取YAML配置
    const yamlData = readYamlConfig();
    logger.debug(`Getting cookie for uid ${uid} from YAML config`);

    const user = yamlData?.users?.find((u) => u.uid === uid);

    if (user?.cookie) {
        logger.debug(`Found cookie for uid ${uid} in YAML config`);
        return user.cookie;
    } else {
        logger.debug(`No cookie found for uid ${uid} in YAML config, falling back to environment variables`);
        // 如果YAML中没有，回退到环境变量配置
        return config.bilibili?.cookies?.[uid];
    }
};

/**
 * 获取所有用户的cookie
 * @returns 所有用户cookie的映射
 */
export const getAllCookies = (): Record<string, string | undefined> => {
    const yamlConfig = readYamlConfig();
    const cookies: Record<string, string | undefined> = {};

    // 先加载YAML配置中的cookie
    if (yamlConfig?.users) {
        for (const user of yamlConfig.users) {
            logger.debug(`Loading cookie for uid ${user.uid} from YAML config: ${user.cookie ? 'Cookie exists' : 'Cookie is empty'}`);
            cookies[user.uid] = user.cookie;
        }
    }

    // 合并环境变量中的cookie
    if (config.bilibili?.cookies) {
        for (const [uid, cookie] of Object.entries(config.bilibili.cookies)) {
            if (!cookies[uid]) {
                // 只有YAML中没有的才从环境变量加载
                logger.debug(`Loading cookie for uid ${uid} from environment variables`);
                cookies[uid] = cookie;
            }
        }
    }

    return cookies;
};

/**
 * 更新用户cookie
 * @param uid 用户ID
 * @param cookie 新的cookie值
 * @returns 是否更新成功
 */
export const updateUserCookie = (uid: string, cookie: string): boolean => {
    try {
        // 强制重新读取YAML配置
        const yamlConfig = readYamlConfig(true);
        if (!yamlConfig) {
            logger.error(`Failed to read YAML config for updating cookie`);
            return false;
        }

        // 确保users数组存在
        if (!yamlConfig.users) {
            yamlConfig.users = [];
        }

        // 查找是否已存在该用户
        const userIndex = yamlConfig.users.findIndex((u) => u.uid === uid);

        if (userIndex >= 0) {
            // 更新现有用户
            yamlConfig.users[userIndex].cookie = cookie;
            yamlConfig.users[userIndex].updated_at = new Date().toISOString();
            logger.debug(`Updating existing user ${uid} in YAML config`);
        } else {
            // 添加新用户
            yamlConfig.users.push({
                uid,
                cookie,
                updated_at: new Date().toISOString(),
            });
            logger.debug(`Adding new user ${uid} to YAML config`);
        }

        // 写入文件
        const yamlContent = yaml.dump(yamlConfig);
        fs.writeFileSync(YAML_CONFIG_PATH, yamlContent, 'utf8');
        logger.info(`Updated cookie for user ${uid} in YAML config`);

        // 确保缓存的配置也更新
        lastReadTime = 0; // 强制下次读取时重新从文件加载
        readYamlConfig(true);

        return true;
    } catch (error) {
        logger.error(`Failed to update user cookie in YAML: ${error}`);
        return false;
    }
};

export default {
    getUserCookie,
    getAllCookies,
    updateUserCookie,
    readYamlConfig,
};
