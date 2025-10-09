#!/usr/bin/env bun

import { Command } from "commander";
import fs from "fs";
import path from "path";
import os from "os";
import pkg from "./package.json" with { type: "json" };
import { glob } from "glob";
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
  private startTime: Date | null = null;
  private endTime: Date | null = null;
  private passwordMap: Record<string, string> | null = null;

  constructor(
    inputDir: string,
    outputDir: string,
    password: string,
    filterFile: string | null = null,
    maxConcurrency: number = os.cpus().length,
    zipFormat: string = ".zip",
    passwordMapPath: string | null = null,
  ) {
    this.inputDir = path.resolve(inputDir);
    this.outputDir = path.resolve(outputDir);
    this.password = password;
    this.filterFile = filterFile;
    this.maxConcurrency = maxConcurrency;
    this.zipFormat = zipFormat;

    // 如果提供了passwordMapPath，则加载密码映射文件
    if (passwordMapPath) {
      try {
        const passwordMapContent = fs.readFileSync(passwordMapPath, "utf-8");
        this.passwordMap = JSON.parse(passwordMapContent);
        console.log(`🔐 已加载密码映射文件: ${passwordMapPath}`);
      } catch (error) {
        console.error(
          `❌ 无法读取或解析密码映射文件: ${passwordMapPath}`,
          error,
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
    const outputPath = path.join(this.outputDir, parentDir, zipFileName);

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
    indexFlag: string,
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
            console.log(
              `${indexFlag} 🙅 已过滤文件：${path.relative(outputPath, file)}`,
            );
          } else if (stat.isDirectory()) {
            fs.rmdirSync(file, { recursive: true });
            console.log(
              `${indexFlag} 🙅 已过滤目录：${path.relative(outputPath, file)}`,
            );
          }
        } catch (error) {
          console.error(`${indexFlag} ❌ 删除文件/目录时出错: ${file}`, error);
        }
      }
    } catch (error) {
      console.error(`${indexFlag} ❌ Glob匹配出错: ${globPattern}`, error);
    }
  }

  private async removeFilters(outputPath: string, indexFlag: string) {
    if (this.filterFile) {
      // 支持多个过滤文件/目录，使用逗号分隔
      const filters = this.filterFile.replace(/，/g, ',').split(",").map((f) => f.trim());
      for (const filter of filters) {
        // 如果是 glob 模式 (包含 * 或 **)
        if (filter.includes("*")) {
          // 使用 glob 库处理
          await this.applyGlobFilter(outputPath, filter, indexFlag);
        } else {
          // 精确路径匹配
          const filterFile = path.join(outputPath, filter);
          if (fs.existsSync(filterFile)) {
            const stat = fs.statSync(filterFile);
            if (stat.isFile()) {
              fs.unlinkSync(filterFile);
              console.log(`${indexFlag} 🙅 已过滤文件：${filter}`);
            }
            if (stat.isDirectory()) {
              fs.rmdirSync(filterFile, { recursive: true });
              console.log(`${indexFlag} 🙅 已过滤目录：${filter}`);
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
  ): Promise<boolean> {
    const relativePath = this.getRelativePath(zipFilePath);
    const outputPath = this.createOutputStructure(relativePath);
    const password = this.getPasswordForFile(zipFilePath);
    let indexFlag = `(线程${concurrencyNumber})[${currentIndex}/${total}]`;

    console.log(
      `${indexFlag} 🔍 处理文件: ${relativePath}${
        password ? " (使用密码)" : ""
      }`,
    );

    const startTime = Date.now();

    try {
      await extractWithNode7z(
        zipFilePath,
        outputPath,
        password,
        indexFlag,
        relativePath,
      );
      await this.removeFilters(outputPath, indexFlag);
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
        `${indexFlag} ⌛ 耗时: ${
          formatMillisecondsToTime(Date.now() - startTime)
        }`,
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
    console.log(`🔑 使用默认密码: ${this.password ? "***" : "无"}`);
    if (this.passwordMap) {
      console.log(
        `📖 使用密码映射文件，包含 ${
          Object.keys(this.passwordMap).length
        } 个文件的专用密码`,
      );
    }
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

    // 查找所有指定类型的压缩文件
    const zipFiles = await this.findZipFiles(this.inputDir);

    if (zipFiles.length === 0) {
      console.log("ℹ️  未找到压缩文件");
      return;
    }

    console.log(`📦 找到 ${zipFiles.length} 个压缩文件`);
    const total = zipFiles.length;

    // 使用 Promise.allSettled 并发解压文件
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
  .description(
    "递归解压目录下的所有指定类型的压缩文件（默认仅解压.zip），并保持目录结构",
  )
  .version(pkg.version, "-v, --version")
  .version(pkg.version, "-V, --VERSION")
  .requiredOption("-i, --input <dir>", "输入目录路径")
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
    "压缩文件格式，多个格式用逗号分隔，默认为.zip",
    ".zip",
  )
  .option(
    "--passwordMap <filepath>",
    '密码映射JSON文件路径, 文件中为JSON格式，格式为 { "filePath or fileName or fileExtension": "password" }',
  )
  .action(async (options) => {
    try {
      const extractor = new UZDir(
        options.input,
        options.output,
        options.password,
        options.filter || null,
        parseInt(options.maxConcurrency) || os.cpus().length,
        options.zipFormat || ".zip",
        options.passwordMap || null,
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
