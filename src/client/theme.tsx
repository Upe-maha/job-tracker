'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useSyncExternalStore,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme,
    toggleTheme: () => void,
    isDark: boolean,
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggleTheme: () => {},
    isDark: true,
});

const STORAGE_KEY = 'theme';

// localStorage is an external store, so it is read through
// useSyncExternalStore rather than copied into state by an effect. The old
// version called setState inside an effect body, which triggers a cascading
// re-render on every mount (and is what react-hooks/set-state-in-effect
// flags).
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Keeps two tabs in step: `storage` fires in every *other* tab.
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
}

function getSnapshot(): Theme {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

// Dark is the default, and the server has no localStorage to consult.
function getServerSnapshot(): Theme {
    return 'dark';
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    // Pushing React's state out to the DOM — the direction an effect is for.
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        const next: Theme = getSnapshot() === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        emit();
    }, []);

    return (
        <ThemeContext.Provider
            value={{ theme, toggleTheme, isDark: theme === 'dark' }}
        >
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext);
}
