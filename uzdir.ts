#!/usr/bin/env bun

import fs from "fs";
import path from "path";
import os from "os";
import ansiColors from "ansi-colors";
import colors from "ansi-colors";
import cliProgress from "cli-progress";
import pkg from "./package.json" with { type: "json" };
import { glob } from "glob";
import { Command } from "commander";
import { extractWithNode7z } from "./7zip";
import {
  formatMillisecondsToTime,
  truncateStringMiddleEnhanced,
} from "./utils";
import { Logger } from "./logger";

const progressBarPreset = {
  format: `\r{title} ${
    colors.green(
      "{bar}",
    )
  } {percentage}% {status} {log}`,
  barCompleteChar: "\u2588",
  barIncompleteChar: "\u2591",
};

/**
 * 压缩文件解压工具
 * 支持递归解压目录下的所有指定的压缩文件（默认仅解压.zip），保持目录结构
 */
class UZDir {
  private inputDir: string;
  private outputDir: string;
  private password: string;
  private filterFile: string | null;
  private maxConcurrency: number;
  private zipFormat: string;
  private processedCount: number = 0;
  private errorCount: number = 0;
  private errorPaths: string[] = [];
  private startTime: Date | null = null;
  private endTime: Date | null = null;
  private passwordMap: Record<string, string> | null = null;
  private fullpath: boolean;
  private ignorePattern: string | null;
  private withLog: boolean;
  private L = new Logger();

