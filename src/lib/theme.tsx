'use client'

import {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';


type Theme = 'light' | 'dark';

interface ThemeContextValue{
    theme: Theme,
    toggleTheme: () => void,
    isDark: boolean,

}


const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggleTheme: () => {},
    isDark: true,
});

export function ThemeProvider({children}: {children: React.ReactNode}){
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        if (storedTheme) {
            setTheme(storedTheme);
            applyTheme(storedTheme);
        }
        else {
            applyTheme('dark');
        }
    }, []);

    function applyTheme(theme: Theme){
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        }
        else {
            root.classList.remove('dark');
        }
    };

    function toggleTheme() {
        const newTheme = theme === 'dark'? 'light': 'dark';
            setTheme(newTheme);
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
    };

    return (
        <ThemeContext.Provider 
            value={{theme, toggleTheme, isDark: theme === 'dark'}}
        >
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme(){
    return useContext(ThemeContext);
}