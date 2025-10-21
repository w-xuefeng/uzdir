#!/usr/bin/env bun

import { handleLanguageCommand, initCLI } from "./cli";

// 检查是否是语言切换命令
if (process.argv[2] === "lang") {
  handleLanguageCommand(process.argv[3]);
} else {
  // 初始化命令行程序
  initCLI();
}