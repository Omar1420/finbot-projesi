// finbot-frontend/src/MakroTakip.js (GÜNCELLENMİŞ TASARIM VE DİNAMİK RENK)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, 
    CartesianGrid, YAxis 
} from 'recharts';
import './App.css'; // Global tema değişkenleri buradan geliyor

const API_BASE_URL = 'http://127.0.0.1:8000';

// --- Yardımcı Fonksiyonlar ---

// Sadece fiyat bilgisini gösteren özel Tooltip
const CustomMakroTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        // Grafikte sadece 'Close' değeri çekiliyor
        const fiyat = payload[0].value; 
        return (
            <div className="custom-tooltip section-card" style={{ padding: '8px', opacity: 0.9 }}>
                <p className="card-label" style={{ fontWeight: 'bold' }}>{`Tarih: ${label}`}</p>
                <p className="card-value" style={{ color: payload[0].stroke, fontWeight: 'bold' }}>
                    {`Fiyat: ${fiyat ? fiyat.toFixed(4) : 'N/A'}`}
                </p>
            </div>
        );
    }
    return null;
};


// Kartı temsil eden yardımcı bileşen
const MakroVarlikKart = ({ varlik }) => {
    
    const fiyatlar = varlik.grafik_data.map(d => d.Close);
    const ilkFiyat = fiyatlar.length > 0 ? fiyatlar[0] : 0;
    const sonFiyat = varlik.fiyat;
    const degisim = sonFiyat - ilkFiyat;
    const yuzdeDegisim = degisim / ilkFiyat * 100;

    // Dinamik renk ve emoji belirleme
    let renk, emoji, birim, sinyalClass;
    
    if (degisim > 0.005) { // %0.5 den büyükse pozitif kabul et
        renk = '#10b981'; // Yeşil (Success)
        emoji = '⬆️';
        sinyalClass = 'sinyal-green';
    } else if (degisim < -0.005) { // %0.5 den küçükse negatif kabul et
        renk = '#dc2626'; // Kırmızı (Danger)
        emoji = '⬇️';
        sinyalClass = 'sinyal-red';
    } else {
        renk = '#f59e0b'; // Sarı (Warning/Neutral)
        emoji = '➖';
        sinyalClass = 'sinyal-sari';
    }
    
    // Birim belirleme (Daha kesin)
    if (varlik.sembol.includes('(TRY)')) { birim = '₺'; } 
    else if (varlik.sembol.includes('EUR') || varlik.sembol.includes('USD')) { birim = '$'; }
    else { birim = ''; } // Ons, Puan vb.

    return (
        // Dinamik renkli kenarlık ve gölge
        <div className={`data-card makro-card`} style={{ 
            border: `1px solid ${renk}`, 
            boxShadow: `0 0 15px rgba(0,0,0,0.2), 0 0 3px ${renk}` 
        }}>
            
            <h4 className="card-label" style={{ color: renk, fontSize: '1rem', marginBottom: '8px' }}>
                {emoji} {varlik.sembol}
            </h4>

            {/* Fiyat ve Değişim */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p className="card-value" style={{ fontSize: '2rem', color: renk, fontWeight: 800 }}>
                    {sonFiyat.toLocaleString(undefined, { minimumFractionDigits: birim === '₺' ? 2 : 4 })}
                </p>
                <p style={{ fontSize: '1rem', color: renk, fontWeight: 'bold' }}>
                    {yuzdeDegisim.toFixed(2)}% <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>({birim})</span>
                </p>
            </div>
            
            <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px'}}>Son 30 Gün Eğilimi</p>
            
            {/* Alan Grafiği (Area Chart) */}
            <div style={{ width: '100%', height: 120, marginTop: '10px' }}>
                <ResponsiveContainer>
                    <AreaChart data={varlik.grafik_data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        {/* Izgara ve Y ekseni kaldırıldı, sadece eğilime odaklanıyoruz */}
                        <XAxis dataKey="Date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={<CustomMakroTooltip />} />
                        
                        {/* Dinamik renkli Alan Grafiği */}
                        <defs>
                            <linearGradient id={`colorMakro-${varlik.sembol}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={renk} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={renk} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        
                        <Area 
                            type="monotone" 
                            dataKey="Close" 
                            stroke={renk} 
                            fillOpacity={1} 
                            fill={`url(#colorMakro-${varlik.sembol})`} 
                            dot={false} 
                            strokeWidth={2} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


function MakroTakip() {
    const [makroVeriler, setMakroVeriler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState('');

    useEffect(() => {
        const makroCek = async () => {
            setYukleniyor(true);
            setHata('');
            try {
                // Backend'den veri çek
                const response = await axios.get(`${API_BASE_URL}/api/makro`);
                setMakroVeriler(response.data);
            } catch (error) {
                const mesaj = error.response?.data?.detail || "Sunucuya ulaşılamıyor veya veri formatı hatalı.";
                setHata(`Hata: ${mesaj}. Makro veri kaynağı (yfinance) bağlantısını kontrol edin.`);
                setMakroVeriler([]);
            } finally {
                setYukleniyor(false);
            }
        };
        makroCek();
    }, []);

    return (
        <>
            {/* BAŞLIK KARTI */}
            <header className="header-card" style={{ textAlign: 'left' }}>
                <h1 className="main-title" style={{ fontSize: '2rem' }}>💰 Küresel Finansal Takip Panosu</h1>
                <p className="card-label" style={{ fontSize: '1rem' }}>Temel makro varlıkların, kurların ve emtiaların son 30 günlük trend analizleri.</p>
            </header>

            {/* DURUM KARTLARI */}
            {yukleniyor && 
                <div className="section-card sinyal-sari" style={{textAlign: 'center', fontWeight: 'bold'}}>
                    <p>⏳ Makro veriler yükleniyor ve hesaplanıyor... Lütfen bekleyin.</p>
                </div>
            }
            
            {hata && 
                <div className="section-card sinyal-red" style={{fontWeight: 'bold'}}>
                    <p>❌ Bağlantı Hatası: {hata}</p>
                </div>
            }
            
            {!yukleniyor && !hata && makroVeriler.length === 0 && (
                <div className="section-card sinyal-sari" style={{fontWeight: 'bold'}}>
                    <p>⚠️ Veri kaynağı kısıtlamaları veya API hatası nedeniyle makro veriler çekilemedi.</p>
                </div>
            )}
            
            {/* Makro kartlarını ızgarada göster */}
            <section className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginTop: '25px' }}>
                {makroVeriler.map(v => (
                    <MakroVarlikKart key={v.sembol} varlik={v} />
                ))}
            </section>
        </>
    );
}

export default MakroTakip;