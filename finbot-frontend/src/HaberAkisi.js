// finbot-frontend/src/HaberAkisi.js (GÜNCELLENMİŞ TASARIM)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 

const API_BASE_URL = 'http://localhost:8000';

// Kartı temsil eden yardımcı bileşen
const HaberKart = ({ haber }) => (
    // Yeni kart stili: sinyal-neutral sınıfı kullanılır, border-left ile vurgu eklenir.
    <div 
        className="section-card" 
        style={{ 
            marginBottom: '15px', 
            padding: '15px 20px',
            borderLeft: '4px solid #10b981', // Vurgu rengi
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
            <a 
                href={haber.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                    textDecoration: 'none', 
                    color: 'var(--main-accent-color)', // Mavi tonları (tema değişkeni)
                    display: 'block'
                }}
            >
                {/* 📰 ikonu, haberin başlığını vurgular */}
                📰 {haber.baslik}
            </a>
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Kaynak: <span style={{ fontWeight: '600' }}>{haber.kaynak}</span>
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Tarih: {haber.tarih}
            </p>
        </div>
    </div>
);


function HaberAkisi() {
    const [haberler, setHaberler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState('');

    useEffect(() => {
        const haberCek = async () => {
            setYukleniyor(true);
            setHata('');
            try {
                const response = await axios.get(`${API_BASE_URL}/api/haberler`);
                setHaberler(response.data);
            } catch (error) {
                const mesaj = error.response?.data?.detail || "Haber servisine ulaşılamıyor (Backend hatası).";
                setHata(`Hata: ${mesaj}`);
            } finally {
                setYukleniyor(false);
            }
        };
        haberCek();
    }, []);

    return (
        <>
            {/* BAŞLIK KARTI */}
            <header className="header-card" style={{ textAlign: 'left' }}>
                <h1 className="main-title" style={{ fontSize: '2rem' }}>🇹🇷 Piyasa Haberleri ve Akışı</h1>
                <p className="card-label" style={{ fontSize: '1rem' }}>Önemli yerel kaynaklardan gelen son ekonomi ve borsa gelişmeleri.</p>
            </header>

            {/* DURUM / HATA KARTLARI */}
            {yukleniyor && 
                <div className="section-card sinyal-sari" style={{textAlign: 'center', fontWeight: 'bold'}}>
                    <p>⏳ Güncel haberler RSS kaynaklarından yükleniyor...</p>
                </div>
            }
            
            {hata && 
                <div className="section-card sinyal-red" style={{fontWeight: 'bold'}}>
                    <p>❌ Bağlantı Hatası: {hata}</p>
                </div>
            }
            
            {/* HABER LİSTESİ */}
            {!yukleniyor && haberler.length > 0 ? (
                // Haberleri tek bir liste halinde, modern bir görünüme sahip kartlarda göster
                <section style={{ marginTop: '20px' }}>
                    {haberler.map((haber, index) => (
                        <HaberKart key={index} haber={haber} />
                    ))}
                </section>
            ) : (!yukleniyor && !hata && 
                <div className="section-card sinyal-sari" style={{fontWeight: 'bold'}}>
                    <p>⚠️ Güncel piyasa haberi bulunamadı veya tüm kaynaklara erişilemedi.</p>
                </div>
            )}
        </>
    );
}

export default HaberAkisi;