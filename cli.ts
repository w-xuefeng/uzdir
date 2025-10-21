import { Command } from "commander";
import pkg from "./package.json" with { type: "json" };
import os from "os";
import { t, getAvailableLanguages } from "./i18n";
import { Language } from "./types";
import { setCurrentLanguage } from "./config";
import { UZDir } from "./core";

/**
 * 设置语言命令处理
 * @param language 语言代码
 */
export function handleLanguageCommand(language?: string): void {
  if (!language) {
    // 显示当前语言和可用语言
    console.log(`${t("lang.current")}: ${t("cli.name")}`);
    console.log(`${t("lang.available")}: ${getAvailableLanguages().join(", ")}`);
  } else {
    // 设置语言
    const availableLanguages = getAvailableLanguages();
    if (availableLanguages.includes(language as Language)) {
      setCurrentLanguage(language as Language);
      console.log(`${t("lang.set")}: ${language}`);
    } else {
      console.error(`${t("lang.invalid")}: ${language}`);
      console.log(`${t("lang.available")}: ${availableLanguages.join(", ")}`);
      process.exit(1);
    }
  }
  process.exit(0);
}

/**
 * 主命令处理
 */
export function handleMainCommand(options: {
  input: string;
  output: string;
  password: string;
  filter: string | null;
  maxConcurrency: string;
  zipFormat: string;
  passwordMap: string | null;
  ignore: string | null;
  log: boolean;
  fullpath: string;
}): void {
  try {
    // 将字符串形式的布尔值转换为实际的布尔值
    let fullpath = true;
    if (
      ["false", "0", "", "null", "undefined"].includes(options.fullpath) ||
      options.fullpath === "false" ||
      options.fullpath === "0"
    ) {
      fullpath = false;
    }

    const extractor = new UZDir(
      options.input,
      options.output,
      options.password,
      options.filter || null,
      parseInt(options.maxConcurrency) || os.cpus().length,
      options.zipFormat || ".zip",
      options.passwordMap || null,
      fullpath,
      options.ignore || null,
      options.log || false,
    );

    extractor.extractAll().catch((error) => {
      console.error(`${t("messages.errorPrefix")}`, error);
      process.exit(1);
    });
  } catch (error) {
    console.error(`${t("messages.errorPrefix")}`, error);
    process.exit(1);
  }
}

/**
 * 初始化命令行程序
 */
export function initCLI(): void {
  const program = new Command();

  program
    .name(t("cli.name"))
    .description(t("cli.description"))
    .version(pkg.version, t("cli.version"))
    .version(pkg.version, t("cli.versionAlias"))
    .requiredOption(t("cli.input"), t("cli.inputDescription"))
    .requiredOption(t("cli.output"), t("cli.outputDescription"))
    .option(t("cli.password"), t("cli.passwordDescription"), "")
    .option(t("cli.filter"), t("cli.filterDescription"))
    .option(
      t("cli.maxConcurrency"),
      t("cli.maxConcurrencyDescription"),
      `${os.cpus().length}`,
    )
    .option(
      t("cli.zipFormat"),
      t("cli.zipFormatDescription"),
      ".zip,.rar",
    )
    .option(
      t("cli.passwordMap"),
      t("cli.passwordMapDescription"),
    )
    .option(
      t("cli.ignore"),
      t("cli.ignoreDescription"),
    )
    .option(
      t("cli.log"),
      t("cli.logDescription"),
    )
    .option(
      t("cli.fullpath"),
      t("cli.fullpathDescription"),
      "true",
    )
    .action(handleMainCommand);

  // 显示帮助信息如果无参数
  if (process.argv.length <= 2) {
    program.help();
  }

  program.parse(process.argv);
}