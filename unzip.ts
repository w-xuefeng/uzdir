#!/usr/bin/env bun

import { Command } from "commander";
import fs from "fs";
import path from "path";
import os from "os";
import pkg from "./package.json" with { type: "json" };
import { extractWithNode7z } from "./7zip";

function padZero(num: number, count = 2) {
  return num.toString().padStart(count, "0");
}

function formatMillisecondsToTime(milliseconds: number | string) {
  const totalSeconds = Math.floor(Number(milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${padZero(hours)}:${padZero(minutes)}:${
    padZero(seconds)
  }`;
  return formattedTime;
}

/**
 * ZIP文件解压工具
 * 支持递归解压目录下的所有ZIP文件，保持目录结构
 */
class ZipExtractor {
  private inputDir: string;
  private outputDir: string;
  private password: string;
  private filterFile: string | null;
  private maxConcurrency: number;
  private zipFormat: string;
  private processedCount: number = 0;
  private errorCount: number = 0;
  private startTime: Date | null = null;
  private endTime: Date | null = null;

  constructor(
    inputDir: string,
    outputDir: string,
    password: string,
    filterFile: string | null = null,
    maxConcurrency: number = os.cpus().length,
    zipFormat: string = ".zip",
  ) {
    this.inputDir = path.resolve(inputDir);
    this.outputDir = path.resolve(outputDir);
    this.password = password;
    this.filterFile = filterFile;
    this.maxConcurrency = maxConcurrency;
    this.zipFormat = zipFormat;
  }

  /**
   * 递归遍历目录查找ZIP文件
   */
  private async findZipFiles(dir: string): Promise<string[]> {
    const zipFiles: string[] = [];

    try {
      const items = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          // 递归遍历子目录
          const subDirZips = await this.findZipFiles(fullPath);
          zipFiles.push(...subDirZips);
        } else if (item.isFile() && this.isZipFile(fullPath)) {
          zipFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ 遍历目录时出错: ${dir}`, error);
    }

    return zipFiles;
  }

  /**
   * 检查文件是否为ZIP格式
   */
  private isZipFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.zipFormat.replace(/，/g, ',').split(',').map(format => format.trim()).includes(ext);
  }

  /**
   * 计算文件相对于输入目录的相对路径
   */
  private getRelativePath(filePath: string): string {
    return path.relative(this.inputDir, filePath);
  }

  /**
   * 创建输出目录结构
   */
  private createOutputStructure(relativePath: string): string {
    const zipFileName = path.basename(relativePath, path.extname(relativePath));
    const parentDir = path.dirname(relativePath);

    // 输出路径：输出目录 + 相对路径（不含.zip扩展名）
    const outputPath = path.join(this.outputDir, parentDir, zipFileName);

    // 确保目录存在
    fs.mkdirSync(outputPath, { recursive: true });

    return outputPath;
  }

  /**
   * 解压单个ZIP文件
   */
  private async extractZip(
    zipFilePath: string,
    currentIndex: number,
    total: number,
    concurrencyNumber: number = 1
  ): Promise<boolean> {
    const relativePath = this.getRelativePath(zipFilePath);
    const outputPath = this.createOutputStructure(relativePath);
    let password = this.password;
    let indexFlag = `(线程${concurrencyNumber})[${currentIndex}/${total}]`;

    console.log(`${indexFlag} 🔍 处理文件: ${relativePath}`);

    const startTime = Date.now();

    try {
      await extractWithNode7z(zipFilePath, outputPath, password, indexFlag, relativePath);
      if (this.filterFile) {
        const filterFile = path.join(outputPath, this.filterFile);
        if (fs.existsSync(filterFile)) {
          const stat = fs.statSync(filterFile);
          if (stat.isFile()) {
            fs.unlinkSync(filterFile);
            console.log(`${indexFlag} 🙅 已过滤文件：${this.filterFile}`);
          }
          if (stat.isDirectory()) {
            fs.rmdirSync(filterFile, { recursive: true });
            console.log(`${indexFlag} 🙅 已过滤目录：${this.filterFile}`);
          }
        }
      }
      console.log(
        `${indexFlag} ✅ 成功解压: ${relativePath} → ${
          path.relative(
            this.outputDir,
            outputPath,
          )
        } 耗时 ${formatMillisecondsToTime(Date.now() - startTime)}`,
      );
      this.processedCount++;
      return true;
    } catch (error) {
      console.error(`${indexFlag} ❌ 解压失败: ${relativePath}`, error);
      this.errorCount++;
      console.log(
        `${indexFlag} ⌛ 耗时: ${formatMillisecondsToTime(Date.now() - startTime)}`,
      );
      return false;
    }
  }

  /**
   * 执行解压过程
   */
  public async extractAll(): Promise<void> {
    console.log("🚀 开始解压过程...");
    console.log(`📁 输入目录: ${this.inputDir}`);
    console.log(`📂 输出目录: ${this.outputDir}`);
    console.log(`🗂️  待解压文件格式: ${this.zipFormat}`);
    console.log(`🔑 使用密码: ${this.password ? "***" : "无"}`);
    if (this.filterFile) {
      console.log(`⏭️  过滤文件: ${this.filterFile}`);
    }
    console.log(`🔁 最大并发数: ${this.maxConcurrency}`);
    this.startTime = new Date(Date.now());
    console.log("─".repeat(50));

    // 检查输入目录是否存在
    if (!fs.existsSync(this.inputDir)) {
      throw new Error(`输入目录不存在: ${this.inputDir}`);
    }

    // 创建输出目录
    fs.mkdirSync(this.outputDir, { recursive: true });

    // 查找所有ZIP文件
    const zipFiles = await this.findZipFiles(this.inputDir);

    if (zipFiles.length === 0) {
      console.log("ℹ️  未找到压缩文件");
      return;
    }

    console.log(`📦 找到 ${zipFiles.length} 个压缩文件`);
    const total = zipFiles.length;

    // 使用Promise.allSettled并发解压文件
    const concurrency = Math.min(this.maxConcurrency, total);
    console.log(`🔁 实际并发数: ${concurrency}`);
    console.log("─".repeat(50));

    for (let i = 0, j = 1; i < total; i += concurrency, j++) {
      const batch = zipFiles.slice(i, i + concurrency);
      const batchPromises = batch.map((zipFile, index) =>
        this.extractZip(zipFile, i + index + 1, total, j)
      );
      await Promise.allSettled(batchPromises);
    }

    // 输出总结
    console.log("─".repeat(50));
    console.log("📊 解压完成!");
    console.log(`✅ 成功处理: ${this.processedCount} 个文件`);
    if (this.errorCount > 0) {
      console.log(`❌ 失败: ${this.errorCount} 个文件`);
    }

    this.endTime = new Date(Date.now());

    console.log(
      `🕐︎ 开始时间: ${
        this.startTime.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
        })
      }`,
    );
    console.log(
      `🕜︎ 完成时间: ${
        this.endTime.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
        })
      }`,
    );
    console.log(
      `⌛ 总耗时: ${
        formatMillisecondsToTime(
          this.endTime.getTime() - this.startTime.getTime(),
        )
      }`,
    );
  }
}

// 命令行界面配置
const program = new Command();

program
  .name("uzdir")
  .description("递归解压目录下的所有ZIP文件，保持目录结构")
  .version(pkg.version, "-v, --version")
  .version(pkg.version, "-V, --VERSION")
  .requiredOption("-i, --input <dir>", "输入目录路径")
  .requiredOption("-o, --output <dir>", "输出目录路径")
  .option("-p, --password <password>", "解压密码", "")
  .option("--filter <filterpath>", "要过滤的文件路径（ZIP内相对路径）")
  .option("--maxConcurrency <number>", "最大并发数，默认为CPU核心数", `${os.cpus().length}`)
  .option("--zipFormat <formats>", "压缩文件格式，多个格式用逗号分隔，默认为.zip", ".zip")
  .action(async (options) => {
    try {
      const extractor = new ZipExtractor(
        options.input,
        options.output,
        options.password,
        options.filter || null,
        parseInt(options.maxConcurrency) || os.cpus().length,
        options.zipFormat || ".zip",
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
