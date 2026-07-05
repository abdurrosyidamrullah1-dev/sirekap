import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, KeyRound, Save, Trash2, Loader2, Sparkles } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import toast from 'react-hot-toast'

export default function AiAssistant() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory')
    return saved ? JSON.parse(saved) : [{ role: 'model', content: 'Halo! Saya asisten AI Si Rekap. Ada yang bisa saya bantu terkait pengelolaan orderan atau lainnya?' }]
  })
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '')
  const [showSettings, setShowSettings] = useState(!apiKey)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
    localStorage.setItem('chatHistory', JSON.stringify(messages))
  }, [messages])

  const saveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem('geminiApiKey', key)
    setShowSettings(false)
    toast.success('API Key berhasil disimpan!')
  }

  const clearChat = () => {
    if (window.confirm('Yakin ingin menghapus semua riwayat percakapan?')) {
      const initial = [{ role: 'model', content: 'Halo! Saya asisten AI Si Rekap. Ada yang bisa saya bantu?' }]
      setMessages(initial)
      localStorage.setItem('chatHistory', JSON.stringify(initial))
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    if (!apiKey) {
      toast.error('Silakan masukkan Gemini API Key terlebih dahulu')
      setShowSettings(true)
      return
    }

    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const history = messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
      
      const chat = model.startChat({ history })
      const result = await chat.sendMessage(userMsg.content)
      const response = await result.response
      const text = response.text()

      setMessages(prev => [...prev, { role: 'model', content: text }])
    } catch (error) {
      console.error(error)
      toast.error('Gagal mengirim pesan: ' + error.message)
      if (error.message.includes('API key')) {
        setShowSettings(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 40px)' }}
    >
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} style={{ color: 'var(--accent)' }} /> 
            AI Assistant
          </h1>
          <p>Asisten pintar ditenagai Google Gemini</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={clearChat} title="Hapus Riwayat">
            <Trash2 size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowSettings(!showSettings)}>
            <KeyRound size={16} /> API Key
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 20 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="card" style={{ padding: 20, background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <KeyRound size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--accent)' }}>Konfigurasi Gemini API</h3>
              </div>
              <p style={{ fontSize: 13, marginBottom: 15, color: 'var(--text-secondary)' }}>
                Dapatkan API Key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>Google AI Studio</a>. Key ini hanya disimpan di browser Anda (Local Storage).
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Paste Gemini API Key Anda (AIzaSy...)"
                  defaultValue={apiKey}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveApiKey(e.target.value)
                  }}
                  id="apiKeyInput"
                  style={{ flex: 1, background: 'white' }}
                />
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    const val = document.getElementById('apiKeyInput').value
                    saveApiKey(val)
                  }}
                >
                  <Save size={16} /> Simpan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user'
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 12
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: isUser ? 'white' : 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {isUser ? <User size={18} /> : <Bot size={20} />}
                </div>
                <div style={{
                  background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: isUser ? 'white' : 'var(--text-primary)',
                  padding: '12px 16px',
                  borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  maxWidth: '75%',
                  fontSize: 14,
                  lineHeight: 1.6,
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </motion.div>
            )
          })}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 12, alignItems: 'center' }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--bg-secondary)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={20} />
              </div>
              <div style={{
                background: 'var(--bg-secondary)', padding: '12px 16px',
                borderRadius: '4px 16px 16px 16px', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Loader2 size={16} className="spinner" /> Sedang mengetik...
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
            <textarea
              className="form-input"
              placeholder={apiKey ? "Ketik pesan Anda di sini... (Shift + Enter untuk baris baru)" : "Masukkan API Key terlebih dahulu..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading || (!apiKey && !showSettings)}
              style={{ 
                flex: 1, 
                minHeight: 50, 
                maxHeight: 150, 
                resize: 'none', 
                padding: '12px 48px 12px 16px',
                borderRadius: 24,
                lineHeight: 1.5
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                position: 'absolute',
                right: 8,
                top: 8,
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: input.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                color: input.trim() ? 'white' : 'var(--text-muted)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              <Send size={16} style={{ marginLeft: 2 }} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
