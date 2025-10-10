import fs from "fs";
import path from "path";
import os from "os";

export class Logger {
  private logFilePath = path.join(os.homedir(), ".uzdir", "logs");
  private prefix = "[UZDir::Logger]";
  constructor(options?: {
    logFilePath?: string;
    prefix?: string;
  }) {
    const { logFilePath, prefix } = options || {};
    if (logFilePath) {
      this.logFilePath = logFilePath;
    }
    if (prefix) {
      this.prefix = prefix;
    }
  }

  setFilePath(logFilePath: string) {
    this.logFilePath = logFilePath;
  }

  getLogFileDir() {
    return this.logFilePath;
  }

  setPrefix(prefix: string) {
    this.prefix = prefix;
  }

  getLogFileName(type: "log" | "error") {
    const date = new Date();
    const fileName = `__uzdir-${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}${type === "error" ? ".error" : ""}.log`;
    return fileName;
  }

  getLogFilePath(type: "log" | "error") {
    const fileName = this.getLogFileName(type);
    return path.join(this.logFilePath, fileName);
  }

  log(
    message: string,
    displayInConsole: boolean = false,
    displayHandle = (e: string) => e,
  ) {
    const date = new Date();
    const prefix = `${this.prefix}[${
      date.toLocaleString("zh-CN", { hour12: false })
    }]`;

    if (!fs.existsSync(this.logFilePath)) {
      fs.mkdirSync(this.logFilePath, {
        recursive: true,
      });
    }
    fs.appendFileSync(
      this.getLogFilePath("log"),
      `${prefix}${message}\n`,
      {
        encoding: "utf-8",
      },
    );
    if (displayInConsole) {
      console.log(displayHandle(message));
    }
  }

  error(
    message: string,
    error?: unknown | Error,
    displayInConsole: boolean = false,
    displayHandle = (e: string) => e,
  ) {
    const date = new Date();
    const prefix = `${this.prefix}[${
      date.toLocaleString("zh-CN", { hour12: false })
    }]`;
    const filePath = this.getLogFilePath("error");
    if (!fs.existsSync(this.logFilePath)) {
      fs.mkdirSync(this.logFilePath, {
        recursive: true,
      });
    }
    fs.appendFileSync(
      filePath,
      `${prefix}${message}\n`,
      {
        encoding: "utf-8",
      },
    );
    if (error instanceof Error) {
      fs.appendFileSync(
        filePath,
        [
          "stderr" in error
            ? `- [error stderr]:${
              String(error.stderr).trim().replace(/\n/g, " ")
            }`
            : "",
          `- [error stack]:${error.stack}\n`,
        ].filter(Boolean).join("\n"),
        {
          encoding: "utf-8",
        },
      );
    }
    if (displayInConsole) {
      console.error(displayHandle(message));
    }
  }
}
