import fs from "fs";
import path from "path";
import ansiColors from "ansi-colors";
import colors from "ansi-colors";
import cliProgress from "cli-progress";
import { glob } from "glob";
import { extractWithNode7z } from "./7zip";
import {
  formatMillisecondsToTime,
  truncateStringMiddleEnhanced,
} from "../utils";
import { Logger } from "../utils/logger";
import { t } from "../locales";
import { CPU_COUNTS } from "../config";
import type {
  ProgressBar,
  ProgressBarController,
  UZDirOptions,
} from "../types";

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
 * 支持递归解压目录下的所有指定的压缩文件，保持目录结构
 */
export class UZDir {
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
  private logVisible: boolean = true;
  private progressController: ProgressBarController | null = null;
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

  constructor(options: UZDirOptions) {
    const {
      inputDir,
      outputDir,
      password,
      filterFile = null,
      maxConcurrency = CPU_COUNTS,
      zipFormat = `.zip,.rar`,
      passwordMapPath = null,
      fullpath = true,
      ignorePattern = null,
      withLog = false,
      logVisible = true,
      progressController = null,
    } = options;

    this.inputDir = path.resolve(inputDir);
    this.outputDir = path.resolve(outputDir);
    this.password = password;
    this.filterFile = filterFile;
    this.maxConcurrency = maxConcurrency;
    this.zipFormat = zipFormat;
    this.fullpath = fullpath;
    this.ignorePattern = ignorePattern;
    this.withLog = withLog;
    this.logVisible = logVisible;
    this.progressController = progressController;

    if (this.withLog) {
      this.L.setFilePath(this.outputDir);
    }

    // 如果提供了 passwordMapPath，则加载密码映射文件
    if (passwordMapPath) {
      try {
        const passwordMapContent = fs.readFileSync(passwordMapPath, "utf-8");
        this.passwordMap = JSON.parse(passwordMapContent);
        this.L.log(
          `🔐 ${t("messages.passwordMapLoaded", { path: passwordMapPath })}`,
          this.logVisible,
        );
      } catch (error) {
        this.L.error(
          `❌ ${t("messages.fileError")}: ${passwordMapPath}`,
          error as Error,
          this.logVisible,
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
      this.L.error(
        `❌ ${t("messages.processingError")}: ${dir}`,
        error,
        this.logVisible,
      );
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
            this.L.log(
              `${t("messages.filteredFile")}：${
                path.relative(outputPath, file)
              }`,
            );
          } else if (stat.isDirectory()) {
            fs.rmdirSync(file, { recursive: true });
            this.L.log(
              `${t("messages.filteredDir")}：${
                path.relative(outputPath, file)
              }`,
            );
          }
        } catch (error) {
          this.L.error(`❌ ${t("messages.error")}: ${file}`, error);
        }
      }
    } catch (error) {
      this.L.error(`❌ ${t("messages.globError")}: ${globPattern}`, error);
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
                this.L.log(`${t("messages.filteredFile")}：${filterFile}`);
              } catch (error) {
                this.L.error(`❌ ${t("messages.error")}: ${filterFile}`, error);
              }
            }
            if (stat.isDirectory()) {
              try {
                fs.rmdirSync(filterFile, { recursive: true });
                this.L.log(`${t("messages.filteredDir")}：${filterFile}`);
              } catch (error) {
                this.L.error(`❌ ${t("messages.error")}: ${filterFile}`, error);
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
    progressBar: ProgressBar,
  ): Promise<boolean> {
    const relativePath = this.getRelativePath(zipFilePath);
    const outputPath = this.createOutputStructure(relativePath);
    const password = this.getPasswordForFile(zipFilePath);
    const concurrency = Math.min(this.maxConcurrency, total);
    const indexFlag = `(${t("messages.thread")}${
      String(concurrencyNumber).padStart(String(concurrency).length, "0")
    })[${String(currentIndex).padStart(String(total).length, "0")}/${total}]`;

    progressBar?.update(0, {
      title: indexFlag,
      percentage: 0,
      status: t("messages.preparing"),
      log: "\t",
    });

    this.L.log(
      `[${indexFlag}] ${t("messages.startExtracting")}:${zipFilePath}`,
    );

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
      progressBar?.update({
        status: ansiColors.green(t("messages.completed")),
        log: `${
          ansiColors.cyan(
            truncateStringMiddleEnhanced(
              path.basename(zipFilePath),
              25,
              25,
            ),
          )
        } ${ansiColors.gray(`${t("messages.duration")}:${timeUsed}`)}`,
      });
      this.L.log(
        `[${indexFlag}] ${t("messages.completed")}:${zipFilePath}, ${
          t("messages.duration")
        }:${timeUsed}`,
      );
      this.processedCount++;
      return true;
    } catch (error) {
      const err = error as Error & { stderr: string };
      progressBar?.update({
        status: `${ansiColors.red(t("messages.failedStatus"))}`,
        log: ansiColors.red(
          String(err?.["stderr"]).trim().replace(/\n/g, " ") ?? err.message,
        ),
      });
      this.errorCount++;
      this.errorPaths.push(zipFilePath);
      this.L.error(
        `[${indexFlag}] ${t("messages.extractError")}:${zipFilePath}`,
        error,
      );
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

    this.L.log(t("messages.start"), this.logVisible);
    this.L.log(`${t("messages.input")}: ${this.inputDir}`, this.logVisible);
    this.L.log(`${t("messages.output")}: ${this.outputDir}`, this.logVisible);
    this.L.log(
      `${t("messages.formats")}: ${this.zipFormat}`,
      this.logVisible,
      // 🗂️ 这个 icon 的宽度在命令行中展示时表现为坍缩形态，因此需要多一个空格来优化展示
      (msg) => msg.replace("🗂️", "🗂️ "),
    );
    this.L.log(
      `${t("messages.defaultPassword")}: ${
        this.password ? "***" : t("messages.none")
      }`,
      this.logVisible,
    );
    if (this.passwordMap) {
      this.L.log(
        `${
          t("messages.passwordMap", {
            count: Object.keys(this.passwordMap).length,
          })
        }`,
        this.logVisible,
      );
    }
    if (this.filterFile) {
      this.L.log(
        `${t("messages.filter")}: ${this.filterFile}`,
        this.logVisible,
        // ⏭️ 这个 icon 的宽度在命令行中展示时表现为坍缩形态，因此需要多一个空格来优化展示
        (msg) => msg.replace("⏭️", "⏭️ "),
      );
    }
    if (this.ignorePattern) {
      this.L.log(
        `${t("messages.ignore")}: ${this.ignorePattern}`,
        this.logVisible,
      );
    }
    this.L.log(
      `${t("messages.maxConcurrency")}: ${this.maxConcurrency}`,
      this.logVisible,
    );
    this.L.log(
      `${t("messages.fullPath")}: ${
        this.fullpath ? t("messages.yes") : t("messages.no")
      }`,
      this.logVisible,
    );
    this.startTime = new Date(Date.now());
    this.L.log(
      t("messages.logSeparator"),
      this.logVisible,
      (e) => ansiColors.white(e),
    );

    let zipFiles: string[] = [];

    if (inputIsFile) {
      // 如果输入是单个文件
      if (this.isZipFile(this.inputDir)) {
        zipFiles = [this.inputDir];
      } else {
        const msg = t("messages.invalidFile") + `: ${this.inputDir}`;
        this.L.error(msg, new Error(msg), this.logVisible);
        return;
      }
    } else {
      // 输入是目录
      // 检查输入目录是否存在
      if (!fs.existsSync(this.inputDir)) {
        const msg = t("messages.dirNotExists") + `: ${this.inputDir}`;
        this.L.error(
          msg,
          new Error(msg),
          this.logVisible,
        );
        return;
      }

      // 查找所有指定类型的压缩文件
      zipFiles = await this.findZipFiles(this.inputDir);
    }

    if (zipFiles.length === 0) {
      this.L.log(t("messages.noZipFiles"), this.logVisible);
      return;
    }

    this.L.log(
      t("messages.found", { count: zipFiles.length }),
      this.logVisible,
    );
    const total = zipFiles.length;

    // 使用连续任务调度实现并发
    const concurrency = Math.min(this.maxConcurrency, total);
    this.L.log(
      `${t("messages.actualConcurrency")}: ${concurrency}`,
      this.logVisible,
    );
    this.L.log(
      t("messages.logSeparator"),
      this.logVisible,
      (e) => ansiColors.white(e),
    );

    // 创建进度条数组
    const progressBars = Array.from(
      { length: concurrency },
      () => {
        if (this.progressController) {
          return this.progressController.createProgressBar(100, 0, {
            title: "",
            percentage: 0,
            status: t("messages.processing"),
            log: "\t",
          });
        }
        return null;
      },
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

    // 停止所有进度条
    progressBars.forEach((bar) => {
      if (
        typeof this.progressController?.stopProgressBar === "function" && bar
      ) {
        this.progressController.stopProgressBar(bar);
      } else if (typeof bar?.stop === "function") {
        bar.stop();
      }
    });

    if (typeof this.progressController?.stopAll === "function") {
      this.progressController.stopAll();
    }

    // 输出总结
    this.L.log(
      t("messages.logSeparator"),
      this.logVisible,
      (e) => ansiColors.white(e),
    );
    this.L.log(t("messages.complete"), this.logVisible);
    this.L.log(
      `${t("messages.success")}: ${this.processedCount} ${t("messages.files")}`,
      this.logVisible,
    );
    if (this.errorCount > 0) {
      this.L.log(
        `${t("messages.failed")}: ${this.errorCount} ${t("messages.files")}`,
        this.logVisible,
      );
      this.L.log(
        `${t("messages.failedList")}: \n${
          this.errorPaths.map((e, i) => `\t- ${i + 1}.${e}`).join("\n")
        }`,
        this.logVisible,
      );
      this.L.log(
        `${t("messages.logFile")}: ${this.L.getLogFilePath("error")}`,
        this.logVisible,
      );
    }
    this.L.log(
      `${t("messages.extractLog")}: ${this.L.getLogFilePath("log")}`,
      this.logVisible,
    );
    this.endTime = new Date(Date.now());

    this.L.log(
      `${t("messages.startTime")}: ${
        this.startTime.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
        })
      }`,
      this.logVisible,
    );
    this.L.log(
      `${t("messages.endTime")}: ${
        this.endTime.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
        })
      }`,
      this.logVisible,
    );
    this.L.log(
      `${t("messages.duration")}: ${
        formatMillisecondsToTime(
          this.endTime.getTime() - this.startTime.getTime(),
        )
      }`,
      this.logVisible,
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

  /**
   * 获取处理成功的文件数量
   */
  public getProcessedCount(): number {
    return this.processedCount;
  }

  /**
   * 获取处理失败的文件数量
   */
  public getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * 获取处理失败的文件路径列表
   */
  public getErrorPaths(): string[] {
    return this.errorPaths;
  }

  /**
   * 获取处理持续时间
   */
  public getDuration(): string {
    if (this.startTime && this.endTime) {
      const durationMs = this.endTime.getTime() - this.startTime.getTime();
      return formatMillisecondsToTime(durationMs);
    }
    return t("messages.unknown");
  }

  /**
   * 获取 Logger实例
   */
  public getLogger(): Logger {
    return this.L;
  }
}
