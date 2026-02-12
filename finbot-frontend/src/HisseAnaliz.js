// finbot-frontend/src/HisseAnaliz.js (RSI Kartı ve EN İYİ TASARIM)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import './App.css'; 

const API_BASE_URL = 'http://127.0.0.1:8000';

// --- Yardımcı Fonksiyonlar ---
const getSinyalClassByCode = (code) => {
    if (!code) return 'data-card sinyal-neutral';

    if (code === 'YEŞİL') return 'data-card sinyal-green';
    if (code === 'KIRMIZI') return 'data-card sinyal-red';
    if (code === 'SARI') return 'data-card sinyal-sari'; 
    return 'data-card sinyal-neutral'; 
};

// Custom Tooltip (Grafik Veri Kutusu)
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
        return null;
    }
        
    const sembol = payload[0]?.payload?.sembol;
    const fiyatBirimi = sembol && sembol.endsWith(".IS") ? "TRY" : "USD"; 
        
    return (
        // Mevcut tema CSS'indeki 'section-card' sınıfı kullanıldı
        <div className="custom-tooltip section-card" style={{ padding: '8px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.4)', borderRadius: '6px', opacity: 0.9 }}>
            <p className="card-label" style={{ fontWeight: 'bold', marginBottom: '3px', borderBottom: '1px solid var(--border-color)' }}>{`Tarih: ${label}`}</p>
            {payload.map((item, index) => (
                <p key={index} style={{ color: item.color, fontSize: '12px', margin: '2px 0' }}>
                    {`${item.name}: ${item.value !== null ? item.value.toFixed(item.name.includes("RSI") ? 0 : 2) : 'N/A'} ${item.name.includes("Ortalama") || item.name.includes("Fiyat") ? fiyatBirimi : ''}`}
                </p>
            ))}
        </div>
    );
};

