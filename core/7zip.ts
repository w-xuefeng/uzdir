import fs from "fs";
import os from "os";
import { Logger } from "../utils/logger";
import { path7z } from "7zip-bin-full";
import { truncateStringMiddleEnhanced } from "../utils";
import { t } from "../locales";
import ansiColors from "ansi-colors";
import * as node7z from "node-7z";
import type { ProcessBar } from "../types";

const isMCPCalling = process.argv[2] === "mcp";
const logger = (msg: string, level: "log" | "warn" | "error" = "log") => {
  if (!isMCPCalling) {
    console[level](msg);
    return;
  }
  process.stdout.write(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/message",
      params: {
        level,
        message: msg,
      },
    }) + "\n",
  );
};

function ensure7ZHasRightPower() {
  // 确保 path7z 具有执行权限
  try {
    // 检查文件是否存在以及是否已经有执行权限
    if (fs.existsSync(path7z)) {
      // 在 Windows 平台上，可执行文件通常有 .exe 扩展名，且权限模型不同于 Unix
      if (os.platform() === "win32") {
        // Windows 平台上检查文件扩展名是否为可执行文件扩展名
        const isExecutable = path7z.toLowerCase().endsWith(".exe");
        if (isExecutable) {
          logger(t("sevenZip.ready"));
        } else {
          // Windows 上重命名文件添加 .exe 扩展名
          logger(t("sevenZip.missingExtension"), "warn");
        }
      } else {
        // Unix/Linux/macOS 平台上的处理逻辑
        const stat = fs.statSync(path7z);
        // 检查用户是否有执行权限 (UNIX/Linux/macOS)
        const hasExecutePermission = (stat.mode & 0o100) !== 0;

        if (!hasExecutePermission) {
          fs.chmodSync(path7z, 0o755);
          logger(t("sevenZip.permissionSet"));
        } else {
          logger(t("sevenZip.ready"));
        }
      }
    } else {
      logger(`${t("sevenZip.fileNotFound")} ${path7z}`, "warn");
    }
  } catch (error) {
    logger(
      `${t("sevenZip.permissionError")} ${(error as Error).message}`,
      "warn",
    );
  }
}

ensure7ZHasRightPower();

export function extractWithNode7z(option: {
  zipFilePath: string;
  outputDir: string;
  password: string;
  relativePath: string;
  fullpath: boolean;
  progressBar: ProcessBar;
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
    const stream = (fullpath ? node7z.extractFull : node7z.extract)(
      zipFilePath,
      outputDir,
      {
        $bin: path7z,
        password: password,
        recursive: true,
        $progress: true,
      },
    );

    stream.on("data", (data) => {
      progressBar?.update({
        status: ansiColors.gray(`${t("sevenZip.extracting")}`),
        log: ansiColors.gray(truncateStringMiddleEnhanced(data.file, 50, 50)),
      });
      L.log(`[7z]${t("sevenZip.extracting")}${data.file}`);
    });

    stream.on("progress", (progress) => {
      progressBar?.update(progress.percent);
    });

    stream.on("end", () => {
      progressBar?.update(100, {
        percentage: 100,
        status: ansiColors.green(t("sevenZip.extractComplete")),
        log: "",
      });
      L.log(`[7z]${t("sevenZip.extractComplete")}:${zipFilePath}`);
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
