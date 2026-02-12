// finbot-frontend/src/GlobalEtki.js (NİHAİ PROFESYONEL SÜRÜM)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 

const API_BASE_URL = 'http://127.0.0.1:8000';

// Etkiye göre renk kodu ve etki metni
const getEtkiStyle = (etki) => {
    switch (etki) {
        case 'positive': return { color: '#10b981', text: 'YÜKSELİŞ', emoji: '⬆️' }; // Yeşil
        case 'negative': return { color: '#dc2626', text: 'DÜŞÜŞ', emoji: '⬇️' }; // Kırmızı
        case 'neutral': return { color: '#f59e0b', text: 'NÖTR', emoji: '⚖️' }; // Sarı
        default: return { color: 'var(--text-secondary)', text: 'BİLİNMİYOR', emoji: '❓' };
    }
};

// Sayfanın genel duyarlılığını hesaplayan yardımcı fonksiyon
const calculateSentimentScore = (haberler) => {
    if (haberler.length === 0) return 0;
    let score = 0;
    haberler.forEach(h => {
        if (h.etki === 'positive') score += 1;
        if (h.etki === 'negative') score -= 1;
    });
    // Skoru -100 ile +100 arasında bir yüzdeye çevirme (basit yaklaşım)
    return Math.round((score / haberler.length) * 100);
};


const EtkiKart = ({ haber }) => {
    const etkiStyle = getEtkiStyle(haber.etki);
    
    return (
        <a 
            href={haber.link || "#"} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ textDecoration: 'none', display: 'block' }}
        >
            <div 
                className={`data-card sinyal-neutral`} // Temel kart stilini koru
                style={{ 
                    marginBottom: '15px', 
                    padding: '15px 20px',
                    borderLeft: `5px solid ${etkiStyle.color}`, // Renkli vurgu çizgisi
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 15px rgba(0,0,0,0.4), 0 0 3px ${etkiStyle.color}`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 4px var(--shadow-color)'}
            >
                {/* Başlık */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                    {etkiStyle.emoji} {haber.baslik || "Başlık yok"}
                </h3>

                {/* Footer (Altbilgi) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    {/* Etki Bilgisi */}
                    <span style={{ fontWeight: '600', color: etkiStyle.color }}>
                        Etki: {etkiStyle.text}
                    </span>
                    {/* Kaynak ve Tarih */}
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Kaynak: {haber.kaynak} | Tarih: {haber.tarih}
                    </span>
                </div>
            </div>
        </a>
    );
};

function GlobalEtki() {
    const [haberler, setHaberler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState('');
    const [genelSkor, setGenelSkor] = useState(0);

    useEffect(() => {
        const cekHaberler = async () => {
            setYukleniyor(true);
            setHata('');
            try {
                const response = await axios.get(`${API_BASE_URL}/api/global-etki`);
                const data = response.data;
                setHaberler(data);
                setGenelSkor(calculateSentimentScore(data)); // Genel skoru hesapla
            } catch (error) {
                setHata(error.response?.data?.detail || "Global haber servisine ulaşılamıyor.");
            } finally {
                setYukleniyor(false);
            }
        };
        cekHaberler();
    }, []);

    // Haberleri etkiye göre grupla
    const gruplanmisHaberler = {
        positive: haberler.filter(h => h.etki === 'positive'),
        negative: haberler.filter(h => h.etki === 'negative'),
        neutral: haberler.filter(h => h.etki === 'neutral'),
    };
    
    // Sayaç stili
    const badgeStyle = {
        padding: '3px 8px',
        borderRadius: '5px',
        fontWeight: 'bold',
        marginLeft: '10px',
        fontSize: '1rem'
    };

    // Gruplandırılmış haberleri render eden yardımcı fonksiyon
    const renderGrup = (etkiKey, baslik) => {
        const grup = gruplanmisHaberler[etkiKey];
        if (grup.length === 0) return null;
        const etkiStyle = getEtkiStyle(etkiKey);

        return (
            <div style={{ marginTop: '30px' }}>
                <h2 className="section-title" style={{ color: etkiStyle.color, borderBottom: `2px solid ${etkiStyle.color}` }}>
                    {baslik}
                    <span style={{ ...badgeStyle, backgroundColor: etkiStyle.color, color: 'white' }}>
                        {grup.length}
                    </span>
                </h2>
                {grup.map((haber, index) => <EtkiKart key={index} haber={haber} />)}
            </div>
        );
    };
    
    const skorRenk = genelSkor > 10 ? '#10b981' : genelSkor < -10 ? '#dc2626' : '#f59e0b';


    return (
        <div className="app-container">
            <header className="header-card">
                <h1 className="main-title">🌎 Küresel Piyasa Etki Analizi</h1>
                <p className="card-label">Dünya ekonomisini yönlendiren stratejik gelişmelerin anlık duyarlılık analizi.</p>
            </header>

            {/* GENEL SKOR KARTI - Yalnızca Haber Varsa Göster */}
            {haberler.length > 0 && (
                <div 
                    className="section-card" 
                    style={{ padding: '20px', marginBottom: '20px', border: `1px solid ${skorRenk}` }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p className="card-label" style={{ color: skorRenk, marginBottom: '5px' }}>GENEL DUYARLILIK SKORU</p>
                            <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: '800', color: skorRenk }}>
                                %{Math.abs(genelSkor)} {genelSkor > 0 ? 'POZİTİF' : genelSkor < 0 ? 'NEGATİF' : 'NÖTR'}
                            </h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                                *Pozitif haber yüzdesi, negatif haber yüzdesine göre hesaplanmıştır.
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                                Toplam Haber Sayısı: {haberler.length}
                            </p>
                        </div>
                    </div>
                </div>
            )}


            {/* Durum/Hata Kartları (Kayıp Durumlar için) */}
            <div className="section-card" style={{ padding: '20px', marginBottom: '20px' }}>
                {yukleniyor && <p className="sinyal-sari" style={{ fontWeight: 'bold' }}>⏳ Küresel veriler analiz ediliyor...</p>}
                {hata && <p className="sinyal-red" style={{ fontWeight: 'bold' }}>❌ Hata: {hata}</p>}
                
                {/* Haber Yokken Gösterilecek Bilgi Kartı */}
                {!yukleniyor && !hata && haberler.length === 0 && (
                    <div style={{textAlign: 'center'}}>
                        <h3 style={{color: 'var(--text-secondary)'}}>Veri Akışı Hazır Değil</h3>
                        <p className="sinyal-sari" style={{ fontWeight: 'bold', marginTop: '10px' }}>
                            ⚠️ Güncel küresel haber verisi bulunamadı. Lütfen daha sonra tekrar deneyin.
                        </p>
                    </div>
                )}
            </div>

            {/* HABERLERİ GRUPLANDIRARAK GÖSTERME */}
            {haberler.length > 0 && (
                <section>
                    {renderGrup('positive', 'Pozitif Etki Yaratacak Gelişmeler')}
                    {renderGrup('negative', 'Negatif Etki Yaratacak Gelişmeler')}
                    {renderGrup('neutral', 'Nötr/Beklemede Olan Gelişmeler')}
                </section>
            )}
        </div>
    );
}

export default GlobalEtki;