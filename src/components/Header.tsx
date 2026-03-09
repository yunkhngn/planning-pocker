import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';

export function Header() {
    const { theme, setTheme } = useTheme();

    return (
        <header className="border-b dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors duration-300">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    {/* Replica Logo of Planning Poker Online */}
                    <div className="w-8 h-8 bg-blue-600 rounded-md flex flex-wrap p-1 gap-0.5">
                        <div className="w-full h-full border-2 border-white rounded-sm flex items-center justify-center">
                            <span className="text-white text-xs font-bold">♠</span>
                        </div>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Planning Poker
                    </span>
                </Link>
                <div className="flex items-center gap-4">

                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
