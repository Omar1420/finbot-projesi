from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List
import yfinance as yf
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import feedparser
from fastapi.middleware.cors import CORSMiddleware

PRICE_COLUMN = 'Adj Close'

# --- 2. Veri Modelleri ---
class MakroVarlik(BaseModel):
    sembol: str
    fiyat: float
    grafik_data: list[dict]

class AnalizSonucu(BaseModel):
    sembol: str
    son_fiyat: float
    acilis: float
    fiyat_kazanc: float
    sinyal_kisa_vade: str
    sinyal_uzun_vade: str
    analiz_puani: int = 0
    sinyal_renk_kodu: str = "SARI"
    piyasa_durumu: str = "Nötr"
    son_90_gunluk_veri: list[dict]
    ihtimaller: dict = {}  # Monte Carlo ile gelecek ihtimaller
    bot_skor: int = 5       # 0-10 arası skor

class Haber(BaseModel):
    baslik: str
    link: str
    kaynak: str
    tarih: str
    etki: str = "neutral"

class GlobalEtki(BaseModel):
    olay_adi: str
    kategori: str
    etki_turu: str 
    tarih: str
    aciklama: str

class UserCreate(BaseModel):
    username: str
    password: str
    
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class MessageSchema(BaseModel):
    sender: str
    content: str
    timestamp: datetime = None

# --- 1. Uygulama ve CORS ---
app = FastAPI()
origins = ["http://localhost", "http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- 3. Yardımcı Fonksiyonlar ---
def calculate_rsi(data, window=14):
    delta = data[PRICE_COLUMN].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=window, min_periods=1).mean()
    avg_loss = loss.rolling(window=window, min_periods=1).mean()
    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100 - (100 / (1 + rs))
    return rsi.ffill().bfill()

def get_price_data(sembol: str, period: str = "200d"):
    try:
        data = yf.Ticker(sembol).history(period=period, interval="1d")
    except Exception:
        raise Exception(f"'{sembol}' için veri çekilemedi.")
    
    if data.empty:
        # Son kapanışı almak için son gün verisi
        try:
            data = yf.download(sembol, period="5d", interval="1d")
        except:
            raise Exception(f"'{sembol}' için veri bulunamadı.")
    
    if PRICE_COLUMN not in data.columns:
        if 'Close' in data.columns:
            data[PRICE_COLUMN] = data['Close']
        else:
            raise Exception(f"'{sembol}' için fiyat sütunu bulunamadı.")
    return data

def get_market_sentiment():
    try:
        sp500_data = get_price_data('^GSPC', period='1y')
        sp500_data['SMA_200'] = sp500_data[PRICE_COLUMN].rolling(200).mean()
        if sp500_data[PRICE_COLUMN].iloc[-1] > sp500_data['SMA_200'].iloc[-1]:
            return {"durum": "Boğa Piyasası", "puan": 1}
        elif sp500_data[PRICE_COLUMN].iloc[-1] < sp500_data['SMA_200'].iloc[-1]:
            return {"durum": "Ayı Piyasası", "puan": -1}
    except:
        pass
    return {"durum": "Veri Yok", "puan": 0}

def monte_carlo_simulation(data, n_simulations=1000, n_days=5):
    log_returns = np.log(data[PRICE_COLUMN] / data[PRICE_COLUMN].shift(1)).dropna()
    mu = log_returns.mean()
    sigma = log_returns.std()
    last_price = data[PRICE_COLUMN].iloc[-1]

    sim_prices = []
    for _ in range(n_simulations):
        price = last_price
        for _ in range(n_days):
            price *= np.exp(np.random.normal(mu, sigma))
        sim_prices.append(price)
    
    sim_prices = np.array(sim_prices)
    probs = {
        'down_5%': round(np.mean(sim_prices < last_price*0.95), 2),
        'down_1%': round(np.mean(sim_prices < last_price*0.99), 2),
        'neutral': round(np.mean((sim_prices >= last_price*0.99) & (sim_prices <= last_price*1.01)), 2),
        'up_1%': round(np.mean(sim_prices > last_price*1.01), 2),
        'up_5%': round(np.mean(sim_prices > last_price*1.05), 2)
    }
    return probs

def calculate_bot_score(analiz_puani, rsi_value, volatilite, fk, sektor_fk):
    score = 0
    if rsi_value is not None:
        if rsi_value > 70: score -= 2
        elif rsi_value < 30: score += 2
    if volatilite is not None:
        if volatilite > 0.03: score -= 1
        else: score += 1
    if fk < sektor_fk*0.75: score += 1
    elif fk > sektor_fk*1.5: score -= 1
    score = max(0, min(10, 5 + score))
    return score

