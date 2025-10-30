import { getCurrentLanguage as getConfigLanguage } from "../config";
import zh_CN from "./langs/zh_CN";
import en_US from "./langs/en_US";
import type { Language, LanguagePack } from "../types";

const languagePacks: Record<Language, LanguagePack> = {
  zh_CN,
  en_US,
};

function getCurrentLanguage(): Language {
  return getConfigLanguage();
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const language = getCurrentLanguage();
  const pack = languagePacks[language];

  // 使用可选链和空值合并操作符安全地获取翻译文本
  const keys = key.split(".");
  let value: string | LanguagePack | undefined = pack;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as LanguagePack)[k];
    } else {
      // 如果找不到对应键，返回原始键作为提示
      return key;
    }
  }

  // 如果最终值是字符串，则进行参数替换
  if (typeof value === "string") {
    let result = value;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(
          new RegExp(`\\{${paramKey}\\}`, "g"),
          String(paramValue),
        );
      }
    }
    return result;
  }

  // 如果找不到对应翻译，返回原始键作为提示
  return key;
}

// 获取可用语言列表
export function getAvailableLanguages(): Language[] {
  return Object.keys(languagePacks) as Language[];
}