  private multiProgressBar = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: false,
      format: progressBarPreset.format,
      barsize: 24,
    },
    progressBarPreset,
  );

  constructor(
    inputDir: string,
    outputDir: string,
    password: string,
    filterFile: string | null = null,
    maxConcurrency: number = os.cpus().length,
    zipFormat: string = ".zip",
    passwordMapPath: string | null = null,
    fullpath: boolean = true,
    ignorePattern: string | null = null,
    withLog: boolean = false,
  ) {
    this.inputDir = path.resolve(inputDir);
    this.outputDir = path.resolve(outputDir);
    this.password = password;
    this.filterFile = filterFile;
    this.maxConcurrency = maxConcurrency;
    this.zipFormat = zipFormat;
    this.fullpath = fullpath;
    this.ignorePattern = ignorePattern;
    this.withLog = withLog;
    if (this.withLog) {
      this.L.setFilePath(this.outputDir);
    }

    // 如果提供了 passwordMapPath，则加载密码映射文件
    if (passwordMapPath) {
      try {
        const passwordMapContent = fs.readFileSync(passwordMapPath, "utf-8");
        this.passwordMap = JSON.parse(passwordMapContent);
        this.L.log(`🔐 已加载密码映射文件: ${passwordMapPath}`, true);
      } catch (error) {
        this.L.error(
          `❌ 无法读取或解析密码映射文件: ${passwordMapPath}`,
          error as Error,
          true,
        );
        process.exit(1);
      }
    }
  }

  /**
   * 递归遍历目录查找压缩文件
   */
  private async findZipFiles(dir: string): Promise<string[]> {
    const zipFiles: string[] = [];

    try {
      const items = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        // 检查是否应该忽略该文件/目录
        if (this.shouldIgnore(item.name)) {
          continue;
        }

        if (item.isDirectory()) {
          // 递归遍历子目录
          const subDirZips = await this.findZipFiles(fullPath);
          zipFiles.push(...subDirZips);
        } else if (item.isFile() && this.isZipFile(fullPath)) {
          zipFiles.push(fullPath);
        }
      }
    } catch (error) {
      this.L.error(`❌ 遍历目录时出错: ${dir}`, error, true);
    }

    return zipFiles;
  }

  /**
   * 检查文件是否为指定压缩文件格式
   */
  private isZipFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.zipFormat.replace(/，/g, ",").split(",").map((format) =>
      format.trim()
    ).includes(ext);
  }

  /**
   * 计算文件相对于输入目录的相对路径
   */
  private getRelativePath(filePath: string): string {
    return path.relative(this.inputDir, filePath);
  }

  /**
   * 获取指定文件的密码
   * 匹配规则：
   * 1. 优先匹配完整绝对路径
   * 2. 然后匹配部分路径
   * 3. 其次匹配文件名
   * 4. 最后匹配文件格式（扩展名）
   * 5. 如果都没有结果，则使用 this.password
   */
  private getPasswordForFile(filePath: string): string {
    if (!this.passwordMap) {
      return this.password;
    }

    // 1. 完整绝对路径匹配
    if (this.passwordMap.hasOwnProperty(filePath)) {
      return this.passwordMap[filePath];
    }

    // 2. 部分路径匹配
    for (const key in this.passwordMap) {
      if (filePath.includes(key)) {
        return this.passwordMap[key];
      }
    }

    // 3. 文件名匹配
    const fileName = path.basename(filePath);
    if (this.passwordMap.hasOwnProperty(fileName)) {
      return this.passwordMap[fileName];
    }

    // 4. 文件格式匹配（扩展名）
    const fileExt = path.extname(filePath);
    if (this.passwordMap.hasOwnProperty(fileExt)) {
      return this.passwordMap[fileExt];
    }

    // 5. 使用默认密码
    return this.password;
  }

  /**
   * 创建输出目录结构
   */
  private createOutputStructure(relativePath: string): string {
    const zipFileName = path.basename(relativePath, path.extname(relativePath));
    const parentDir = path.dirname(relativePath);

    // 输出路径：输出目录 + 相对路径（不含.zip扩展名）
    // 如果 fullpath 为 true，则将 zip文件名作为子目录名
    const outputPath = path.join(
      this.outputDir,
      parentDir,
      this.fullpath ? zipFileName : "",
    );

    // 确保目录存在
    fs.mkdirSync(outputPath, { recursive: true });

    return outputPath;
  }

  /**
   * 应用glob模式过滤
   */
  private async applyGlobFilter(
    outputPath: string,
    globPattern: string,
  ): Promise<void> {
    try {
      const matchedFiles = await glob(globPattern, {
        cwd: outputPath,
        absolute: true,
        nodir: false,
      });

      for (const file of matchedFiles) {
        try {
          const stat = fs.statSync(file);
          if (stat.isFile()) {
            fs.unlinkSync(file);
            this.L.log(`🙅 已过滤文件：${path.relative(outputPath, file)}`);
          } else if (stat.isDirectory()) {
            fs.rmdirSync(file, { recursive: true });
            this.L.log(`🙅 已过滤目录：${path.relative(outputPath, file)}`);
          }
        } catch (error) {
          this.L.error(`❌ 删除文件/目录时出错: ${file}`, error);
        }
      }
    } catch (error) {
      this.L.error(`❌ Glob匹配出错: ${globPattern}`, error);
    }
  }

  private async removeFilters(
    outputPath: string,
  ) {
    if (this.filterFile) {
      // 支持多个过滤文件/目录，使用逗号分隔
      const filters = this.filterFile.replace(/，/g, ",").split(",").map((f) =>
        f.trim()
      );
      for (const filter of filters) {
        // 如果是 glob 模式 (包含 * 或 **)
        if (filter.includes("*")) {
          // 使用 glob 库处理
          await this.applyGlobFilter(
            outputPath,
            filter,
          );
        } else {
          // 精确路径匹配
          const filterFile = path.join(outputPath, filter);
          if (fs.existsSync(filterFile)) {
            const stat = fs.statSync(filterFile);
            if (stat.isFile()) {
              try {
                fs.unlinkSync(filterFile);
                this.L.log(`🙅 已过滤文件：${filterFile}`);
              } catch (error) {
                this.L.error(`❌ 删除文件时出错: ${filterFile}`, error);
              }
            }
            if (stat.isDirectory()) {
              try {
                fs.rmdirSync(filterFile, { recursive: true });
                this.L.log(`🙅 已过滤目录：${filterFile}`);
              } catch (error) {
                this.L.error(`❌ 删除目录时出错: ${filterFile}`, error);
              }
            }
          }
        }
      }
    }
  }

  /**
   * 解压单个ZIP文件
   */
  private async extractZip(
    zipFilePath: string,
    currentIndex: number,
    total: number,
    concurrencyNumber: number = 1,
    progressBar: cliProgress.SingleBar,
  ): Promise<boolean> {
    const relativePath = this.getRelativePath(zipFilePath);
    const outputPath = this.createOutputStructure(relativePath);
    const password = this.getPasswordForFile(zipFilePath);
    const concurrency = Math.min(this.maxConcurrency, total);
    const indexFlag = `(线程${
      String(concurrencyNumber).padStart(String(concurrency).length, "0")
    })[${String(currentIndex).padStart(String(total).length, "0")}/${total}]`;

    progressBar.update(0, {
      title: indexFlag,
      percentage: 0,
      status: "准备解压",
      log: "\t",
    });

    this.L.log(`[${indexFlag}] 开始解压:${zipFilePath}`);

    const startTime = Date.now();

    try {
      await extractWithNode7z({
        zipFilePath,
        outputDir: outputPath,
        password,
        relativePath,
        fullpath: this.fullpath,
        progressBar,
        L: this.L,
      });
      await this.removeFilters(outputPath);
      const timeUsed = formatMillisecondsToTime(Date.now() - startTime);
      progressBar.update({
        status: ansiColors.green("解压完成"),
        log: `${
          ansiColors.cyan(
            truncateStringMiddleEnhanced(
              path.basename(zipFilePath),
              25,
              25,
            ),
          )
        } ${ansiColors.gray(`耗时:${timeUsed}`)}`,
      });
      this.L.log(`[${indexFlag}] 解压完成:${zipFilePath}, 耗时:${timeUsed}`);
      this.processedCount++;
      return true;
    } catch (error) {
      const err = error as Error & { stderr: string };
      progressBar.update({
        status: `${ansiColors.red("解压失败")}`,
        log: ansiColors.red(
          String(err?.["stderr"]).trim().replace(/\n/g, " ") ?? err.message,
        ),
      });
      this.errorCount++;
      this.errorPaths.push(zipFilePath);
      this.L.error(`[${indexFlag}] 解压异常:${zipFilePath}`, error);
      return false;
    }
  }

  private supportSingleFileFormat() {
    const extname = path.extname(this.inputDir).toLocaleLowerCase();
    if (!this.zipFormat.toLocaleLowerCase().includes(extname)) {
      this.zipFormat += `,${extname}`;
    }
  }

  /**
   * 执行解压过程
   */
  public async extractAll(): Promise<void> {
    const inputStat = fs.statSync(this.inputDir);
    const inputIsFile = inputStat.isFile();

    if (inputIsFile) {
      this.supportSingleFileFormat();
    }

    this.L.log("🚀 开始解压过程...", true);
    this.L.log(`📁 输入: ${this.inputDir}`, true);
    this.L.log(`📂 输出目录: ${this.outputDir}`, true);
    this.L.log(
      `🗂️ 待解压文件格式: ${this.zipFormat}`,
      true,
      // 🗂️ 这个 icon 的宽度在命令行中展示时表现为坍缩形态，因此需要多一个空格来优化展示
      (msg) => msg.replace("🗂️", "🗂️ "),
    );
    this.L.log(`🔑 使用默认密码: ${this.password ? "***" : "无"}`, true);
    if (this.passwordMap) {
      this.L.log(
        `📖 使用密码映射文件，包含 ${
          Object.keys(this.passwordMap).length
        } 个文件的专用密码`,
        true,
      );
    }
    if (this.filterFile) {
      this.L.log(
        `⏭️ 过滤文件: ${this.filterFile}`,
        true,
        // ⏭️ 这个 icon 的宽度在命令行中展示时表现为坍缩形态，因此需要多一个空格来优化展示
        (msg) => msg.replace("⏭️", "⏭️ "),
      );
    }
    if (this.ignorePattern) {
      this.L.log(`🚫 忽略模式: ${this.ignorePattern}`, true);
    }
    this.L.log(`🔁 最大并发数: ${this.maxConcurrency}`, true);
    this.L.log(`📌 完整路径解压: ${this.fullpath ? "是" : "否"}`, true);
    this.startTime = new Date(Date.now());
    this.L.log("─".repeat(50), true, (e) => ansiColors.white(e));

    let zipFiles: string[] = [];

    if (inputIsFile) {
      // 如果输入是单个文件
      if (this.isZipFile(this.inputDir)) {
        zipFiles = [this.inputDir];
      } else {
        const msg = `输入文件不是有效的压缩文件: ${this.inputDir}`;
        this.L.error(msg, new Error(msg), true);
        return;
      }
    } else {
      // 输入是目录
      // 检查输入目录是否存在
      if (!fs.existsSync(this.inputDir)) {
        const msg = `输入目录不存在: ${this.inputDir}`;
        this.L.error(
          msg,
          new Error(msg),
          true,
        );
        return;
      }

      // 查找所有指定类型的压缩文件
      zipFiles = await this.findZipFiles(this.inputDir);
    }

    if (zipFiles.length === 0) {
      this.L.log("ℹ️  未找到压缩文件", true);
      return;
    }

    this.L.log(`📦 找到 ${zipFiles.length} 个压缩文件`, true);
    const total = zipFiles.length;

    // 使用连续任务调度实现并发
    const concurrency = Math.min(this.maxConcurrency, total);
    this.L.log(`🔁 实际并发数: ${concurrency}`, true);
    this.L.log("─".repeat(50), true, (e) => ansiColors.white(e));

    const progressBars = Array.from(
      { length: concurrency },
      () =>
        this.multiProgressBar.create(100, 0, {
          title: "",
          percentage: 0,
          status: "处理中...",
          log: "\t",
        }),
    );

    // 实现连续任务调度逻辑 - 当任何任务完成时，如果有剩余任务则立即开始执行
    let taskIndex = 0;

    // 创建任务执行函数
    const runTask = (concurrencyIndex: number): Promise<void> => {
      // 如果所有任务都已完成，返回resolved promise
      if (taskIndex >= total) {
        return Promise.resolve();
      }

      // 获取当前任务索引并递增
      const currentTaskIndex = taskIndex++;

      // 执行当前任务
      return this.extractZip(
        zipFiles[currentTaskIndex],
        currentTaskIndex + 1,
        total,
        concurrencyIndex + 1,
        progressBars[concurrencyIndex],
      ).then(() => {
        // 当前任务完成后，继续执行下一个任务（如果有）
        return runTask(concurrencyIndex);
      }).catch(() => {
        // 即使任务失败也要继续执行下一个任务
        return runTask(concurrencyIndex);
      });
    };

    // 启动初始并发任务
    const workers = Array.from({ length: concurrency }, (_, i) => runTask(i));

    // 等待所有任务完成
    await Promise.allSettled(workers);

    progressBars.forEach((bar) => bar.stop());
    this.multiProgressBar.stop();

    // 输出总结
    this.L.log("─".repeat(50), true, (e) => ansiColors.white(e));
    this.L.log("📊 解压完成!", true);
    this.L.log(`✅ 成功处理: ${this.processedCount} 个文件`, true);
    if (this.errorCount > 0) {
      this.L.log(`❌ 失败: ${this.errorCount} 个文件`, true);
      this.L.log(
        `❌ 失败文件列表: \n${
          this.errorPaths.map((e, i) => `\t- ${i + 1}.${e}`).join("\n")
        }`,
        true,
      );
      this.L.log(`📝 错误日志: ${this.L.getLogFilePath("error")}`, true);
    }
    this.L.log(`📔 解压日志: ${this.L.getLogFilePath("log")}`, true);
    this.endTime = new Date(Date.now());

    this.L.log(
      `🕐︎ 开始时间: ${
        this.startTime.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
        })
      }`,
      true,
    );
    this.L.log(
      `🕜︎ 完成时间: ${
        this.endTime.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
        })
      }`,
      true,
    );
    this.L.log(
      `⌛ 总耗时: ${
        formatMillisecondsToTime(
          this.endTime.getTime() - this.startTime.getTime(),
        )
      }`,
      true,
    );
  }

  /**
   * 检查文件/目录是否应该被忽略
   * 默认忽略隐藏文件（以.开头的文件）
   */
  private shouldIgnore(name: string): boolean {
    // 默认忽略隐藏文件
    if (name.startsWith(".")) {
      return true;
    }

    // 如果提供了自定义忽略模式，则检查是否匹配
    if (this.ignorePattern) {
      const patterns = this.ignorePattern.replace(/，/g, ",").split(",").map(
        (p) => p.trim(),
      );
      return patterns.some((pattern) => {
        // 简单的glob模式匹配
        if (pattern.includes("*")) {
          // 转换简单的glob模式为正则表达式
          const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
          return new RegExp(`^${regexPattern}$`).test(name);
        }
        // 精确匹配
        return pattern === name;
      });
    }

    return false;
  }
}

