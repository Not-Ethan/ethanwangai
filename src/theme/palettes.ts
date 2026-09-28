export type ThemeName = 'light' | 'dark';
export interface Palette {
  paper: string; ink: string; inkTop: string; inkKey: string; inkShade: string;
  pencil: string; hot: string; shadow: string;
}
export const PALETTES: Record<ThemeName, Palette> = {
  light: { paper: '#F1EEE9', ink: '#141416', inkTop: '#34343A', inkKey: '#222226', inkShade: '#141416', pencil: '#B9B4AC', hot: '#FF4A1C', shadow: '#D8D3CB' },
  dark:  { paper: '#17171A', ink: '#ECE8E0', inkTop: '#F2EEE6', inkKey: '#E0DBD2', inkShade: '#C9C3B8', pencil: '#4E4E56', hot: '#FF5A2C', shadow: '#0A0A0C' },
};
/** CSS custom property name for each palette key. */
export const CSS_VAR: Record<keyof Palette, string> = {
  paper: '--paper', ink: '--ink', inkTop: '--ink-top', inkKey: '--ink-key', inkShade: '--ink-shade',
  pencil: '--pencil', hot: '--hot', shadow: '--shadow',
};
