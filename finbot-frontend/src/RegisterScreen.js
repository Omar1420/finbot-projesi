// finbot-frontend/src/RegisterScreen.js (BACKEND BAĞIMSIZ GÜNCELLEME)

import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // useNavigate artık gerekli değil

// login prop'u App.js'ten geliyor
const RegisterScreen = ({ login }) => { 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // const navigate = useNavigate(); // Artık kullanmıyoruz

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (username.length < 3 || password.length < 6) {
             setError("Kullanıcı adı en az 3, şifre en az 6 karakter olmalıdır.");
             return;
        }

        setSuccess('Kayıt başarılı! Giriş yapılıyor...');

        // 🚨 ÖNEMLİ: Backend isteği kaldırıldı veya yorum satırına alındı:
        // try {
        //     const registerResponse = await fetch('http://localhost:8000/api/users', { ... });
        //     if (!registerResponse.ok) { ... }

        //     const loginResponse = await fetch('http://localhost:8000/api/token', { ... });
        //     if (!loginResponse.ok) { ... }
        //     const loginData = await loginResponse.json();
        //     login(loginData.access_token, username);
        // } catch (err) {
        //     setError(err.message || 'Sunucuya bağlanılamadı.');
        // }
        
        // ✨ YENİ MANTIK: Başarılı Kaydı Simüle Etme (Mock Token Kullanma)
        // Herhangi bir başarılı kayıt sonrası, kullanıcı adı ve basit bir token ile giriş yap.
        const mockToken = `mock-token-for-${username}-${Date.now()}`;
        
        setTimeout(() => {
            // Token ve kullanıcı adını localStorage'a kaydet ve state'i true yap
            login(mockToken, username); 
            // Otomatik yönlendirme App.js'teki Router mantığıyla halledilir.
        }, 1500); // 1.5 saniye sonra yönlendir.

    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.header}>Yeni Hesap Oluştur</h2>
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
                    <button type="submit" style={styles.button}>Kayıt Ol</button>
                    
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={styles.success}>{success}</p>}

                </form>
                
                <p style={styles.loginText}>
                    Zaten bir hesabınız var mı? 
                    <Link to="/" style={styles.loginLink}> Giriş Yapın</Link>
                </p>
            </div>
        </div>
    );
};

// --- STİLLER (Aynı Kaldı) ---
const styles = {
    // ... (Mevcut stiller buraya kopyalanmalıdır)
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
        backgroundColor: '#f59e0b', // Turuncu/Sarı
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
    success: {
        color: '#10b981', 
        marginTop: '15px',
    },
    loginText: {
        marginTop: '20px',
        color: 'var(--text-primary)',
        fontSize: '14px',
    },
    loginLink: {
        color: '#10b981', 
        textDecoration: 'none',
        fontWeight: 'bold',
        marginLeft: '5px'
    }
};

export default RegisterScreen;