import * as node7z from "node-7z";
import { path7za } from "7zip-bin";

export function extractWithNode7z(
  zipFilePath: string,
  outputDir: string,
  password: string
) {
  const { resolve, reject, promise } = Promise.withResolvers();

  try {
    const stream = node7z.extractFull(zipFilePath, outputDir, {
      $bin: path7za,
      password: password,
      recursive: true,
    });

    stream.on("data", (data) => {
      console.log("🔍 [7z]正在解压:", data.file);
    });

    stream.on("end", () => {
      console.log("👌 [7z]解压完成");
      resolve(true);
    });

    stream.on("error", (err) => {
      console.error("❌ [7z]解压出错:", err);
      reject(err);
    });
  } catch (error) {
    console.error("❌ [7z]创建解压流失败:", error);
    reject(error);
  }

  return promise;
}
