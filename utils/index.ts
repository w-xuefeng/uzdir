export function truncateStringMiddleEnhanced(
  str: string,
  threshold = 30,
  maxLength = threshold,
  options: {
    ellipsis?: string;
    preserveWords?: boolean;
    wordSeparator?: string;
  } = {
    ellipsis: "…",
    preserveWords: false,
    wordSeparator: " ",
  },
) {
  const {
    ellipsis = "…",
    preserveWords = false,
    wordSeparator = " ",
  } = options;

  if (typeof str !== "string" || str.length <= threshold) {
    return str;
  }

  const availableLength = maxLength - ellipsis.length;

  if (availableLength <= 0) return ellipsis;

  let headLength = Math.floor(availableLength / 2);
  let tailLength = availableLength - headLength;

  if (preserveWords) {
    headLength = findWordBoundary(str, headLength, wordSeparator, false);
    tailLength = findWordBoundary(
      str,
      str.length - tailLength,
      wordSeparator,
      true,
    );
  }

  const headPart = str.substring(0, headLength);
  const tailPart = str.substring(str.length - tailLength);

  return headPart + ellipsis + tailPart;
}

function findWordBoundary(
  str: string,
  position: number,
  separator: string,
  isTail: boolean,
) {
  if (isTail) {
    while (position < str.length && str[position] !== separator) {
      position++;
    }
  } else {
    while (position > 0 && str[position] !== separator) {
      position--;
    }
  }
  return position;
}

export function padZero(num: number, count = 2) {
  return num.toString().padStart(count, "0");
}

export function formatMillisecondsToTime(milliseconds: number | string) {
  const totalSeconds = Math.floor(Number(milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${padZero(hours)}:${padZero(minutes)}:${
    padZero(
      seconds,
    )
  }`;
  return formattedTime;
}
