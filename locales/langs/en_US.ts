export default {
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
    maxConcurrencyDescription: "Maximum concurrency, default is CPU core count",
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
    unknown: "unknown",
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
        description:
          "Recursively decompress all specified compressed files in a directory",
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
            description:
              "File paths to filter (relative paths within the archive)",
          },
          maxConcurrency: {
            description: "Maximum concurrency, defaults to CPU core count",
          },
          zipFormat: {
            description:
              "Compressed file formats, multiple formats separated by commas, defaults to '.zip,.rar,.7z'",
          },
          passwordMap: {
            description: "Password mapping JSON file path",
          },
          ignore: {
            description:
              "Patterns for ignoring files/directories, multiple patterns separated by commas",
          },
          fullpath: {
            description:
              "Whether to use full path decompression (create subdirectories with the same name), defaults to true",
          },
          log: {
            description:
              "Whether to output logs to the output directory, defaults to false",
          },
        },
      },
      createPasswordMap: {
        name: "create_password_map",
        description: "Create a password mapping file",
        input: {
          passwordMap: {
            description:
              'Password mapping object in the format { "filePath or fileName or fileExtension": "password" }',
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
    missingExtension:
      "⚠️ 7za file may be missing the correct extension on Windows platform",
    fileNotFound: "⚠️ 7zip binary file not found:",
    permissionSet: "👌 7zip binary file execution permission set",
    permissionError: "⚠️ Failed to set 7zip binary file execution permission:",
    extracting: "Extracting:",
    extractComplete: "Extraction completed",
  },
};
