// finbot-frontend/src/LoginScreen.js

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const LoginScreen = ({ login }) => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('123456');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Giriş API isteği
            const response = await fetch('http://localhost:8000/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
            }

            const data = await response.json();
            login(data.access_token, username); // App.js'teki login fonksiyonunu çağır

        } catch (err) {
            setError(err.message || 'Sunucuya bağlanılamadı.');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.header}>Finans Bot Girişi</h2>
                <p style={styles.hint}>Varsayılan Kullanıcı: <b>admin</b> | Şifre: <b>123456</b></p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Kullanıcı Adı"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <input
                        type="password"
                        placeholder="Şifre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>Giriş Yap</button>
                    {error && <p style={styles.error}>{error}</p>}
                </form>
                
                <p style={styles.signupText}>
                    Hesabınız yok mu? 
                    <Link to="/register" style={styles.signupLink}> Şimdi Kayıt Olun</Link>
                </p>

            </div>
        </div>
    );
};

// --- STİLLER ---
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
    },
    card: {
        backgroundColor: 'var(--bg-card)', 
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px var(--shadow-color)', 
        width: '350px',
        textAlign: 'center',
        border: '1px solid var(--border-color)',
    },
    header: {
        color: 'var(--text-primary)', 
        marginBottom: '20px',
    },
    hint: {
        color: '#f59e0b',
        marginBottom: '20px',
        fontSize: '14px',
    },
    input: {
        width: '100%',
        padding: '12px',
        marginBottom: '15px',
        borderRadius: '5px',
        border: '1px solid var(--border-color)',
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
    },
    button: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#10b981', // Yeşil
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'background-color 0.3s',
    },
    error: {
        color: '#ef4444',
        marginTop: '15px',
    },
    signupText: {
        marginTop: '20px',
        color: 'var(--text-primary)',
        fontSize: '14px',
    },
    signupLink: {
        color: '#10b981', 
        textDecoration: 'none',
        fontWeight: 'bold',
        marginLeft: '5px'
    }
};

export default LoginScreen;