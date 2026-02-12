from sqlalchemy import create_engine, Column, Integer, String, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from datetime import datetime

# MySQL Bağlantı Ayarları (XAMPP'nin varsayılan ayarları)
# Eğer bu kod çalışmazsa, kullanıcı adınızın ve şifrenizin doğru olduğundan emin olun.
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost/finbot_db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_recycle=3600 # MySQL'de bağlantı kopmalarını önler
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- Güvenlik ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# --- Veritabanı Modelleri ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String(50), nullable=False)
    content = Column(String(500), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

# --- Database Oluşturma Fonksiyonu ---

def create_database():
    try:
        # Sadece veritabanının varlığını kontrol edip yaratmak için, URL'deki finbot_db kısmını silmeliyiz.
        temp_engine = create_engine("mysql+pymysql://root:@localhost/")
        with temp_engine.connect() as connection:
            connection.execute(text("CREATE DATABASE IF NOT EXISTS finbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
            connection.commit()
            print("Veritabanı (finbot_db) kontrol edildi/oluşturuldu.")
        
        # Tabloları oluştur
        Base.metadata.create_all(bind=engine)
        print("Veritabanı tabloları oluşturuldu.")

        # İlk kullanıcıyı ekle (Eğer yoksa)
        db = SessionLocal()
        if db.query(User).filter(User.username == "admin").first() is None:
            hashed_password = get_password_hash("123456")
            admin_user = User(username="admin", hashed_password=hashed_password)
            db.add(admin_user)
            db.commit()
            print("Varsayılan kullanıcı (admin:123456) eklendi.")
        db.close()
            
    except Exception as e:
        print(f"\n[KRİTİK HATA] MySQL Bağlantısı Başarısız. XAMPP/MySQL'i kontrol edin. Detay: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#create_database() # Bu fonksiyonu manuel olarak bir kez çalıştırmamız gerekiyor