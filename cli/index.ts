import os from "os";
import { Command } from "commander";
import { getAvailableLanguages, t } from "../locales";
import { CPU_COUNTS, setCurrentLanguage } from "../config";
import { UZDir } from "../core";
import pkg from "../package.json" with { type: "json" };
import type { Language, UZDirOptions, UZDirParams } from "../types";

/**
 * 设置语言命令处理
 * @param language 语言代码
 */
export function handleLanguageCommand(language?: string): void {
  if (!language) {
    // 显示当前语言和可用语言
    console.log(`${t("lang.current")}: ${t("cli.name")}`);
    console.log(
      `${t("lang.available")}: ${getAvailableLanguages().join(", ")}`,
    );
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

function handleMaxConcurrency(maxConcurrency?: string | number) {
  if (!maxConcurrency) {
    return CPU_COUNTS;
  }
  if (typeof maxConcurrency === "number") {
    return maxConcurrency <= 0 ? CPU_COUNTS : maxConcurrency;
  }
  const parsed = parseInt(maxConcurrency) || CPU_COUNTS;
  return parsed <= 0 ? CPU_COUNTS : parsed;
}

export function handleUzdirOptions(options: UZDirParams): UZDirOptions {
  const defaultOptions = {
    password: "",
    filterFile: null,
    zipFormat: `.zip,.rar`,
    fullpath: "true",
    maxConcurrency: CPU_COUNTS,
  };
  const uzdirOptions: UZDirOptions = {
    inputDir: options.input,
    outputDir: options.output,
    password: options.password ?? defaultOptions.password,
    passwordMapPath: options.passwordMap ?? null,
    filterFile: options.filter ?? defaultOptions.filterFile,
    maxConcurrency: handleMaxConcurrency(options.maxConcurrency),
    zipFormat: options.zipFormat ?? defaultOptions.zipFormat,
    fullpath:
      ["false", "0", "", "null", "undefined", false, 0, null, void 0].includes(
          options.fullpath || defaultOptions.fullpath,
        )
        ? false
        : true,
    withLog: options.log ?? false,
    ignorePattern: options.ignore ?? null,
  };
  return uzdirOptions;
}

/**
 * 主命令处理
 */
export function handleMainCommand(options: UZDirParams): void {
  try {
    const extractor = new UZDir(handleUzdirOptions(options));
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
