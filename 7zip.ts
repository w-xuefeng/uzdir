import fs from "fs";
import os from "os";
import { Logger } from "./logger";
import ansiColors from "ansi-colors";
import * as node7z from "node-7z";
import { path7za } from "7zip-bin";
import { truncateStringMiddleEnhanced } from "./utils";
import type cliProgress from "cli-progress";

// 确保 path7za 具有执行权限
try {
  // 检查文件是否存在以及是否已经有执行权限
  if (fs.existsSync(path7za)) {
    // 在 Windows 平台上，可执行文件通常有 .exe 扩展名，且权限模型不同于 Unix
    if (os.platform() === "win32") {
      // Windows 平台上检查文件扩展名是否为可执行文件扩展名
      const isExecutable = path7za.toLowerCase().endsWith(".exe");
      if (isExecutable) {
        console.log("\n📁 UZDir 已经准备就绪\n");
      } else {
        // Windows 上重命名文件添加 .exe 扩展名
        console.warn("⚠️ Windows 平台上 7za 文件可能缺少正确的扩展名");
      }
    } else {
      // Unix/Linux/macOS 平台上的处理逻辑
      const stat = fs.statSync(path7za);
      // 检查用户是否有执行权限 (UNIX/Linux/macOS)
      const hasExecutePermission = (stat.mode & 0o100) !== 0;

      if (!hasExecutePermission) {
        fs.chmodSync(path7za, 0o755);
        console.log("👌 7zip 二进制文件执行权限已设置");
      } else {
        console.log("\n📁 UZDir 已经准备就绪\n");
      }
    }
  } else {
    console.warn("⚠️ 7zip 二进制文件不存在:", path7za);
  }
} catch (error) {
  console.warn(
    "⚠️ 无法设置 7zip 二进制文件执行权限:",
    (error as Error).message,
  );
}

export function extractWithNode7z(option: {
  zipFilePath: string;
  outputDir: string;
  password: string;
  relativePath: string;
  fullpath: boolean;
  progressBar: cliProgress.SingleBar;
  L: Logger;
}) {
  const {
    zipFilePath,
    outputDir,
    password,
    fullpath = true,
    progressBar,
    L,
  } = option;
  const { resolve, reject, promise } = Promise.withResolvers();

  try {
    const stream = fullpath
      ? node7z.extractFull(zipFilePath, outputDir, {
        $bin: path7za,
        password: password,
        recursive: true,
        $progress: true,
      })
      : node7z.extract(zipFilePath, outputDir, {
        $bin: path7za,
        password: password,
        recursive: true,
        $progress: true,
      });

    stream.on("data", (data) => {
      progressBar.update({
        status: ansiColors.gray("正在解压:"),
        log: ansiColors.gray(truncateStringMiddleEnhanced(data.file, 50, 50)),
      });
      L.log(`[7z]正在解压:${data.file}`);
    });

    stream.on("progress", (progress) => {
      progressBar.update(progress.percent);
    });

    stream.on("end", () => {
      progressBar.update(100, {
        percentage: 100,
        status: ansiColors.green("解压完成"),
        log: "",
      });
      L.log(`[7z]解压完成:${zipFilePath}`);
      stream.destroy();
      resolve(true);
    });

    stream.on("error", (err) => {
      stream.destroy();
      reject(err);
    });
  } catch (err) {
    reject(err);
  }

  return promise;
}
