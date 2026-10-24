export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

let counter = 0;
export function uid(prefix: string): string {
  counter = (counter + 1) % 1000;
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${counter.toString(36).toUpperCase()}`;
}