# --- 4. Hisse Analizi Fonksiyonu ---
def analiz_et(sembol: str):
    try:
        data = get_price_data(sembol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if len(data) < 20:
        raise HTTPException(status_code=400, detail=f"{sembol} için yeterli veri yok.")

    makro_analiz = get_market_sentiment()

    data['SMA_20'] = data[PRICE_COLUMN].rolling(20).mean()
    data['SMA_50'] = data[PRICE_COLUMN].rolling(50).mean()
    data['RSI'] = calculate_rsi(data)
    data['Volatilite'] = data[PRICE_COLUMN].pct_change().rolling(20).std()

    SEKTOR_FK_ORTALAMASI = 25.0
    try:
        info = yf.Ticker(sembol).info
        fk = info.get('trailingPE', SEKTOR_FK_ORTALAMASI)
    except:
        fk = SEKTOR_FK_ORTALAMASI

    analiz_puani = 0
    son_veri = data.iloc[-1]

    if son_veri['SMA_20'] > son_veri['SMA_50']:
        sinyal_kisa_vade = "Yükselen Ana Trend"
        analiz_puani += 2
    else:
        sinyal_kisa_vade = "Aşağı Yönlü Baskı"
        analiz_puani -= 2

    rsi_value = son_veri['RSI']
    if rsi_value > 70:
        sinyal_uzun_vade = "Aşırı Alım"
        analiz_puani -= 3
    elif rsi_value < 30:
        sinyal_uzun_vade = "Aşırı Satım"
        analiz_puani += 3
    else:
        sinyal_uzun_vade = "Normal Seyir"

    if fk < SEKTOR_FK_ORTALAMASI * 0.75:
        analiz_puani += 2
    elif fk > SEKTOR_FK_ORTALAMASI * 1.5:
        analiz_puani -= 2

    analiz_puani += makro_analiz['puan']

    if analiz_puani >= 4:
        nihai_karar = "GÜÇLÜ ALIM/TUT"
        renk_kodu = "YEŞİL"
    elif analiz_puani <= -3:
        nihai_karar = "SAT / POZİSYON KÜÇÜLT"
        renk_kodu = "KIRMIZI"
    else:
        nihai_karar = "İZLEME/TUT"
        renk_kodu = "SARI"

    grafik_data = data.tail(90)[[PRICE_COLUMN, 'SMA_20', 'SMA_50', 'RSI']].reset_index()
    grafik_data['Date'] = grafik_data['Date'].dt.strftime('%Y-%m-%d')
    grafik_data[[PRICE_COLUMN, 'SMA_20', 'SMA_50', 'RSI']] = np.nan_to_num(grafik_data[[PRICE_COLUMN, 'SMA_20', 'SMA_50', 'RSI']]).round(2)

    ihtimaller = monte_carlo_simulation(data)
    bot_skor = calculate_bot_score(analiz_puani, rsi_value, son_veri['Volatilite'], fk, SEKTOR_FK_ORTALAMASI)

    return AnalizSonucu(
        sembol=sembol,
        son_fiyat=round(son_veri[PRICE_COLUMN], 2),
        acilis=round(son_veri['Open'], 2) if 'Open' in data.columns else 0.0,
        fiyat_kazanc=round(fk, 2),
        sinyal_kisa_vade=sinyal_kisa_vade,
        sinyal_uzun_vade=nihai_karar,
        analiz_puani=analiz_puani,
        sinyal_renk_kodu=renk_kodu,
        piyasa_durumu=makro_analiz['durum'],
        son_90_gunluk_veri=grafik_data.to_dict('records'),
        ihtimaller=ihtimaller,
        bot_skor=bot_skor
    )

# --- API ENDPOINTS ---
@app.post("/api/token", response_model=Token)
async def login_for_access_token(form_data: UserCreate):
    CORRECT_USERNAME = "admin"
    CORRECT_PASSWORD = "tekparola"
    if form_data.username != CORRECT_USERNAME or form_data.password != CORRECT_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Hatalı kullanıcı adı veya şifre", headers={"WWW-Authenticate": "Bearer"})
    access_token = f"valid_token_for_{form_data.username}"
    return {"access_token": access_token, "token_type": "bearer"}


# WebSocket ve diğer endpointler aynen korunuyor
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except RuntimeError:
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.websocket("/ws/chat/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    await manager.broadcast(f"Sistem: Client #{client_id} sohbete katıldı.")
    try:
        while True:
            data = await websocket.receive_text()
            full_message = f"[{datetime.now().strftime('%H:%M')}] {client_id}: {data}"
            await manager.broadcast(full_message)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client #{client_id} ayrıldı.")

@app.get("/api/chat/history", response_model=List[MessageSchema])
def get_chat_history():
    return []

@app.get("/api/analiz/{sembol}", response_model=AnalizSonucu)
def hisse_analizi_endpoint(sembol: str):
    sembol = sembol.upper()
    bist_deneme_sembolu = sembol
    if not sembol.endswith(".IS"):
        bist_deneme_sembolu = sembol + ".IS"
    try:
        return analiz_et(bist_deneme_sembolu)
    except:
        abd_deneme_sembolu = sembol.replace(".IS", "")
        try:
            return analiz_et(abd_deneme_sembolu)
        except:
            raise HTTPException(status_code=500, detail="Sunucu Hatası: Veri çekilemedi. Sembolü kontrol edin.")

@app.get("/api/tara", response_model=list[AnalizSonucu])
def toplu_tarama():
    return []

# Haberler ve makro endpointleri aynen korunuyor (önceki main.py ile)



@app.get("/api/global-etki", response_model=list[Haber])
def kuresel_haberler():
    """Dünya piyasalarını etkileyen küresel ekonomi haberleri."""
    rss_kaynaklari = [
        "https://www.reuters.com/rssFeed/businessNews",
        "https://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.ft.com/?format=rss",
        "https://www.cnbc.com/id/10001147/device/rss/rss.html"
    ]
    
    anahtarlar_pozitif = ["growth", "gain", "rise", "record high", "expansion", "recovery", "profit"]
    anahtarlar_negatif = ["drop", "crash", "fall", "inflation", "tension", "loss", "decline", "war"]
    
    haber_listesi = []
    
    for rss_url in rss_kaynaklari:
        try:
            feed = feedparser.parse(rss_url)
            for entry in feed.entries[:5]:
                baslik = entry.title.lower()
                
                # Etki analizi (basit kelime bazlı)
                if any(kelime in baslik for kelime in anahtarlar_pozitif):
                    etki = "positive"
                elif any(kelime in baslik for kelime in anahtarlar_negatif):
                    etki = "negative"
                else:
                    etki = "neutral"
                
                tarih = getattr(entry, "published", datetime.now().strftime("%d/%m/%Y %H:%M"))

                haber_listesi.append(Haber(
                    baslik=entry.title,
                    link=entry.link,
                    kaynak=feed.feed.get("title", "Küresel Kaynak"),
                    tarih=tarih,
                    etki=etki
                ))
        except Exception as e:
            print(f"Küresel haber okunamadı: {rss_url} | Hata: {e}")
            continue

    return haber_listesi





@app.get("/api/haberler", response_model=list[Haber])
def haber_akisi():
    """Gerçek ekonomi haberleri (RSS kaynaklarından çekilir)."""
    rss_kaynaklari = [
        "https://www.bloomberght.com/rss",         # Bloomberg HT
        "https://www.dunya.com/rss/ekonomi",       # Dünya Gazetesi
        "https://www.aa.com.tr/tr/rss/ekonomi",    # Anadolu Ajansı
        "https://www.cnnturk.com/feed/rss/ekonomi/news",  # CNN Türk
        "https://www.haberturk.com/rss/ekonomi.xml"       # HaberTürk
    ]
    
    haber_listesi = []
    
    for rss_url in rss_kaynaklari:
        try:
            feed = feedparser.parse(rss_url)
            for entry in feed.entries[:5]:  # her kaynaktan ilk 5 haberi al
                tarih = None
                if hasattr(entry, 'published'):
                    tarih = entry.published
                elif hasattr(entry, 'updated'):
                    tarih = entry.updated
                else:
                    tarih = datetime.now().strftime('%d/%m/%Y %H:%M')

                haber_listesi.append(Haber(
                    baslik=entry.title,
                    link=entry.link,
                    kaynak=feed.feed.get("title", "Bilinmeyen Kaynak"),
                    tarih=tarih
                ))
        except Exception as e:
            print(f"Haber kaynağı okunamadı: {rss_url} | Hata: {e}")
            continue

    # Tarihe göre sırala (yeni → eski)
    haber_listesi.sort(key=lambda x: x.tarih, reverse=True)

    if not haber_listesi:
        raise HTTPException(status_code=503, detail="Haber kaynaklarına erişilemedi.")
        
    return haber_listesi



@app.get("/api/makro", response_model=list[MakroVarlik])
def makro_takip():
    """Makro Varlıkları (Gram/TL dahil) çekerken hata verenleri atlar."""
    
    makro_sembolleri = [
        {"sembol": "TRY=X", "ad": "USD/TRY Kuru", "birim": "Kur"},
        {"sembol": "EURTRY=X", "ad": "Euro Kuru (EUR/TRY)", "birim": "Kur"},
        {"sembol": "GC=F", "ad": "Ons Altın (USD)", "birim": "USD"},
        {"sembol": "SI=F", "ad": "Ons Gümüş (USD)", "birim": "USD"},
    ]
    
    makro_datas = {}
    
    # Verileri Çek
    for varlik in makro_sembolleri:
        sembol = varlik["sembol"]
        try:
            data = get_price_data(sembol, period="30d")
            data[PRICE_COLUMN] = data['Close']
            makro_datas[sembol] = data
        except Exception as e:
            print(f"Makro veri çekme hatası ({varlik['ad']}): {e}")
            continue

    sonuclar = []

    # 2. GRAM/TL HESAPLAMALARI
    
    usd_kuru_cekildi = "TRY=X" in makro_datas
    
    if usd_kuru_cekildi:
        usdtry_data = makro_datas["TRY=X"]
        
        # GRAM ALTIN HESAPLAMA
        if "GC=F" in makro_datas:
            try:
                ons_altin_data = makro_datas["GC=F"]

                combined_data = pd.DataFrame({ 'USD': usdtry_data[PRICE_COLUMN], 'ALTIN': ons_altin_data[PRICE_COLUMN]}).dropna() 

                if not combined_data.empty:
                    gram_altin_serisi = combined_data['ALTIN'].multiply(combined_data['USD']) / 31.1
                    grafik_altin = pd.DataFrame({'Date': gram_altin_serisi.index.strftime('%Y-%m-%d'), 'Close': np.nan_to_num(gram_altin_serisi).round(2)})
                    sonuclar.append(MakroVarlik(sembol="Gram Altın (TRY)", fiyat=round(gram_altin_serisi.iloc[-1], 2), grafik_data=grafik_altin.to_dict('records')))

            except Exception as e:
                print(f"KRİTİK HATA: Gram Altın Hesaplaması Başarısız. Detay: {e}")
                pass

        # GRAM GÜMÜŞ HESAPLAMA
        if "SI=F" in makro_datas:
            try:
                ons_gumus_data = makro_datas["SI=F"]
                combined_data_gumus = pd.DataFrame({ 'USD': usdtry_data[PRICE_COLUMN], 'GUMUS': ons_gumus_data[PRICE_COLUMN]}).dropna()
                
                if not combined_data_gumus.empty:
                    gram_gumus_serisi = combined_data_gumus['GUMUS'].multiply(combined_data_gumus['USD']) / 31.1
                    grafik_gumus = pd.DataFrame({'Date': gram_gumus_serisi.index.strftime('%Y-%m-%d'), 'Close': np.nan_to_num(gram_gumus_serisi).round(2)})
                    sonuclar.append(MakroVarlik(sembol="Gram Gümüş (TRY)", fiyat=round(gram_gumus_serisi.iloc[-1], 2), grafik_data=grafik_gumus.to_dict('records')))
            except Exception as e:
                print(f"KRİTİK HATA: Gram Gümüş Hesaplaması Başarısız. Detay: {e}")
                pass

    # 3. Direkt Çekilen Kur ve Ons Varlıkları Ekle
    for varlik in makro_sembolleri:
        sembol = varlik["sembol"]
        if sembol in makro_datas:
            if sembol in ["GC=F", "SI=F"] and any(s.sembol.startswith("Gram") for s in sonuclar):
                continue 

            data = makro_datas[sembol]
            yuvarlama = 4 if varlik["birim"] == 'Kur' else 2

            grafik_data = data[[PRICE_COLUMN]].reset_index()
            grafik_data['Date'] = grafik_data['Date'].dt.strftime('%Y-%m-%d')
            grafik_data.rename(columns={PRICE_COLUMN: 'Close'}, inplace=True)
            grafik_data['Close'] = np.nan_to_num(grafik_data['Close']).round(yuvarlama)
            
            sonuclar.append(MakroVarlik(
                sembol=varlik["ad"],
                fiyat=round(data[PRICE_COLUMN].iloc[-1], yuvarlama),
                grafik_data=grafik_data.to_dict('records')
            ))

    if not sonuclar:
        raise HTTPException(status_code=503, detail="Hiçbir makro varlık için veri çekilemedi. Veri kaynağı bağlantısını kontrol edin.")
        
    return sonuclar

@app.get("/api/analiz/{sembol}", response_model=AnalizSonucu)
def hisse_analizi_endpoint(sembol: str):
    sembol = sembol.upper()
    
    bist_deneme_sembolu = sembol
    if not sembol.endswith(".IS"):
        bist_deneme_sembolu = sembol + ".IS"
    
    try:
        return analiz_et(bist_deneme_sembolu)
    except Exception as e:
        abd_deneme_sembolu = sembol.replace(".IS", "")
        
        try:
            return analiz_et(abd_deneme_sembolu)
        except Exception as abd_e:
            raise HTTPException(status_code=500, detail="Sunucu Hatası: Veri çekilemedi. Sembolü kontrol edin.")

@app.get("/api/tara", response_model=list[AnalizSonucu])
def toplu_tarama():
    return []