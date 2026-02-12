// finbot-frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { 
    BrowserRouter as Router, 
    Route, 
    Routes, 
    Link,
    Navigate
} from 'react-router-dom';

// Proje Bileşenleri
import HisseAnaliz from './HisseAnaliz';
import MakroTakip from './MakroTakip'; 
import HaberAkisi from './HaberAkisi'; 
import GlobalEtki from './GlobalEtki';
import ChatRoom from './ChatRoom'; 
import LoginScreen from './LoginScreen'; 
import RegisterScreen from './RegisterScreen'; // Kayıt Ekranı Import'u
import './App.css'; 

// --- Yardımcı Fonksiyonlar: Oturum Yönetimi (Authentication Hook) ---
const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState(null);

    // Uygulama yüklendiğinde localStorage'ı kontrol et
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('username');
        if (token && user) {
            setIsAuthenticated(true);
            setUsername(user);
        } else {
            setIsAuthenticated(false);
            setUsername(null);
        }
    }, []);

    // Giriş yapma fonksiyonu
    const login = (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('username', user);
        setIsAuthenticated(true);
        setUsername(user);
    };

    // Çıkış yapma fonksiyonu
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsAuthenticated(false);
        setUsername(null);
    };

    return { isAuthenticated, username, login, logout };
};

// --- Navigasyon Menüsü ve Tema Anahtarı ---
const NavBar = ({ theme, toggleTheme, isAuthenticated, logout }) => (
    <nav style={{ backgroundColor: '#1a3a5e', padding: '15px 40px', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Sol Tarafta Linkler */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex' }}>
            <li style={{ marginRight: '30px' }}><Link to="/analiz" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>📈 Hisse Analizi</Link></li>
            <li style={{ marginRight: '30px' }}><Link to="/makro" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>💰 Makro Takip</Link></li>
            <li style={{ marginRight: '30px' }}><Link to="/haberler" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>📰 Haber Akışı</Link></li>
            <li style={{ marginRight: '30px' }}><Link to="/global" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>🌎 Global Etki</Link></li>
            <li style={{ marginRight: '30px' }}><Link to="/chat" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>💬 Chat Odası</Link></li>
        </ul>

        {/* Sağ Tarafta Tema Anahtarı ve Çıkış */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
                onClick={toggleTheme} 
                style={{ 
                    backgroundColor: theme === 'dark' ? '#f59e0b' : '#6366f1', 
                    color: theme === 'dark' ? 'black' : 'white', 
                    border: 'none', 
                    padding: '8px 15px', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                {theme === 'dark' ? '☀️ AÇIK MOD' : '🌙 KOYU MOD'}
            </button>

            {isAuthenticated && (
                <button
                    onClick={logout}
                    style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '8px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Çıkış Yap
                </button>
            )}
        </div>
    </nav>
);

// --- Ana Uygulama ---
function App() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const auth = useAuth(); 

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <Router>
            <div className="app-container">
                
                {/* Giriş yapılmışsa NavBar'ı göster */}
                {auth.isAuthenticated && (
                    <NavBar 
                        theme={theme} 
                        toggleTheme={toggleTheme} 
                        isAuthenticated={auth.isAuthenticated}
                        logout={auth.logout}
                    />
                )}
                
                <Routes>
                    {/* 1. Login Sayfası (/) - Giriş yapılmışsa /analiz'e yönlendir */}
                    <Route path="/" element={
                        auth.isAuthenticated ? (
                            <Navigate to="/analiz" replace />
                        ) : (
                            <LoginScreen login={auth.login} /> 
                        )
                    } />
                    
                    {/* 2. Kayıt Olma Sayfası (/register) - Giriş yapılmışsa /analiz'e yönlendir */}
                    <Route path="/register" element={
                        auth.isAuthenticated ? (
                            <Navigate to="/analiz" replace />
                        ) : (
                            // Kayıt başarılı olduğunda da auth.login'i çağırabilmesi için prop olarak gönderilir
                            <RegisterScreen login={auth.login} /> 
                        )
                    } />

                    {/* 3. Diğer Sayfalar (Giriş Yapmayı Gerektirir - Korumalı Rotelar) */}
                    <Route path="/analiz" element={auth.isAuthenticated ? <HisseAnaliz /> : <Navigate to="/" replace />} />
                    <Route path="/makro" element={auth.isAuthenticated ? <MakroTakip /> : <Navigate to="/" replace />} />
                    <Route path="/haberler" element={auth.isAuthenticated ? <HaberAkisi /> : <Navigate to="/" replace />} /> 
                    <Route path="/global" element={auth.isAuthenticated ? <GlobalEtki /> : <Navigate to="/" replace />} /> 
                    <Route path="/chat" element={auth.isAuthenticated ? <ChatRoom username={auth.username} /> : <Navigate to="/" replace />} /> 
                </Routes>
            </div>
        </Router>
    );
}

export default App;