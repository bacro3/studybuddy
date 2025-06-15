'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import { FiTrash2, FiLoader, FiCornerDownLeft } from 'react-icons/fi'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { v4 as uuidv4 } from 'uuid'

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

  // while we don't yet know auth state, render nothing
  if (user === undefined) {
    return null
  }

  // redirect unauthenticated users
  useEffect(() => {
    if (user === null) {
      router.replace('/auth/register')
    }
  }, [user, router])

  // after redirect is triggered, don't render chat UI
  if (user === null) {
    return null
  }

  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const messageEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        setSessions(data)
        if (data.length > 0) {
          setActiveId(data[0].id)
        }
      }
      if (error) {
        console.error('Error loading chats:', error.message || error)
      }
    }
    fetchChats()
  }, [supabase, user.id])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions, loading])

  const handleSend = async () => {
    if (!input.trim() || !activeId) return
    const userMsg: Message = { role: 'user', text: input.trim() }
    setInput('')
    setLoading(true)

    const session = sessions.find(s => s.id === activeId)
    const history = session?.messages.map(m => m.text) || []

    try {
      const res = await fetch('http://localhost:8000/api/qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.text, history }),
      })
      const { response } = await res.json()
      const assistantMsg: Message = { role: 'assistant', text: response }

      const updatedMessages = [...(session?.messages || []), userMsg, assistantMsg]
      const updatedSession = { ...session!, messages: updatedMessages }

      const { error } = await supabase
        .from('chats')
        .update({ messages: updatedMessages })
        .eq('id', activeId)
      if (error) console.error('Error saving message:', error)

      setSessions(prev =>
        prev.map(s => (s.id === activeId ? updatedSession : s))
      )
    } catch (err) {
      console.error('AI error:', err)
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
    if (error) {
      console.error('Failed to create session:', error)
      return
    }
    setSessions([newSession, ...sessions])
    setActiveId(newSession.id)
  }

  const handleDeleteChat = async (id: string) => {
    const { error } = await supabase.from('chats').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete:', error)
      return
    }
    const filtered = sessions.filter(s => s.id !== id)
    setSessions(filtered)
    if (id === activeId && filtered.length > 0) {
      setActiveId(filtered[0].id)
    }
  }

  const current = sessions.find(s => s.id === activeId)

  return (
    <div className="flex flex-grow min-h-0 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Chats</h2>
          <button
            onClick={handleNewChat}
            className="bg-blue-600 text-white text-sm px-2 py-1 rounded"
          >
            + New
          </button>
        </div>
        <ul className="space-y-2">
          {sessions.map(s => (
            <li key={s.id} className="flex justify-between items-center text-sm">
              <button
                onClick={() => setActiveId(s.id)}
                className={`truncate flex-1 text-left ${
                  s.id === activeId ? 'font-bold text-blue-600' : ''
                }`}
              >
                {new Date(s.created_at).toLocaleString()}
              </button>
              <button
                onClick={() => handleDeleteChat(s.id)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                <FiTrash2 />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {current?.messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 self-end'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 self-start'
              }`}
            >
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && <FiLoader className="animate-spin text-blue-500" />}
          <div ref={messageEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={e => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2 p-4 border-t bg-white dark:bg-gray-900"
        >
          <textarea
            rows={1}
            className="flex-1 p-2 rounded border dark:bg-gray-900 dark:text-white"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask something..."
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 text-white rounded"
            title="Send"
          >
            <FiCornerDownLeft />
          </button>
        </form>
      </main>
    </div>
  )
}
