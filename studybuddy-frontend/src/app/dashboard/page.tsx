'use client'

import React, { useState, useEffect, useCallback, FormEvent } from 'react'
import { FiInfo, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, parseISO, isPast } from 'date-fns'

type Project = {
  id: number
  title: string
  description: string
  deadline: string
}

function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  useEffect(() => {
    const stored = localStorage.getItem('projects')
    if (stored) setProjects(JSON.parse(stored))
  }, [])
  const save = useCallback((next: Project[]) => {
    localStorage.setItem('projects', JSON.stringify(next))
    setProjects(next)
  }, [])
  return { projects, save }
}

export default function DashboardPage() {
  const { projects, save } = useProjects()
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : 'auto'
  }, [modalOpen])

  const handleAdd = useCallback(
    (data: Omit<Project, 'id'>) => {
      save([{ id: Date.now(), ...data }, ...projects])
      setModalOpen(false)
      setToast('Project added!')
      setTimeout(() => setToast(null), 3000)
    },
    [projects, save]
  )

  const handleDelete = useCallback(
    (id: number) => {
      save(projects.filter(p => p.id !== id))
      setToast('Project deleted!')
      setTimeout(() => setToast(null), 3000)
    },
    [projects, save]
  )

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex">
      {/* ─── Main content */}
      <main
        className="
          relative min-h-screen bg-gray-900 text-white
          md:ml-60        /* offset for sidebar */
          pt-20           /* pad for mobile header */
          md:pt-8         /* less pad if you add a desktop header */
          flex-1
        "
      >
        {/* ─── Sticky Toolbar */}
        <header
          className="
            sticky top-0 z-30
            bg-gray-900/95 backdrop-blur-sm
            px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4
            border-b border-gray-700
          "
        >
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-2xl font-bold flex-shrink-0">My Projects</h1>

            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search projects…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-1
                  rounded-full bg-gray-800 placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  transition
                "
              />
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="
              flex items-center gap-2
              bg-blue-600 hover:bg-blue-700
              px-3 py-1.5 rounded-full
              self-start md:self-auto
              transition
            "
          >
            <FiPlus /> New
          </button>
        </header>

        {/* ─── Centered Toast Below Toolbar */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="
                mx-auto mt-4 max-w-md
                bg-green-600 text-white px-4 py-2 rounded-full
                flex items-center justify-center gap-2 shadow-lg
              "
            >
              <FiInfo /> {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Projects List */}
        <section className="p-4 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-20">
              No projects found. Create one to get started!
            </div>
          ) : (
            <>
              {/* Mobile carousel */}
              <div className="md:hidden overflow-x-auto snap-x snap-mandatory pb-4">
                <div className="flex gap-4">
                  {filtered.map(p => (
                    <div key={p.id} className="snap-center flex-shrink-0 w-80">
                      <ProjectCard project={p} onDelete={handleDelete} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid md:grid-cols-3 md:gap-4">
                {filtered.map(p => (
                  <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* ─── Mobile FAB */}
        <button
          onClick={() => setModalOpen(true)}
          className="
            md:hidden fixed bottom-6 right-6
            bg-blue-600 hover:bg-blue-700
            p-4 rounded-full shadow-lg
            transition
          "
          aria-label="Add project"
        >
          <FiPlus size={24} />
        </button>

        {/* ─── New Project Modal */}
        <NewProjectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleAdd}
        />
      </main>
    </div>
  )
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project
  onDelete: (id: number) => void
}) {
  const { id, title, description, deadline } = project
  const dueDate = parseISO(deadline)
  const late = isPast(dueDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 bg-gray-800 rounded-lg shadow border border-gray-700 relative"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm mt-1">{description}</p>
      <p className={`text-xs mt-2 ${late ? 'text-red-500' : 'text-gray-400'}`}>
        {late ? 'Past due ' : 'Due '}
        {formatDistanceToNow(dueDate, { addSuffix: true })}
      </p>
      <button
        onClick={() => onDelete(id)}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
        aria-label="Delete project"
      >
        <FiTrash2 />
      </button>
    </motion.div>
  )
}

function NewProjectModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Project, 'id'>) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')

  // clear fields when opened
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setDeadline('')
    }
  }, [isOpen])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (title && description && deadline) {
      onSave({ title, description, deadline })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900 text-white rounded-lg p-6 w-full max-w-md"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Project</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 rounded focus:outline-none"
                required
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 rounded focus:outline-none"
                required
              />
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 rounded focus:outline-none"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
