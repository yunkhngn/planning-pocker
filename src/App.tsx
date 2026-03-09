import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { Room } from './components/Room';


function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
          <Header />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/room/:id" element={<Room />} />
            </Routes>
          </main>
          {/* We would use shadcn toaster here, assuming sonner is installed or skip until needed. 
              Checking earlier, we didn't add sonner yet. Let's just comment it out. */}
          {/* <Toaster /> */}
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
