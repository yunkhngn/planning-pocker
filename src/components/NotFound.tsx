import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50/50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="max-w-md w-full text-center space-y-8 bg-white dark:bg-zinc-900 p-10 rounded-3xl shadow-xl dark:shadow-none border border-gray-100 dark:border-zinc-800">
                <div className="flex justify-center">
                    <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        404
                    </h1>
                    <p className="text-xl font-medium text-gray-800 dark:text-gray-200">
                        Page not found
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        The page you are looking for doesn't exist or has been moved.
                        Please check the URL or return home.
                    </p>
                </div>

                <div className="pt-4">
                    <Button
                        onClick={() => navigate('/')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-xl text-lg shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
