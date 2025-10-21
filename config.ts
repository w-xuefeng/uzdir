import fs from "fs";
import path from "path";
import os from "os";
import { Language } from "./types";

export const CPU_COUNTS = os.cpus().length;

// 配置文件路径
const CONFIG_DIR = path.join(os.homedir(), ".uzdir");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 获取配置文件内容
 */
function getConfig(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configContent = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(configContent);
    }
  } catch {
    console.warn("Warning: Could not read configuration file");
  }
  return {};
}

/**
 * 保存配置到文件
 * @param config 配置对象
 */
function saveConfig(config: Record<string, any>): void {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    console.warn("Warning: Could not save configuration file");
  }
}

/**
 * 获取当前语言设置
 */
export function getCurrentLanguage(): Language {
  try {
    const config = getConfig();
    if (config.lang) {
      return config.lang;
    }
  } catch {
    console.warn(
      "Warning: Could not read language configuration, using default language",
    );
  }
  return "en_US"; // 默认语言
}

/**
 * 设置当前语言
 * @param lang 语言代码
 */
export function setCurrentLanguage(lang: Language): void {
  try {
    const config = getConfig();
    config.lang = lang;
    saveConfig(config);
  } catch {
    console.warn("Warning: Could not save language configuration");
  }
}

/**
 * 获取日志目录路径
 */
export function getLogDir(): string {
  return path.join(CONFIG_DIR, "logs");
}
