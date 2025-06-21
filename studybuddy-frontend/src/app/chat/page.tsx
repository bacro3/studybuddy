'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { FiSend, FiHome, FiPlus, FiTrash2, FiMenu } from 'react-icons/fi'
import { FaUserGraduate } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface Session {
  id: string
  messages: Message[]
  created_at: string
  user_id: string
}

export default function ChatPage() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const router = useRouter()

  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const messageEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [drawerOpen])

  useEffect(() => {
    if (user === null) router.replace('/auth/login')
  }, [user, router])

  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return
      const { data, error } = await supabase.from('chats').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (!error && data) {
        setSessions(data)
        if (data.length > 0) setActiveId(data[0].id)
      }
    }
    fetchChats()
  }, [supabase, user])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions, loading, activeId])

  if (user === undefined || user === null) {
    return null
  }

  // --- DARK THEME: Main logic unchanged, just UI classes below ---

  const handleSend = async () => {
    if (!input.trim() || !activeId) return
    const userMsg: Message = { role: 'user', text: input.trim() }
    setInput('')
    setLoading(true)
    setShowPrompt(false)

    const session = sessions.find(s => s.id === activeId)
    const history = session?.messages.map(m => m.text) || []

    try {
      const updatedSession = {
        ...session!,
        messages: [...session!.messages, userMsg]
      }
      await supabase.from('chats').update({ messages: updatedSession.messages }).eq('id', activeId)
      setSessions(sessions.map(s => s.id === activeId ? updatedSession : s))

      const res = await fetch('http://192.168.0.2:8000/api/qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.text, history })
      })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      const aiMsg: Message = { role: 'assistant', text: data.response }

      const updatedSession2 = {
        ...updatedSession,
        messages: [...updatedSession.messages, aiMsg]
      }
      await supabase.from('chats').update({ messages: updatedSession2.messages }).eq('id', activeId)
      setSessions(sessions.map(s => s.id === activeId ? updatedSession2 : s))
    } catch (err) {
      // Optionally show error toast
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = async () => {
    const newSession: Session = {
      id: uuidv4(),
      messages: [],
      created_at: new Date().toISOString(),
      user_id: user.id,
    }
    const { error } = await supabase.from('chats').insert(newSession)
    if (!error) {
      setSessions([newSession, ...sessions])
      setActiveId(newSession.id)
      setShowPrompt(true)
      setDrawerOpen(false)
    }
  }

  const handleDeleteChat = async (id: string) => {
    await supabase.from('chats').delete().eq('id', id)
    const filtered = sessions.filter(s => s.id !== id)
    setSessions(filtered)
    if (filtered.length > 0) setActiveId(filtered[0].id)
    else setActiveId('')
  }

  const current = sessions.find(s => s.id === activeId)

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#18181b] via-[#232336] to-[#11111a] text-gray-100">
      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-2 bg-[#18181b]/95 shadow sticky top-0 z-20">
        <button
          className="p-2 rounded-full bg-[#232336] hover:bg-[#232336]/80 text-emerald-400"
          onClick={() => router.push('/')}
          aria-label="Home"
        >
          <FiHome className="text-xl" />
        </button>
        <button
          className="p-2 rounded-full bg-[#232336] hover:bg-[#232336]/80 text-emerald-400 sm:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open chat list"
        >
          <FiMenu className="text-xl" />
        </button>
        <span className="bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-full p-2 shadow">
          <FaUserGraduate className="text-xl text-white" />
        </span>
        <span className="font-bold text-base text-gray-100">StudyBuddy</span>
      </header>

      {/* Chat List Drawer (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 flex sm:hidden">
          <div className="bg-[#18181b] w-11/12 max-w-xs h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#232336]">
              <span className="font-bold text-lg text-emerald-400">Chats</span>
              <button
                className="text-gray-400 hover:text-emerald-400"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
              >
                <FiTrash2 className="rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 && (
                <div className="text-center text-gray-500 py-8">No chats yet.</div>
              )}
              {sessions.map((s, idx) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className={`w-full flex items-center justify-between px-4 py-3 border-b border-[#232336] text-left cursor-pointer ${
                    s.id === activeId ? 'bg-[#232336]' : ''
                  }`}
                  onClick={() => {
                    setActiveId(s.id)
                    setDrawerOpen(false)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveId(s.id)
                      setDrawerOpen(false)
                    }
                  }}
                >
                  <div>
                    <div className="font-semibold text-emerald-400">
                      Chat {sessions.length - idx}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[120px]">
                      {s.messages.length > 0
                        ? s.messages[s.messages.length - 1].text.slice(0, 30)
                        : 'No messages yet'}
                    </div>
                  </div>
                  <button
                    className="ml-2 text-red-400 hover:text-red-600"
                    onClick={e => {
                      e.stopPropagation()
                      handleDeleteChat(s.id)
                    }}
                    aria-label="Delete chat"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="m-4 px-4 py-2 bg-emerald-500 text-gray-900 rounded-full font-semibold"
              onClick={handleNewChat}
            >
              <FiPlus className="inline mr-1" /> New Chat
            </button>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Chat List Sidebar (desktop) */}
      <aside className="hidden sm:flex flex-col w-64 bg-[#18181b] border-r border-[#232336] h-full fixed left-0 top-0 bottom-0 z-10 pt-16">
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <div className="text-center text-gray-500 py-8">No chats yet.</div>
          )}
          {sessions.map((s, idx) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              className={`w-full flex items-center justify-between px-4 py-3 border-b border-[#232336] text-left cursor-pointer ${
                s.id === activeId ? 'bg-[#232336]' : ''
              }`}
              onClick={() => setActiveId(s.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveId(s.id)
                }
              }}
            >
              <div>
                <div className="font-semibold text-emerald-400">
                  Chat {sessions.length - idx}
                </div>
                <div className="text-xs text-gray-400 truncate max-w-[120px]">
                  {s.messages.length > 0
                    ? s.messages[s.messages.length - 1].text.slice(0, 30)
                    : 'No messages yet'}
                </div>
              </div>
              <button
                className="ml-2 text-red-400 hover:text-red-600"
                onClick={e => {
                  e.stopPropagation()
                  handleDeleteChat(s.id)
                }}
                aria-label="Delete chat"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
        <div className="p-4">
          <button
            className="w-full px-4 py-2 bg-emerald-500 text-gray-900 rounded-full font-semibold hover:bg-emerald-400 flex items-center justify-center gap-2 shadow"
            onClick={handleNewChat}
            aria-label="New chat"
            type="button"
          >
            <FiPlus /> New Chat
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 min-h-0 flex flex-col sm:ml-64">
        <div
          className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4 scrollbar-hide transition-all duration-300"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {current?.messages.length ? (
            current.messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end gap-2">
                  {msg.role === 'assistant' && (
                    <span className="bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-full p-2 shadow">
                      <FaUserGraduate className="text-lg text-white" />
                    </span>
                  )}
                  <div
                    className={`
                      max-w-[80vw] md:max-w-[60%] px-4 py-3 rounded-3xl shadow-lg
                      ${msg.role === 'user'
                        ? 'bg-emerald-500 text-gray-900 rounded-br-xl'
                        : 'bg-[#232336] text-gray-100 rounded-bl-xl border border-[#232336]'}
                      text-base whitespace-pre-line
                    `}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-invert prose-slate prose-base max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <span className="bg-gradient-to-br from-emerald-500 to-indigo-500 rounded-full p-2 shadow">
                      <FaUserGraduate className="text-lg text-white" />
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            showPrompt && (
              <div className="text-center text-gray-500 mt-10 text-lg">
                👋 Hi! What are you studying today?
              </div>
            )
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Input bar */}
        <form
          className="flex items-center gap-2 px-3 py-2 bg-[#18181b]/95 shadow rounded-t-2xl sticky bottom-0 z-20"
          onSubmit={e => {
            e.preventDefault()
            handleSend()
          }}
          style={{ touchAction: 'none' }}
        >
          <input
            type="text"
            className="flex-1 bg-transparent text-gray-100 px-3 py-2 outline-none"
            placeholder="Type your question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 rounded-full p-2 transition"
            disabled={loading || !input.trim()}
          >
            <FiSend className="text-xl" />
          </button>
        </form>
      </main>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .prose-invert :where(code):not(:where([class~="not-prose"] *)) {
          background: #222 !important;
        }
      `}</style>
    </div>
  )
}