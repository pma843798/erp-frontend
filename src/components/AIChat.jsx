import React, { useState, useRef, useEffect } from 'react';
import { askAiAssistant } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Rnd } from 'react-rnd';
import {
    MessageSquare,
    Minus,
    Trash2,
    Send,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const [messages, setMessages] = useState(() => {
        const savedChat = localStorage.getItem('erp_ai_chat');

        return savedChat
            ? JSON.parse(savedChat)
            : [
                  {
                      role: 'ai',
                      text: '✨ Welcome to PMA Smart System. How can I help you today?'
                  }
              ];
    });

    useEffect(() => {
        localStorage.setItem('erp_ai_chat', JSON.stringify(messages));

        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        });
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();

        if (!input.trim()) return;

        const userMsg = input;
        
        // ✅ API bhejne ke liye current messages store kiye
        const currentHistory = [...messages];

        setMessages((prev) => [
            ...prev,
            {
                role: 'user',
                text: userMsg
            }
        ]);

        setInput('');
        setLoading(true);

        try {
            // ✅ userMsg ke sath currentHistory bhi bhej di
            const aiResponse = await askAiAssistant(userMsg, currentHistory);

            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    text: aiResponse
                }
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    text: '⚠️ Something went wrong.'
                }
            ]);
        }

        setLoading(false);
    };

    // ======================================================
    // 🚀 FLOATING BUTTON
    // ======================================================

    if (!isOpen) {
        return (
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{
                    scale: 1.1,
                    rotate: 5
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[9999] group"
            >
                <div className="absolute inset-0 rounded-full bg-cyan-400 blur-xl opacity-60 animate-pulse"></div>

                <div className="relative bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 p-5 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.4)] border border-white/40 backdrop-blur-xl">
                    <MessageSquare
                        size={28}
                        className="text-white group-hover:scale-110 transition-all"
                    />
                </div>
            </motion.button>
        );
    }

    return (
        <Rnd
            default={{
                x: window.innerWidth - 470,
                y: window.innerHeight - 650,
                width: 420,
                height: 600
            }}
            minWidth={320}
            minHeight={450}
            bounds="window"
            dragHandleClassName="chat-header"
            className="z-[9999]"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full w-full overflow-hidden rounded-3xl border border-gray-200 bg-white/95 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
            >
                {/* ======================================================
                    HEADER
                ====================================================== */}

                <div className="chat-header cursor-move px-5 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                            <Sparkles className="text-white" size={20} />
                        </div>

                        <div>
                            <h2 className="text-white font-bold text-[15px]">
                                PMA Smart System
                            </h2>

                            <p className="text-blue-100 text-[11px]">
                                AI Production Assistant
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                setMessages([
                                    {
                                        role: 'ai',
                                        text: '🧹 Chat history cleared.'
                                    }
                                ])
                            }
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                        >
                            <Trash2 size={16} className="text-white" />
                        </button>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                        >
                            <Minus size={16} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* ======================================================
                    CHAT AREA
                ====================================================== */}

                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gradient-to-b from-blue-50 to-white">
                    <AnimatePresence>
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{
                                    opacity: 0,
                                    y: 15,
                                    scale: 0.95
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1
                                }}
                                transition={{ duration: 0.25 }}
                                className={`flex ${
                                    msg.role === 'user'
                                        ? 'justify-end'
                                        : 'justify-start'
                                }`}
                            >
                                <div
                                    className={`max-w-[88%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-md border ${
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300/20 rounded-br-md'
                                            : 'bg-white text-gray-800 border-gray-200 rounded-bl-md'
                                    }`}
                                >
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl flex items-center gap-2 shadow-sm">
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ======================================================
                    INPUT AREA
                ====================================================== */}

                <form
                    onSubmit={handleSend}
                    className="p-4 border-t border-gray-200 bg-gray-50 backdrop-blur-xl"
                >
                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask PMA Smart System..."
                            className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-500 text-sm"
                        />

                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.9 }}
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg hover:shadow-cyan-500/30 transition-all"
                        >
                            <Send size={16} className="text-white" />
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </Rnd>
    );
};

export default AIChat;