// --- HISSE ANALIZI ANA BILEŞENI ---
function HisseAnaliz() {
    const [sembol, setSembol] = useState('AAPL'); 
    const [hisseAnaliz, setHisseAnaliz] = useState(null);
    const [hata, setHata] = useState('');
    const [yukleniyorHisse, setYukleniyorHisse] = useState(false);
    const [rsiDegeri, setRsiDegeri] = useState(null); // Yeni RSI state'i

    // Hisse Senedi Analizi Çekme
    const hisseCek = async (targetSembol) => {
        if (!targetSembol) return;
        setYukleniyorHisse(true);
        setHata('');
        setHisseAnaliz(null);
        setRsiDegeri(null); // Sıfırla

        try {
            const response = await axios.get(`${API_BASE_URL}/api/analiz/${targetSembol}`);
            
            const grafikData = response.data.son_90_gunluk_veri.map(item => ({
                ...item,
                Close: parseFloat(item.Close),
                SMA_20: item.SMA_20 ? parseFloat(item.SMA_20) : null,
                SMA_50: item.SMA_50 ? parseFloat(item.SMA_50) : null,
                RSI: item.RSI ? parseFloat(item.RSI) : null,
                sembol: response.data.sembol
            }));

            const fiyatBirimi = response.data.sembol.endsWith(".IS") ? "TRY" : "USD";

            setHisseAnaliz({
                ...response.data,
                fiyat_birimi: fiyatBirimi, 
                son_90_gunluk_veri: grafikData
            });

            // Son RSI değerini al ve kaydet
            const sonRSI = grafikData.length > 0 ? grafikData[grafikData.length - 1].RSI : null;
            if (sonRSI !== null) {
                setRsiDegeri(sonRSI.toFixed(0));
            } else {
                 setRsiDegeri("N/A");
            }


        } catch (error) {
            const mesaj = error.response?.data?.detail || "Hisse verisi analizi sırasında beklenmeyen bir hata oluştu. Sunucuyu kontrol edin.";
            setHata(`Hata: ${mesaj}`);
        } finally {
            setYukleniyorHisse(false);
        }
    };

    useEffect(() => {
        hisseCek(sembol);
    }, []); 

    const handleSubmit = (e) => {
        e.preventDefault();
        hisseCek(sembol);
    };

    // Piyasa durumu kartı için stil
    const getMarketStyle = (durum) => {
        if (durum.includes('Boğa')) return { color: '#10b981', emoji: '🐂 Boğa Piyasası' };
        if (durum.includes('Ayı')) return { color: '#dc2626', emoji: '🐻 Ayı Piyasası' };
        return { color: 'var(--text-secondary)', emoji: '⏸️ Nötr Piyasa' };
    };

    const marketStyle = hisseAnaliz ? getMarketStyle(hisseAnaliz.piyasa_durumu) : {};

    // Özlü Söz Kutusu (Insight Box)
    const getInsightBox = (analiz) => {
        const skor = analiz.analiz_puani;
        const trend = analiz.sinyal_uzun_vade;
        
        let baslik = "";
        let metin = "";
        let stil = {};

        if (trend.includes("ALIM") || skor >= 4) {
            baslik = "✅ Güçlü Yükseliş İhtimali";
            metin = "Bot, teknik ve temel göstergelerden güçlü sinyaller alıyor. Piyasa koşulları potansiyel bir yükselişi destekleyebilir. Alım/Tuta geçilebilir.";
            stil = { borderLeft: '4px solid #10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' };
        } else if (trend.includes("SAT") || skor <= -3) {
            baslik = "❌ Kritik Düşüş Riski";
            metin = "Hisse, kritik destek seviyelerinin altında baskı altında. Satış baskısı yüksek. Pozisyonları küçültmek veya satış yapmak önerilir.";
            stil = { borderLeft: '4px solid #dc2626', backgroundColor: 'rgba(220, 38, 38, 0.1)' };
        } else {
            baslik = "⚠️ Konsolidasyon / İzleme Modu";
            metin = "Net bir trend yok, fiyat yatay seyrediyor. Yeni bir pozisyon açmadan önce sinyalin netleşmesi beklenmelidir.";
            stil = { borderLeft: '4px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' };
        }

        return (
            <div style={{ padding: '15px', borderRadius: '8px', marginTop: '20px', ...stil }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', fontWeight: '700', color: stil.borderLeft.split(' ')[2] }}>{baslik}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{metin}</p>
            </div>
        );
    };

    // RSI Durumu kartı için stil
    const getRSIStyle = (rsi) => {
        if (rsi === "N/A" || isNaN(rsi)) return { color: 'var(--text-primary)', emoji: '❓', durum: 'Veri Yok', sinyalClass: 'data-card sinyal-neutral' };
        const rsiVal = parseFloat(rsi);
        if (rsiVal > 70) return { color: '#dc2626', emoji: '🔥', durum: 'Aşırı Alım', sinyalClass: 'data-card sinyal-red' };
        if (rsiVal < 30) return { color: '#10b981', emoji: '💎', durum: 'Aşırı Satım', sinyalClass: 'data-card sinyal-green' };
        return { color: 'var(--text-primary)', emoji: '⚖️', durum: 'Nötr Bölge', sinyalClass: 'data-card sinyal-neutral' };
    };
    
    const rsiStyle = getRSIStyle(rsiDegeri);


    // Arayüz Çıktısı
    return (
        <>
            <header className="header-card">
                <h1 className="main-title">Finansal Analiz Motoru</h1>
                <p className="card-label">Çoklu Kriter (Quant) Değerlendirme Sistemi</p>
            </header>

            <section className="section-card" style={{ padding: '20px' }}>
                {/* GİRİŞ FORMU */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                        type="text"
                        value={sembol}
                        onChange={(e) => setSembol(e.target.value.toUpperCase())}
                        placeholder="Sembol Girin (Örn: AAPL veya THYAO.IS)"
                        className="input-style"
                        style={{ flexGrow: 1 }}
                    />
                    <button type="submit" disabled={yukleniyorHisse} className="button-style">
                        {yukleniyorHisse ? 'Analiz Ediliyor...' : 'Analiz Et'}
                    </button>
                </form>

                {/* HATA MESAJI */}
                {hata && <div className="sinyal-red" style={{ padding: '12px', margin: '0 0 20px 0', fontWeight: '600' }}>⚠️ {hata}</div>}

                {/* ANALİZ SONUÇLARI PANO */}
                {hisseAnaliz && (
                    <div className="mt-6">
                        
                        <h3 className="section-title" style={{ borderBottom: 'none', marginBottom: '15px' }}>
                            {hisseAnaliz.sembol} Analiz Detayı
                            <span className="card-label" style={{ marginLeft: '15px', fontWeight: 'normal' }}>
                                Son Kapanış: {hisseAnaliz.son_fiyat} {hisseAnaliz.fiyat_birimi}
                            </span>
                        </h3>
                        
                        {/* ÖZLÜ SÖZ KUTUSU */}
                        {getInsightBox(hisseAnaliz)}
                        
                        {/* BİLGİ KARTLARI (4 Adet) */}
                        <div className="info-grid" style={{ marginTop: '20px' }}>
                            
                            {/* 1. NİHAİ KARAR KARTI */}
                            <div className={getSinyalClassByCode(hisseAnaliz.sinyal_renk_kodu)}>
                                <p className="card-label">✨ BOT ÖNERİSİ</p>
                                <p style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px' }}>{hisseAnaliz.sinyal_uzun_vade}</p>
                                <p style={{ fontSize: '0.875rem' }}>Analiz Skoru: {hisseAnaliz.analiz_puani} / 10</p>
                            </div>

                            {/* 2. PİYASA DURUM KARTI */}
                            <div className="data-card sinyal-neutral">
                                <p className="card-label">🌎 GENEL PİYASA TRENDİ</p>
                                <p className="card-value" style={{ color: marketStyle.color, fontSize: '1.4rem', fontWeight: '800' }}>
                                    {marketStyle.emoji}
                                </p>
                                <p style={{ fontSize: '0.875rem' }}>{hisseAnaliz.piyasa_durumu}</p>
                            </div>

                            {/* 3. DEĞERLEME (F/K) KARTI */}
                            <div className="data-card sinyal-neutral">
                                <p className="card-label">📊 F/K ORANI (Değerleme)</p>
                                <p className="card-value" style={{ fontSize: '1.4rem', fontWeight: '800' }}>{hisseAnaliz.fiyat_kazanc}</p>
                                <p style={{ fontSize: '0.875rem' }}>Kısa Vade: {hisseAnaliz.sinyal_kisa_vade}</p>
                            </div>
                            
                            {/* 4. YENİ KART: ANLIK RSI DEĞERİ (Güvenilir Metrik) */}
                            <div className={rsiStyle.sinyalClass}>
                                <p className="card-label">📈 ANLIK RSI DEĞERİ (14 GÜNLÜK)</p>
                                <p className="card-value" style={{ color: rsiStyle.color, fontSize: '1.4rem', fontWeight: '800' }}>
                                    {rsiStyle.emoji} {rsiDegeri}
                                </p>
                                <p style={{ fontSize: '0.875rem' }}>Sinyal: {rsiStyle.durum}</p>
                            </div>
                            
                        </div>

                        {/* GRAFİK BÖLÜMÜ */}
                        <div className="section-card" style={{ marginTop: '30px' }}>
                            
                            {/* FİYAT GRAFİĞİ */}
                            <h4 className="section-title">Fiyat ve Hareketli Ortalama (Son 90 Gün)</h4>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={hisseAnaliz.son_90_gunluk_veri} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="Date" interval="preserveEnd" angle={-30} textAnchor="end" height={60} style={{ fontSize: '10px', fill: 'var(--text-secondary)' }} />
                                        <YAxis 
                                            domain={['auto', 'auto']} 
                                            stroke="var(--text-primary)"
                                            style={{ fontSize: '10px', fill: 'var(--text-secondary)' }}
                                            tickFormatter={(value) => `${value.toFixed(2)} ${hisseAnaliz.fiyat_birimi}`}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-primary)' }}/>
                                        
                                        <Line type="monotone" dataKey="Close" stroke="#007bff" dot={false} strokeWidth={2} name={`Kapanış Fiyatı (${hisseAnaliz.fiyat_birimi})`} />
                                        <Line type="monotone" dataKey="SMA_20" stroke="#10b981" dot={false} strokeWidth={1.5} name="20 Günlük Ortalama" />
                                        <Line type="monotone" dataKey="SMA_50" stroke="#dc2626" dot={false} strokeWidth={1.5} name="50 Günlük Ortalama" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* RSI GRAFİĞİ (AreaChart) */}
                            <h4 className="section-title" style={{ marginTop: '30px' }}>Göreceli Güç Endeksi (RSI) Görseli</h4>
                            <div style={{ width: '100%', height: 150 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={hisseAnaliz.son_90_gunluk_veri} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="Date" interval="preserveEnd" hide />
                                        <YAxis 
                                            domain={[0, 100]} 
                                            tickCount={5} 
                                            stroke="var(--text-primary)"
                                            style={{ fontSize: '10px', fill: 'var(--text-secondary)' }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        
                                        {/* Kritik Çizgiler */}
                                        <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="5 5" label={{ value: 'Aşırı Alım (70)', position: 'right', fontSize: '10px', fill: '#dc2626' }} />
                                        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Aşırı Satım (30)', position: 'right', fontSize: '10px', fill: '#10b981' }} />
                                        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="1 1" label={{ value: 'Nötr (50)', position: 'insideTop', fontSize: '10px', fill: '#f59e0b' }} />

                                        {/* RSI alan grafiği */}
                                        <Area type="monotone" dataKey="RSI" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} dot={false} strokeWidth={2} name="RSI Endeksi" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                        </div>
                    </div>
                )}
            </section>
        </>
    );
}

export default HisseAnaliz;