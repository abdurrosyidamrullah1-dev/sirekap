import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ExternalLink } from 'lucide-react'

const AI_SERVICES = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    url: 'https://gemini.google.com',
    color: '#3b82f6',
    logo: '✨'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    color: '#10b981',
    logo: '🤖'
  },
  {
    id: 'claude',
    name: 'Claude AI',
    url: 'https://claude.ai',
    color: '#d97757',
    logo: '🧠'
  }
]

export default function AiAssistant() {
  const [activeTab, setActiveTab] = useState(AI_SERVICES[0].id)
  const activeService = AI_SERVICES.find(s => s.id === activeTab)

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 40px)' }}
    >
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} style={{ color: 'var(--accent)' }} /> 
            AI Assist
          </h1>
          <p>Akses langsung ke berbagai AI (Gemini, ChatGPT, Claude)</p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 6, borderRadius: 12, border: '1px solid var(--border)' }}>
          {AI_SERVICES.map(service => (
            <button
              key={service.id}
              onClick={() => setActiveTab(service.id)}
              className={`btn btn-sm ${activeTab === service.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ 
                borderRadius: 8, 
                padding: '8px 16px',
                background: activeTab === service.id ? service.color : 'transparent',
                color: activeTab === service.id ? 'white' : 'var(--text-muted)'
              }}
            >
              <span style={{ marginRight: 6 }}>{service.logo}</span>
              {service.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ 
          background: 'var(--bg-tertiary)', 
          padding: '8px 16px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Menampilkan <strong>{activeService.name}</strong>
          </span>
          <a 
            href={activeService.url} 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ color: activeService.color, padding: '4px 8px' }}
          >
            Buka di Tab Baru <ExternalLink size={14} style={{ marginLeft: 6 }}/>
          </a>
        </div>
        
        <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
          <iframe 
            src={activeService.url}
            title={activeService.name}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="clipboard-read; clipboard-write; microphone"
          />
          
          <div style={{ 
            position: 'absolute', 
            bottom: 16, 
            right: 16, 
            background: 'rgba(0,0,0,0.7)', 
            color: 'white', 
            padding: '8px 12px', 
            borderRadius: 8,
            fontSize: 11,
            pointerEvents: 'none',
            opacity: 0.6
          }}>
            Jika website menolak ditampilkan (blank), silakan klik "Buka di Tab Baru" di atas.
          </div>
        </div>
      </div>
    </motion.div>
  )
}
