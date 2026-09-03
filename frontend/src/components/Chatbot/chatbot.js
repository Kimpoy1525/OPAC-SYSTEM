import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiMessageSquare, FiSend, FiX } from 'react-icons/fi';
import './chatbot.css';

const SUGGESTIONS = [
  'What research titles are available?',
  'Find research about AI',
  'What are the keywords of a thesis?',
  'Who wrote the oldest research?',
];

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        { role: 'assistant', content: 'Hello! I can help you explore the research repository. Ask me about any thesis title, author, abstract, keywords, or course.' },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;
    setInput('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setThinking(true);
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/home/chat/`,
        { messages: next },
        { withCredentials: true, timeout: 90000 }
      );
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      let msg = error.response?.data?.error;
      if (!msg) {
        if (error.code === 'ECONNABORTED') {
          msg = 'The request timed out - please try again.';
        } else if (!error.response) {
          msg = 'Cannot reach the server. Please check your connection.';
        } else {
          msg = `The server returned an error (${error.response.status}). Please try again.`;
        }
      }
      setMessages((current) => [...current, { role: 'assistant', content: msg }]);
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <>
      {!open && (
        <button type="button" className="chatbot-bubble" onClick={() => setOpen(true)} aria-label="Open AI assistant">
          <FiMessageSquare />
        </button>
      )}

      {open && (
        <section className="chatbot-panel" aria-label="AI assistant">
          <header className="chatbot-header">
            <div className="chatbot-header-text">
              <strong>CCSTECHVAULT Assistant</strong>
              <span>Ask about repository titles</span>
            </div>
            <button type="button" className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close AI assistant">
              <FiX />
            </button>
          </header>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chatbot-msg ${msg.role}`}>
                <span>{msg.content}</span>
              </div>
            ))}
            {thinking && (
              <div className="chatbot-msg assistant">
                <span className="chatbot-thinking">Thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div className="chatbot-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the repository..."
              disabled={thinking}
              aria-label="Chat message"
            />
            <button type="button" onClick={() => send()} disabled={thinking || !input.trim()} aria-label="Send message">
              <FiSend />
            </button>
          </div>
        </section>
      )}
    </>
  );
};

export default Chatbot;
