import * as node7z from "node-7z";
import { path7za } from "7zip-bin";
import fs from "fs";
import os from "os";

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
    (error as Error).message
  );
}

export function extractWithNode7z(
  zipFilePath: string,
  outputDir: string,
  password: string,
  indexFlag: string,
  relativePath: string
) {
  const { resolve, reject, promise } = Promise.withResolvers();

  try {
    const stream = node7z.extractFull(zipFilePath, outputDir, {
      $bin: path7za,
      password: password,
      recursive: true,
    });

    stream.on("data", (data) => {
      console.log(`${indexFlag} 🔍 [7z]正在解压:`, data.file);
    });

    stream.on("end", () => {
      console.log(`${indexFlag} 👌 [7z]解压完成: ${relativePath}`);
      resolve(true);
    });

    stream.on("error", (err) => {
      console.error(`${indexFlag} ❌ [7z]解压出错:`, err);
      reject(err);
    });
  } catch (error) {
    console.error(`${indexFlag} ❌ [7z]创建解压流失败:`, error);
    reject(error);
  }

  return promise;
}
