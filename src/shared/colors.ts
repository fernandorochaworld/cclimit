/**
 * Shared utility: ANSI colouring for terminal output.
 *
 * Colour is decided per stream: enabled only when the stream is a TTY and
 * the user has not opted out via `NO_COLOR`; `FORCE_COLOR` opts back in.
 * A disabled palette returns text untouched, so piped or redirected output
 * stays free of escape codes.
 */

/** Wraps a string in an ANSI style (or returns it unchanged). */
export type Painter = (text: string) => string;

/** A set of painters for the styles this app uses. */
export interface Palette {
  red: Painter;
  yellow: Painter;
  green: Painter;
  cyan: Painter;
  gray: Painter;
  bold: Painter;
}

function isColorEnabled(stream: NodeJS.WriteStream): boolean {
  const force = process.env.FORCE_COLOR;
  if (force != null && force !== '0' && force !== 'false') return true;
  if (process.env.NO_COLOR != null) return false;
  if (process.env.TERM === 'dumb') return false;
  return stream.isTTY === true;
}

function makePalette(enabled: boolean): Palette {
  const paint =
    (code: number): Painter =>
    (text) =>
      enabled ? `\x1b[${code}m${text}\x1b[0m` : text;
  return {
    red: paint(31),
    yellow: paint(33),
    green: paint(32),
    cyan: paint(36),
    gray: paint(90),
    bold: paint(1),
  };
}

/** Palette for stdout — used by the renderers. */
export const stdoutColors: Palette = makePalette(isColorEnabled(process.stdout));

/** Palette for stderr — used for errors and warnings. */
export const stderrColors: Palette = makePalette(isColorEnabled(process.stderr));
