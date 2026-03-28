export interface AnsiStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
}

export interface AnsiToken {
  text: string;
  style: AnsiStyle;
}

const ANSI_COLORS = [
  '#000000',
  '#cd0000',
  '#00cd00',
  '#cdcd00',
  '#0000ee',
  '#cd00cd',
  '#00cdcd',
  '#e5e5e5',
  '#7f7f7f',
  '#ff0000',
  '#00ff00',
  '#ffff00',
  '#5c5cff',
  '#ff00ff',
  '#00ffff',
  '#ffffff',
];

export class AnsiParser {
  private currentStyle: AnsiStyle = {};
  private tokens: AnsiToken[] = [];
  private currentText = '';

  constructor() {
    this.reset();
  }

  reset(): void {
    this.currentStyle = {};
    this.tokens = [];
    this.currentText = '';
  }

  parse(text: string): AnsiToken[] {
    this.reset();

    const regex = /\x1b\[([0-9;]*)[mGK]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const beforeMatch = text.slice(lastIndex, match.index);
      if (beforeMatch) {
        this.addText(beforeMatch);
      }

      if (match[0].endsWith('m')) {
        const codes = match[1] ? match[1].split(';').map(Number) : [];
        this.handleSGR(codes);
      }

      lastIndex = match.index + match[0].length;
    }

    const remaining = text.slice(lastIndex);
    if (remaining) {
      this.addText(remaining);
    }

    this.flushCurrentText();

    return [...this.tokens];
  }

  private addText(text: string): void {
    this.currentText += text;
  }

  private flushCurrentText(): void {
    if (this.currentText) {
      this.tokens.push({
        text: this.currentText,
        style: { ...this.currentStyle },
      });
      this.currentText = '';
    }
  }

  private handleSGR(codes: number[]): void {
    if (codes.length === 0) {
      codes = [0];
    }

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];

      switch (code) {
        case 0:
          this.flushCurrentText();
          this.currentStyle = {};
          break;
        case 1:
          this.flushCurrentText();
          this.currentStyle.bold = true;
          break;
        case 3:
          this.flushCurrentText();
          this.currentStyle.italic = true;
          break;
        case 4:
          this.flushCurrentText();
          this.currentStyle.underline = true;
          break;
        case 22:
          this.flushCurrentText();
          delete this.currentStyle.bold;
          break;
        case 23:
          this.flushCurrentText();
          delete this.currentStyle.italic;
          break;
        case 24:
          this.flushCurrentText();
          delete this.currentStyle.underline;
          break;
        case 39:
          this.flushCurrentText();
          delete this.currentStyle.color;
          break;
        case 49:
          this.flushCurrentText();
          delete this.currentStyle.backgroundColor;
          break;
        default:
          if (code >= 30 && code <= 37) {
            this.flushCurrentText();
            this.currentStyle.color = ANSI_COLORS[code - 30];
          } else if (code >= 40 && code <= 47) {
            this.flushCurrentText();
            this.currentStyle.backgroundColor = ANSI_COLORS[code - 40];
          } else if (code >= 90 && code <= 97) {
            this.flushCurrentText();
            this.currentStyle.color = ANSI_COLORS[code - 90 + 8];
          } else if (code >= 100 && code <= 107) {
            this.flushCurrentText();
            this.currentStyle.backgroundColor = ANSI_COLORS[code - 100 + 8];
          } else if (code === 38 || code === 48) {
            if (i + 1 < codes.length && codes[i + 1] === 5) {
              if (i + 2 < codes.length) {
                const colorCode = codes[i + 2];
                if (colorCode >= 0 && colorCode <= 255) {
                  this.flushCurrentText();
                  const color = this.get256Color(colorCode);
                  if (code === 38) {
                    this.currentStyle.color = color;
                  } else {
                    this.currentStyle.backgroundColor = color;
                  }
                }
                i += 2;
              }
            }
          }
          break;
      }
    }
  }

  private get256Color(code: number): string {
    if (code < 16) {
      return ANSI_COLORS[code];
    } else if (code < 232) {
      const index = code - 16;
      const r = Math.floor(index / 36);
      const g = Math.floor((index % 36) / 6);
      const b = index % 6;
      const toHex = (v: number) => {
        const value = v === 0 ? 0 : 0x5f + v * 0x28;
        return value.toString(16).padStart(2, '0');
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } else {
      const gray = 8 + (code - 232) * 10;
      const hex = gray.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    }
  }

  static stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*[mGK]/g, '');
  }
}

export const ansiParser = new AnsiParser();
