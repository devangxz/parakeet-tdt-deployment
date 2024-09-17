import { ThemeProvider } from "@emotion/react";
import { ReactNode } from "react";

import { theme } from "../../../mui.theme";

export default function MuiThemeProvider({ children }: { children?: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
