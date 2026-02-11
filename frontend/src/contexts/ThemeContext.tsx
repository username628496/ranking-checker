import { createContext, useContext } from "react";

type Theme = "light";

interface ThemeContextType {
 theme: Theme;
 toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
 const theme: Theme = "light";
 const toggleTheme = () => {
 // No-op: dark mode removed for simplicity
 };

 return (
 <ThemeContext.Provider value={{ theme, toggleTheme }}>
 {children}
 </ThemeContext.Provider>
 );
}

export function useTheme() {
 const context = useContext(ThemeContext);
 if (!context) {
 throw new Error("useTheme must be used within ThemeProvider");
 }
 return context;
}
