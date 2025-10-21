import { getCurrentLanguage as getConfigLanguage } from "./config";
import type { Language } from "./types";

// 定义语言包接口
interface LanguagePack {
  [key: string]: string | LanguagePack;
}

// 语言包
const languagePacks: Record<Language, LanguagePack> = {
  zh_CN: {
    cli: {
      name: "uzdir",
      description: "递归解压目录下的所有指定类型的压缩文件，并保持目录结构",
      version: "-v, --version",
      versionAlias: "-V, --VERSION",
      input: "-i, --input <dir>",
      inputDescription: "输入目录路径或压缩文件路径",
      output: "-o, --output <dir>",
      outputDescription: "输出目录路径",
      password: "-p, --password <password>",
      passwordDescription: "解压密码",
      filter: "--filter <filterpath>",
      filterDescription: "要过滤的文件路径（ZIP内相对路径）",
      maxConcurrency: "--maxConcurrency <number>",
      maxConcurrencyDescription: "最大并发数，默认为CPU核心数",
      zipFormat: "--zipFormat <formats>",
      zipFormatDescription: "压缩文件格式，多个格式用逗号分隔",
      passwordMap: "--passwordMap <filepath>",
      passwordMapDescription:
        '密码映射JSON文件路径, 文件中为JSON格式，格式为 { "filePath or fileName or fileExtension": "password" }',
      ignore: "--ignore <patterns>",
      ignoreDescription:
        "忽略文件/目录的模式，多个模式用逗号分隔，支持简单glob模式，默认忽略隐藏文件",
      log: "--log",
      logDescription: "是否将日志输出到output目录，默认为false",
      fullpath: "--fullpath <flag>",
      fullpathDescription:
        "是否使用完整路径解压(即创建同名子目录)，默认为 true，设为 false、0 或 '0' 等 falsy 将会把所有解压后的文件提取到一个目录中",
    },
    lang: {
      command: "lang",
      description: "设置或查看当前语言",
      current: "当前语言",
      available: "可用语言",
      set: "语言已设置为",
      invalid: "无效的语言设置",
    },
    messages: {
      start: "🚀 开始解压过程...",
      input: "📁 输入",
      output: "📂 输出目录",
      formats: "🗂️ 待解压文件格式",
      defaultPassword: "🔑 使用默认密码",
      passwordMap: "📖 使用密码映射文件，包含 {count} 个文件的专用密码",
      passwordMapLoaded: "已加载密码映射文件",
      filter: "⏭️ 过滤文件",
      ignore: "🚫 忽略模式",
      maxConcurrency: "🔁 最大并发数",
      fullPath: "📌 完整路径解压",
      noZipFiles: "ℹ️  未找到压缩文件",
      found: "📦 找到 {count} 个压缩文件",
      actualConcurrency: "🔁 实际并发数",
      complete: "📊 解压完成!",
      success: "✅ 成功处理",
      failed: "❌ 失败",
      files: "个文件",
      none: "无",
      yes: "是",
      no: "否",
      failedList: "❌ 失败文件列表",
      logFile: "📝 错误日志",
      extractLog: "📔 解压日志",
      startTime: "🕐︎ 开始时间",
      endTime: "🕜︎ 完成时间",
      duration: "⌛ 总耗时",
      preparing: "准备解压",
      extracting: "解压中",
      startExtracting: "开始解压",
      extractError: "解压异常",
      completed: "解压完成",
      failedStatus: "解压失败",
      filteredFile: "🙅 已过滤文件",
      filteredDir: "🙅 已过滤目录",
      error: "❌ 删除文件/目录时出错",
      globError: "❌ Glob匹配出错",
      processingError: "❌ 遍历目录时出错",
      fileError: "❌ 无法读取或解析密码映射文件",
      invalidFile: "输入文件不是有效的压缩文件",
      dirNotExists: "输入目录不存在",
      logSeparator: "─".repeat(50),
      processing: "处理中...",
      thread: "线程",
      errorPrefix: "💥 程序执行出错:",
    },
    mcp: {
      missingArguments: "参数缺失",
      passwordMapCreated: "密码映射文件已创建",
      passwordMapCreationFailed: "创建密码映射文件失败",
      unknownTool: "未知工具",
      requestError: "处理请求时出错",
      serverError: "MCP 服务器错误",
      tools: {
        extractDirectory: {
          name: "extract_directory",
          description: "递归解压目录中的所有指定压缩文件",
          input: {
            input: {
              description: "输入目录路径或压缩文件路径",
            },
            output: {
              description: "输出目录路径",
            },
            password: {
              description: "解压密码",
            },
            filter: {
              description: "要过滤的文件路径（压缩包内相对路径）",
            },
            maxConcurrency: {
              description: "最大并发数，默认为CPU核心数",
            },
            zipFormat: {
              description: "压缩文件格式，多个格式用逗号分隔，默认为 '.zip,.rar,.7z'",
            },
            passwordMap: {
              description: "密码映射JSON文件路径",
            },
            ignore: {
              description: "忽略文件/目录的模式，多个模式用逗号分隔",
            },
            fullpath: {
              description: "是否使用完整路径解压(即创建同名子目录)，默认为 true",
            },
            log: {
              description: "是否将日志输出到output目录，默认为false",
            },
          },
        },
        createPasswordMap: {
          name: "create_password_map",
          description: "创建密码映射文件",
          input: {
            passwordMap: {
              description: '密码映射对象，格式为 { "filePath or fileName or fileExtension": "password" }',
            },
            outputPath: {
              description: "密码映射文件输出路径",
            },
          },
        },
      },
    },
    sevenZip: {
      ready: "\n📁 UZDir 已经准备就绪\n",
      missingExtension: "⚠️ Windows 平台上 7za 文件可能缺少正确的扩展名",
      fileNotFound: "⚠️ 7zip 二进制文件不存在:",
      permissionSet: "👌 7zip 二进制文件执行权限已设置",
      permissionError: "⚠️ 无法设置 7zip 二进制文件执行权限:",
      extracting: "正在解压:",
      extractComplete: "解压完成",
    },
  },
  en_US: {
    cli: {
      name: "uzdir",
      description:
        "Recursively extract all specified types of compressed files in the directory and maintain the directory structure",
      version: "-v, --version",
      versionAlias: "-V, --VERSION",
      input: "-i, --input <dir>",
      inputDescription: "Input directory path or compressed file path",
      output: "-o, --output <dir>",
      outputDescription: "Output directory path",
      password: "-p, --password <password>",
      passwordDescription: "Extraction password",
      filter: "--filter <filterpath>",
      filterDescription: "File paths to filter (relative paths within ZIP)",
      maxConcurrency: "--maxConcurrency <number>",
      maxConcurrencyDescription:
        "Maximum concurrency, default is CPU core count",
      zipFormat: "--zipFormat <formats>",
      zipFormatDescription:
        "Compressed file formats, multiple formats separated by commas",
      passwordMap: "--passwordMap <filepath>",
      passwordMapDescription:
        'Password mapping JSON file path, file format is JSON: { "filePath or fileName or fileExtension": "password" }',
      ignore: "--ignore <patterns>",
      ignoreDescription:
        "Patterns for ignoring files/directories, multiple patterns separated by commas, supports simple glob patterns, hidden files are ignored by default",
      log: "--log",
      logDescription:
        "Whether to output logs to the output directory, default is false",
      fullpath: "--fullpath <flag>",
      fullpathDescription:
        "Whether to use full path extraction (i.e. create subdirectories with the same name), default is true, setting to false, 0 or '0' and other falsy values will extract all files to one directory",
    },
    lang: {
      command: "lang",
      description: "Set or view current language",
      current: "Current language",
      available: "Available languages",
      set: "Language set to",
      invalid: "Invalid language setting",
    },
    messages: {
      start: "🚀 Starting extraction process...",
      input: "📁 Input",
      output: "📂 Output directory",
      formats: "🗂️ File formats to extract",
      defaultPassword: "🔑 Using default password",
      passwordMap:
        "📖 Using password mapping file with {count} dedicated passwords",
      passwordMapLoaded: "Password mapping file loaded",
      filter: "⏭️ Filter files",
      ignore: "🚫 Ignore patterns",
      maxConcurrency: "🔁 Maximum concurrency",
      fullPath: "📌 Full path extraction",
      noZipFiles: "ℹ️  No compressed files found",
      found: "📦 Found {count} compressed files",
      actualConcurrency: "🔁 Actual concurrency",
      complete: "📊 Extraction completed!",
      success: "✅ Successfully processed",
      failed: "❌ Failed",
      files: "files",
      none: "None",
      yes: "Yes",
      no: "No",
      failedList: "❌ Failed file list",
      logFile: "📝 Error log",
      extractLog: "📔 Extraction log",
      startTime: "🕐︎ Start time",
      endTime: "🕜︎ End time",
      duration: "⌛ Total duration",
      preparing: "Preparing",
      extracting: "Extracting",
      startExtracting: "Start extracting",
      extractError: "Extraction error",
      completed: "Completed",
      failedStatus: "Failed",
      filteredFile: "🙅 Filtered file",
      filteredDir: "🙅 Filtered directory",
      error: "❌ Error deleting file/directory",
      globError: "❌ Glob matching error",
      processingError: "❌ Error traversing directory",
      fileError: "❌ Cannot read or parse password mapping file",
      invalidFile: "Input file is not a valid compressed file",
      dirNotExists: "Input directory does not exist",
      logSeparator: "─".repeat(50),
      processing: "Processing...",
      thread: "Thread",
      errorPrefix: "💥 Program execution error:",
    },
    mcp: {
      missingArguments: "Missing arguments",
      passwordMapCreated: "Password mapping file created",
      passwordMapCreationFailed: "Failed to create password mapping file",
      unknownTool: "Unknown tool",
      requestError: "Error processing request",
      serverError: "MCP server error",
      tools: {
        extractDirectory: {
          name: "extract_directory",
          description: "Recursively decompress all specified compressed files in a directory",
          input: {
            input: {
              description: "Input directory path or compressed file path",
            },
            output: {
              description: "Output directory path",
            },
            password: {
              description: "Decompression password",
            },
            filter: {
              description: "File paths to filter (relative paths within the archive)",
            },
            maxConcurrency: {
              description: "Maximum concurrency, defaults to CPU core count",
            },
            zipFormat: {
              description: "Compressed file formats, multiple formats separated by commas, defaults to '.zip,.rar,.7z'",
            },
            passwordMap: {
              description: "Password mapping JSON file path",
            },
            ignore: {
              description: "Patterns for ignoring files/directories, multiple patterns separated by commas",
            },
            fullpath: {
              description: "Whether to use full path decompression (create subdirectories with the same name), defaults to true",
            },
            log: {
              description: "Whether to output logs to the output directory, defaults to false",
            },
          },
        },
        createPasswordMap: {
          name: "create_password_map",
          description: "Create a password mapping file",
          input: {
            passwordMap: {
              description: 'Password mapping object in the format { "filePath or fileName or fileExtension": "password" }',
            },
            outputPath: {
              description: "Password mapping file output path",
            },
          },
        },
      },
    },
    sevenZip: {
      ready: "\n📁 UZDir is ready\n",
      missingExtension: "⚠️ 7za file may be missing the correct extension on Windows platform",
      fileNotFound: "⚠️ 7zip binary file not found:",
      permissionSet: "👌 7zip binary file execution permission set",
      permissionError: "⚠️ Failed to set 7zip binary file execution permission:",
      extracting: "Extracting:",
      extractComplete: "Extraction completed",
    },
  },
};

// 获取当前语言
function getCurrentLanguage(): Language {
  return getConfigLanguage();
}

// 翻译函数
export function t(key: string, params?: Record<string, string | number>): string {
  const language = getCurrentLanguage();
  const pack = languagePacks[language];

  // 使用可选链和空值合并操作符安全地获取翻译文本
  const keys = key.split(".");
  let value: string | LanguagePack | undefined = pack;
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as LanguagePack)[k];
    } else {
      // 如果找不到对应键，返回原始键作为提示
      return key;
    }
  }

  // 如果最终值是字符串，则进行参数替换
  if (typeof value === "string") {
    let result = value;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
      }
    }
    return result;
  }

  // 如果找不到对应翻译，返回原始键作为提示
  return key;
}

// 获取可用语言列表
export function getAvailableLanguages(): Language[] {
  return Object.keys(languagePacks) as Language[];
}