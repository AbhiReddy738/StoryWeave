import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { Bot, Send, ArrowLeft, Heart, Eye, MessageSquare, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import LazyImage from "../../components/LazyImage";
import { optimizeCloudinaryUrl } from "../../utils/imageOptimizer";
import "./AIPage.css";

const AIContentPage = ({ collapsed }) => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const isSong = location.pathname.includes("/song/");
    const type = isSong ? "Song" : "Story";

    const [contentData, setContentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showFullContent, setShowFullContent] = useState(false);
    
    const [messages, setMessages] = useState([
        { role: "ai", text: `Hello! I am your StoryWeave AI assistant. I've successfully loaded "${type === "Song" ? "Song" : "Story"} Context". How can I help you analyze, improve, or understand this work?` }
    ]);
    const [input, setInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    
    const chatEndRef = useRef(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const endpoint = isSong ? `/song/${id}` : `/story/${id}`;
                const res = await axios.get(`${API_BASE_URL}${endpoint}`);
                setContentData(res.data);
            } catch (err) {
                console.error("Failed to fetch content", err);
                setError(`${type} not found.`);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [id, isSong, type]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, chatLoading]);

    const getTextContent = () => {
        if (!contentData) return "";
        if (isSong) return contentData.lyrics || "";
        if (typeof contentData.content === "string") return contentData.content;
        if (Array.isArray(contentData.content)) {
            return contentData.content
                .filter(b => b.type === "text")
                .map(b => b.value || "")
                .join("\n")
                .replace(/<[^>]*>/g, ""); 
        }
        return "";
    };

    const getWordCount = () => {
        const text = getTextContent();
        return text ? text.split(/\s+/).length : 0;
    };

    const handleAction = async (actionPath, payload, displayActionText) => {
        setChatLoading(true);
        setMessages(prev => [...prev, { role: "user", text: displayActionText || payload.action || actionPath.split("/").pop() }]);
        try {
            const res = await axios.post(`${API_BASE_URL}/ai${actionPath}`, payload);
            if (res.data.success) {
                setMessages(prev => [...prev, { role: "ai", text: res.data.result }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: "error", 
                text: error.response?.data?.message || error.response?.data?.error || "Action failed." 
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleSend = async (userText = input) => {
        if (!userText.trim()) return;

        setMessages(prev => [...prev, { role: "user", text: userText }]);
        setInput("");
        setChatLoading(true);

        const context = `Title: ${contentData.title}
Genre: ${contentData.genre}
Author: ${contentData.author || contentData.artistName}
Summary: ${contentData.summary}
Tags: ${(contentData.tags || []).join(", ")}
Content:
${getTextContent().substring(0, 3000)}`;

        try {
            const res = await axios.post(`${API_BASE_URL}/ai/chat`, { prompt: userText, context });
            if (res.data.success) {
                setMessages(prev => [...prev, { role: "ai", text: res.data.result }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: "error", 
                text: error.response?.data?.message || error.response?.data?.error || "Failed to get response." 
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) {
        return <div className="ai-page">Loading context...</div>;
    }

    if (error || !contentData) {
        return (
            <div className="ai-page">
                <h2>{error}</h2>
                <button onClick={() => navigate(-1)} className="ai-quick-btn">
                    <ArrowLeft size={16} /> Back
                </button>
            </div>
        );
    }

    const coverUrl = contentData.coverImage || contentData.coverImageUrl || '/default-cover.jpg';
    const authorName = contentData.author || contentData.artistName || 'Unknown Author';

    return (
        <div className={`ai-page ${collapsed ? "collapsed" : ""}`}>
            <div className="ai-page-header">
                <h1 className="ai-page-title">
                    <Bot size={36} />
                    StoryWeave AI
                </h1>
                <p className="ai-page-subtitle">Discuss, analyze and improve {type.toLowerCase()}s with AI</p>
            </div>
            
            <div className="ai-two-column">
                {/* Left Pane: Story Context */}
                <div className="ai-column-left">
                    <div className="ai-story-hero">
                        <div className="ai-story-cover">
                            <LazyImage 
                                src={optimizeCloudinaryUrl(coverUrl, 320, 480)} 
                                alt={contentData.title}
                            />
                        </div>
                        <div className="ai-story-details">
                            <h2>{contentData.title}</h2>
                            <p>By {authorName}</p>
                            <div className="ai-story-tags">
                                <span className="ai-tag">{contentData.genre}</span>
                                {(contentData.tags || []).slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="ai-tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="ai-story-stats">
                        <div className="ai-stat-item" title="Likes">
                            <Heart size={16} /> {contentData.likes?.length || 0}
                        </div>
                        <div className="ai-stat-item" title="Views">
                            <Eye size={16} /> {contentData.views || 0}
                        </div>
                        <div className="ai-stat-item" title="Comments">
                            <MessageSquare size={16} /> {contentData.comments?.length || 0}
                        </div>
                        {contentData.contributors?.length > 0 && (
                            <div className="ai-stat-item" title="Contributors">
                                <Sparkles size={16} /> {contentData.contributors.length}
                            </div>
                        )}
                    </div>

                    <div className="ai-story-summary">
                        <h3>Summary</h3>
                        <p>{contentData.summary || "No summary provided."}</p>
                    </div>

                    <button 
                        className="ai-expand-btn"
                        onClick={() => setShowFullContent(!showFullContent)}
                    >
                        {showFullContent ? "Hide Full Content" : "View Full Content"}
                        {showFullContent ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showFullContent && (
                        <div className="ai-full-content">
                            {getTextContent().split("\n").map((para, i) => (
                                <p key={i} style={{ marginBottom: '12px' }}>{para}</p>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Pane: AI Assistant */}
                <div className="ai-column-right">
                    <div className="ai-context-loaded">
                        <div className="ai-context-loaded-left">
                            <Sparkles size={16} /> Context Loaded Successfully
                        </div>
                        <div>
                            {contentData.title} • {getWordCount()} words • {contentData.genre}
                        </div>
                    </div>

                    <div className="ai-quick-actions">
                        {!isSong ? (
                            <>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/story-summary", { storyText: getTextContent() }, "Generate Summary")}>📝 Summary</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/story-rating", { storyText: getTextContent() }, "Rate this story")}>⭐ Rate Story</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/story-analysis", { storyText: getTextContent(), type: "Hero" }, "Analyze Hero")}>🦸 Hero Analysis</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/story-analysis", { storyText: getTextContent(), type: "Character" }, "Analyze Characters")}>🎭 Characters</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/plot-holes", { storyText: getTextContent() }, "Find Plot Holes")}>🔍 Plot Holes</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/improve", { storyText: getTextContent() }, "Improve Story")}>💡 Improve</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/next-chapter", { storyText: getTextContent() }, "Next Chapter Ideas")}>📖 Next Chapter</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => {
                                    const lang = prompt("Enter target language (e.g. Hindi, Spanish):", "Hindi");
                                    if(lang) handleAction("/translate", { storyText: getTextContent(), language: lang }, `Translate to ${lang}`);
                                }}>🌍 Translate</button>
                            </>
                        ) : (
                            <>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/song-analysis", { lyrics: getTextContent(), action: "Summary" }, "Summarize Lyrics")}>📝 Summary</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/song-analysis", { lyrics: getTextContent(), action: "Meaning Analysis" }, "Analyze Meaning")}>🧠 Meaning</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/song-analysis", { lyrics: getTextContent(), action: "Emotion Analysis" }, "Analyze Emotion")}>😢 Emotion</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/song-analysis", { lyrics: getTextContent(), action: "Rate Lyrics" }, "Rate Lyrics")}>⭐ Rate</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => handleAction("/song-analysis", { lyrics: getTextContent(), action: "Improve Lyrics" }, "Improve Lyrics")}>💡 Improve</button>
                                <button className="ai-action-btn" disabled={chatLoading} onClick={() => {
                                    const lang = prompt("Enter target language (e.g. Hindi, Spanish):", "Hindi");
                                    if(lang) handleAction("/translate", { storyText: getTextContent(), language: lang }, `Translate to ${lang}`);
                                }}>🌍 Translate</button>
                            </>
                        )}
                    </div>

                    <div className="ai-quick-prompts">
                        <button className="ai-quick-prompt-pill" onClick={() => handleSend("What is the central theme of this work?")} disabled={chatLoading}>"What is the theme?"</button>
                        <button className="ai-quick-prompt-pill" onClick={() => handleSend("Can you explain the ending?")} disabled={chatLoading}>"Explain the ending"</button>
                        <button className="ai-quick-prompt-pill" onClick={() => handleSend("What are the best parts of this?")} disabled={chatLoading}>"Highlight best parts"</button>
                        {!isSong && <button className="ai-quick-prompt-pill" onClick={() => handleSend("Who is the most compelling character and why?")} disabled={chatLoading}>"Most compelling character?"</button>}
                    </div>

                    <div className="ai-chat-area">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`ai-message ${msg.role}`}>
                                {msg.text}
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="ai-typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="ai-input-area">
                        <div className="ai-input-wrapper">
                            <input
                                type="text"
                                placeholder="Ask AI anything about this..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                disabled={chatLoading}
                            />
                            <button className="ai-send-btn" onClick={() => handleSend()} disabled={chatLoading || !input.trim()}>
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIContentPage;
