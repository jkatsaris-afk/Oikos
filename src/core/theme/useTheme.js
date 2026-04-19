import { modeTheme, fallbackTheme } from "./modeTheme";

export default function useTheme(mode = "home") {
  return modeTheme[mode] || fallbackTheme;
}