// 命令行界面配置
const program = new Command();

program
  .name("uzdir")
  .description(
    "递归解压目录下的所有指定类型的压缩文件（默认仅解压.zip），并保持目录结构",
  )
  .version(pkg.version, "-v, --version")
  .version(pkg.version, "-V, --VERSION")
  .requiredOption("-i, --input <dir>", "输入目录路径或压缩文件路径")
  .requiredOption("-o, --output <dir>", "输出目录路径")
  .option("-p, --password <password>", "解压密码", "")
  .option("--filter <filterpath>", "要过滤的文件路径（ZIP内相对路径）")
  .option(
    "--maxConcurrency <number>",
    "最大并发数，默认为CPU核心数",
    `${os.cpus().length}`,
  )
  .option(
    "--zipFormat <formats>",
    "压缩文件格式，多个格式用逗号分隔，默认为.zip,.rar",
    ".zip,.rar",
  )
  .option(
    "--passwordMap <filepath>",
    '密码映射JSON文件路径, 文件中为JSON格式，格式为 { "filePath or fileName or fileExtension": "password" }',
  )
  .option(
    "--ignore <patterns>",
    "忽略文件/目录的模式，多个模式用逗号分隔，支持简单glob模式，默认忽略隐藏文件",
  )
  .option(
    "--log",
    "是否将日志输出到output目录，默认为false",
  )
  .option(
    "--fullpath <flag>",
    "是否使用完整路径解压(即创建同名子目录)，默认为 true，设为 false、0 或 '0' 等 falsy 将会把所有解压后的文件提取到一个目录中",
    "true",
  )
  .action(async (options) => {
    try {
      // 将字符串形式的布尔值转换为实际的布尔值
      let fullpath = true;
      if (
        ["false", "0", "", "null", "undefined"].includes(options.fullpath) ||
        options.fullpath === false ||
        options.fullpath === 0
      ) {
        fullpath = false;
      }

      const extractor = new UZDir(
        options.input,
        options.output,
        options.password,
        options.filter || null,
        parseInt(options.maxConcurrency) || os.cpus().length,
        options.zipFormat || ".zip",
        options.passwordMap || null,
        fullpath,
        options.ignore || null,
        options.log || false,
      );

      await extractor.extractAll();
    } catch (error) {
      console.error("💥 程序执行出错:", error);
      process.exit(1);
    }
  });

// 显示帮助信息如果无参数
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
