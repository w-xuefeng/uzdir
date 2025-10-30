import cliProgress from "cli-progress";
import colors from "ansi-colors";
import type { ProcessBar } from "../types";

const progressBarPreset = {
  format: `\r{title} ${
    colors.green(
      "{bar}",
    )
  } {percentage}% {status} {log}`,
  barCompleteChar: "\u2588",
  barIncompleteChar: "\u2591",
};

export const cliProgressController = {
  multiProgressBar: new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: false,
      format: progressBarPreset.format,
      barsize: 24,
    },
    progressBarPreset,
  ),

  createProgressBar: function (total: number, initial: number, payload?: any) {
    return this.multiProgressBar.create(total, initial, payload);
  },

  stopProgressBar: function (bar: ProcessBar | null) {
    if (typeof bar?.stop === "function") {
      bar.stop();
    }
  },

  stopAll: function () {
    this.multiProgressBar.stop();
  },
};
