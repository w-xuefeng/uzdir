#!/usr/bin/env bun

import { handleLanguageCommand, initCLI } from "./cli";
import { runMCPServer } from "./mcp";
import { t } from "./locales";

// 检查是否是语言切换命令
if (process.argv[2] === "lang") {
  handleLanguageCommand(process.argv[3]);
} else if (process.argv[2] === "mcp") {
  // 启动 MCP 服务器
  runMCPServer().catch((error: Error) => {
    console.error(`${t("mcp.serverError")}:`, error);
    process.exit(1);
  });
} else {
  // 初始化命令行程序
  initCLI();
}
