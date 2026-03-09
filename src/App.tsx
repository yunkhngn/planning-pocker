import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { Room } from './components/Room';
import { NotFound } from './components/NotFound';
import { Toaster } from './components/ui/sonner';


function App() {
  return (
    <Router>
      <ThemeProvider defaultTheme="light" storageKey="poker-theme">
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans transition-colors duration-300 dark:bg-zinc-950">
            <Header />
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/room/:id" element={<Room />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Toaster />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
