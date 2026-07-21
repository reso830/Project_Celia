export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface RgbInput {
  red: string;
  green: string;
  blue: string;
}

const hexColorPattern = /^#[0-9a-f]{6}$/i;
const rgbChannelPattern = /^(0|[1-9][0-9]{0,2})$/;

export function parseHexColor(value: string): RgbColor | undefined {
  if (!hexColorPattern.test(value)) {
    return undefined;
  }

  return {
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16),
  };
}

export function parseRgbColor(
  red: string,
  green: string,
  blue: string,
): RgbColor | undefined {
  const channels = [red, green, blue];

  if (!channels.every((channel) => rgbChannelPattern.test(channel))) {
    return undefined;
  }

  const [parsedRed, parsedGreen, parsedBlue] = channels.map(Number);

  if ([parsedRed, parsedGreen, parsedBlue].some((channel) => channel > 255)) {
    return undefined;
  }

  return { red: parsedRed, green: parsedGreen, blue: parsedBlue };
}

export function formatHexColor({ red, green, blue }: RgbColor): string {
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function formatRgbColor({ red, green, blue }: RgbColor): RgbInput {
  return { red: String(red), green: String(green), blue: String(blue) };
}

export function expenseBucketColorKey(bucket: string): string {
  return `expense:${bucket.trim().toLocaleLowerCase()}`;
}
