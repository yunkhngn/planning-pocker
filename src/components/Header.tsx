import { Link } from 'react-router-dom';

export function Header() {
    return (
        <header className="border-b bg-white">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    {/* Replica Logo of Planning Poker Online */}
                    <div className="w-8 h-8 bg-blue-600 rounded-md flex flex-wrap p-1 gap-0.5">
                        <div className="w-full h-full border-2 border-white rounded-sm flex items-center justify-center">
                            <span className="text-white text-xs font-bold">♠</span>
                        </div>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-900">
                        Planning Poker
                    </span>
                </Link>
                <div className="flex items-center gap-4">
                    <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Features</a>
                    <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Pricing</a>
                    <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">Premium</a>
                </div>
            </div>
        </header>
    );
}
