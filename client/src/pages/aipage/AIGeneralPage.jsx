import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { Bot, Send } from "lucide-react";
import "./AIPage.css";

const AIGeneralPage = ({ collapsed }) => {
    const [messages, setMessages] = useState([
        { role: "ai", text: "Hello! I am your StoryWeave AI assistant. How can I help you with your writing today?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { role: "user", text: userText }]);
        setInput("");
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE_URL}/ai/chat`, { prompt: userText });
            if (res.data.success) {
                setMessages(prev => [...prev, { role: "ai", text: res.data.result }]);
            } else {
                setMessages(prev => [...prev, { role: "error", text: "Failed to get response." }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: "error", 
                text: error.response?.data?.message || "An error occurred. Please try again later."
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`ai-page ${collapsed ? "collapsed" : ""}`}>
            <div className="ai-page-header">
                <h1 className="ai-page-title">
                    <Bot size={32} />
                    General AI Assistant
                </h1>
                <p className="ai-page-subtitle">Ask for writing advice, story ideas, worldbuilding, and character concepts</p>
            </div>
            
            <div className="ai-column-right" style={{ flex: 1, maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
                <div className="ai-chat-area">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`ai-message ${msg.role}`}>
                            {msg.text}
                        </div>
                    ))}
                    {loading && (
                        <div className="ai-typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    )}
                </div>

                <div className="ai-input-area">
                    <div className="ai-input-wrapper">
                        <input
                            type="text"
                            placeholder="Ask for writing advice, story ideas, etc..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            disabled={loading}
                        />
                        <button className="ai-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIGeneralPage;
