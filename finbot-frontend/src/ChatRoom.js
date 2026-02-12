// finbot-frontend/src/ChatRoom.js

import React, { useState, useEffect, useRef } from 'react';
import './ChatRoom.css'; // Yeni CSS dosyasına ihtiyacınız olacak (Adım 3'e bakın)

const ChatRoom = ({ username }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const messagesEndRef = useRef(null);

    // Mesaj Geçmişini Çekme
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/chat/history');
                const history = await response.json();
                
                // Sunucudan gelen formatı (timestamp) uygun hale getirme
                const formattedHistory = history.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                }));
                setMessages(formattedHistory);
            } catch (error) {
                console.error("Chat geçmişi çekilemedi:", error);
                setMessages([{ content: "Mesaj geçmişi yüklenemedi. Sunucu bağlantısını kontrol edin.", sender: "Sistem", timestamp: "Hata" }]);
            }
        };

        fetchHistory();
    }, []);

    // WebSocket Bağlantısı Kurma
    useEffect(() => {
        // WebSocket URL'si: ws://localhost:8000/ws/chat/KULLANICI_ADI
        const ws = new WebSocket(`ws://localhost:8000/ws/chat/${username}`);
        
        ws.onopen = () => {
            console.log('WebSocket bağlantısı kuruldu.');
            setMessages(prev => [...prev, { content: "Chat odasına katıldınız.", sender: "Sistem", timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }]);
        };

        ws.onmessage = (event) => {
            const fullMessage = event.data;
            
            // Backend'den gelen format: "[12:04] user: message"
            const match = fullMessage.match(/\[(.*?)\] (.*?): (.*)/);

            if (match) {
                const [_, time, sender, content] = match;
                setMessages(prev => [...prev, { sender, content, timestamp: time }]);
            } else {
                // Sistem mesajları veya ayrılma bildirimleri
                 setMessages(prev => [...prev, { content: fullMessage, sender: "Sistem", timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }]);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket bağlantısı kapandı.');
        };

        ws.onerror = (error) => {
            console.error('WebSocket hatası:', error);
             setMessages(prev => [...prev, { content: "Bağlantı kesildi, sayfayı yenileyin.", sender: "Sistem", timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }]);
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [username]);

    // Mesaj geldiğinde en alta kaydırma
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    const sendMessage = (e) => {
        e.preventDefault();
        if (inputMessage.trim() && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(inputMessage);
            setInputMessage('');
        }
    };

    return (
        <div className="chat-container">
            <h2 className="chat-header">Finans Sohbet Odası ({username})</h2>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender === username ? 'my-message' : 'other-message'}`}>
                        <span className="message-sender">{msg.sender === username ? 'Ben' : msg.sender}</span>
                        <span className="message-time">({msg.timestamp})</span>
                        <div className="message-content">{msg.content}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="chat-input-form">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Mesajınızı buraya yazın..."
                    className="chat-input"
                    disabled={!socket || socket.readyState !== WebSocket.OPEN}
                />
                <button type="submit" className="send-button" disabled={!socket || socket.readyState !== WebSocket.OPEN}>Gönder</button>
            </form>
        </div>
    );
};

export default ChatRoom;