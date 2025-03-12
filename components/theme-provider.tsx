"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  attribute = "data-theme",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (attribute === "class") {
      root.classList.add(theme === "system" ? getSystemTheme() : theme);
    } else {
      root.setAttribute(
        attribute,
        theme === "system" ? getSystemTheme() : theme,
      );
    }

    if (disableTransitionOnChange) {
      document.documentElement.classList.add("[&_*]:!transition-none");
      window.setTimeout(() => {
        document.documentElement.classList.remove("[&_*]:!transition-none");
      }, 0);
    }
  }, [theme, attribute, disableTransitionOnChange]);

  useEffect(() => {
    if (!enableSystem) return;

    function handleSystemThemeChange() {
      const systemTheme = getSystemTheme();
      if (theme === "system") {
        const root = window.document.documentElement;

        if (attribute === "class") {
          root.classList.remove("light", "dark");
          root.classList.add(systemTheme);
        } else {
          root.setAttribute(attribute, systemTheme);
        }
      }
    }

    const matcher = window.matchMedia("(prefers-color-scheme: dark)");
    matcher.addEventListener("change", handleSystemThemeChange);

    return () => {
      matcher.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme, attribute, enableSystem]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return "light";
}
