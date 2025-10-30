import type cliProgress from "cli-progress";

export interface SimpleProgressSingleBar extends Record<string, any> {
  update(current: number, payload?: object): void;
  update(payload: object): void;
}

export type ProcessBar = cliProgress.SingleBar | SimpleProgressSingleBar | null;

export interface ProgressBarController {
  createProgressBar: (
    total: number,
    initial: number,
    payload?: any,
  ) => ProcessBar;
  stopProgressBar?: (
    bar: ProcessBar,
  ) => void;
  stopAll?: () => void;
}

export type Language = "zh_CN" | "en_US";

export interface LanguagePack {
  [key: string]: string | LanguagePack;
}

export interface UZDirOptionalParams {
  password: string;
  filter: string | null;
  maxConcurrency: string | number;
  zipFormat: string;
  passwordMap: string | null;
  ignore: string | null;
  log: boolean;
  fullpath: string;
}

export interface UZDirParams extends Partial<UZDirOptionalParams> {
  input: string;
  output: string;
}

export interface UZDirOptions {
  inputDir: string;
  outputDir: string;
  password: string;
  filterFile: string | null;
  maxConcurrency: number;
  zipFormat: string;
  passwordMapPath: string | null;
  fullpath: boolean;
  ignorePattern: string | null;
  withLog: boolean;
  logVisible?: boolean;
  progressController?: ProgressBarController | null;
}
