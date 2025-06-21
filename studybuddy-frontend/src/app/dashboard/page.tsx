'use client'

import { useEffect, useState } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { FiPlus, FiTrash2, FiLogOut, FiFileText, FiFile, FiX } from 'react-icons/fi'
import { AiOutlineFileImage } from 'react-icons/ai'
import { formatDistanceToNow, parseISO, isPast } from 'date-fns'
import { useRouter } from 'next/navigation'

type Project = {
  id: string
  user_id: string
  title: string
  description: string
  deadline: string
  files: ProjectFile[]
}

type ProjectFile = {
  name: string
  url: string // This is the file path in storage, not a signed URL!
  type: string
}

function StudyEnvironmentModal({
  project,
  onClose,
}: {
  project: Project
  onClose: () => void
}) {
  const [selectedOption, setSelectedOption] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const router = useRouter()

  const options = [
    { value: 'flashcards', label: 'Make flashcards' },
    { value: 'summarize', label: 'Summarize' },
    { value: 'quiz', label: 'Quiz me' },
    { value: 'other', label: 'Other (custom prompt)' }
  ]

  const handleSendToAI = async () => {
    setLoading(true)
    setAiResult(null)
    const res = await fetch('http://localhost:8000/api/ai-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        files: project.files.map(f => f.url),
        option: selectedOption,
        customPrompt,
      }),
    })
    const data = await res.json()
    setLoading(false)
    // Expect your backend to return { sessionId: '...' }
    if (data.sessionId) {
      router.push(`/study/${selectedOption}/${data.sessionId}`)
    } else {
      setAiResult(data.result || 'Something went wrong.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#232336] text-gray-100 rounded-xl p-6 w-full max-w-lg border border-[#2d2d44] shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FiX size={22} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-emerald-400">{project.title}</h2>
        <h3 className="font-semibold mb-2">What do you want to use these documents for?</h3>
        <ul className="mb-4">
          {options.map(opt => (
            <li key={opt.value}>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="option"
                  value={opt.value}
                  checked={selectedOption === opt.value}
                  onChange={() => setSelectedOption(opt.value)}
                />
                {opt.label}
              </label>
            </li>
          ))}
        </ul>
        {selectedOption === 'other' && (
          <input
            type="text"
            placeholder="Describe what you want the AI to help with"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            className="w-full px-3 py-2 mb-4 bg-[#18181b] text-gray-100 rounded border border-[#232336] placeholder-gray-400"
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition"
          >
            Close
          </button>
          <button
            onClick={handleSendToAI}
            disabled={!selectedOption || loading}
            className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-400 transition"
          >
            {loading ? 'Working...' : 'Send to AI'}
          </button>
        </div>
        {aiResult && (
          <div className="mt-6 bg-[#18181b] rounded p-4 border border-[#2d2d44]">
            <h4 className="font-bold mb-2 text-emerald-400">AI Result:</h4>
            <pre className="whitespace-pre-wrap text-gray-100">{aiResult}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileLinks, setFileLinks] = useState<Record<string, string>>({})
  const [showStudyEnv, setShowStudyEnv] = useState(false)

  // Require login
  useEffect(() => {
    if (user === null) {
      window.location.href = '/auth/login'
    }
  }, [user])

  // Fetch projects for this user
  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('projects')
      .select('id, user_id, title, description, deadline, files')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setProjects(data as Project[])
        setLoading(false)
      })
  }, [user, modalOpen])

  // Generate signed URLs when a project is selected
  useEffect(() => {
    async function generateLinks() {
      if (!selectedProject) return
      const links: Record<string, string> = {}
      await Promise.all(
        selectedProject.files.map(async (file: ProjectFile) => {
          const { data: urlData } = await supabase
            .storage
            .from('project-files')
            .createSignedUrl(file.url, 60 * 60)
          if (urlData?.signedUrl) {
            links[file.url] = urlData.signedUrl
          }
        })
      )
      setFileLinks(links)
    }
    generateLinks()
  }, [selectedProject, supabase])

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  // Delete project
  const handleDelete = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(projects.filter(p => p.id !== id))
  }

  // --- IMPORTANT: Store file path, not signed URL ---
  const handleSaveProject = async (data: {
    title: string
    description: string
    deadline: string
    files: File[]
  }) => {
    if (!user) return
    setError(null)
    // 1. Upload files to Supabase Storage
    const uploadedFiles: ProjectFile[] = []
    for (const file of data.files) {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const filePath = `${user.id}/${Date.now()}_${safeFileName}`
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)
      if (!uploadError) {
        uploadedFiles.push({
          name: file.name,
          url: filePath, // Store this exact path!
          type: file.type,
        })
      } else {
        setError('File upload failed: ' + uploadError.message)
        return
      }
    }
    // 2. Insert project row
    const { error: insertError } = await supabase.from('projects').insert({
      user_id: user.id,
      title: data.title,
      description: data.description,
      deadline: data.deadline,
      files: uploadedFiles,
    })
    if (insertError) {
      setError('Could not save project: ' + insertError.message)
      return
    }
    setModalOpen(false)
  }

  if (!user) return null

  function handleStartWorking(id: string): void {
    // Instead of navigating, show the study environment modal
    const project = projects.find(p => p.id === id)
    if (project) {
      setSelectedProject(project)
      setShowStudyEnv(true)
    }
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#18181b] via-[#232336] to-[#11111a] px-4 py-12">
      <main className="w-full max-w-3xl bg-[#232336]/90 rounded-3xl shadow-xl p-8 flex flex-col gap-8 border border-[#2d2d44] backdrop-blur-md">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Projects</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 px-4 py-2 rounded-full text-gray-900 font-semibold transition shadow"
            >
              <FiPlus /> New
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-full text-gray-200 font-semibold transition shadow"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </header>
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            No projects found. Create one to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onDelete={handleDelete}
                onClick={setSelectedProject}
              />
            ))}
          </div>
        )}
        {modalOpen && (
          <NewProjectModal
            onClose={() => setModalOpen(false)}
            onSave={handleSaveProject}
            error={error}
          />
        )}
        {selectedProject && !showStudyEnv && (
          <ProjectDetailsModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onStartWorking={handleStartWorking}
          />
        )}
        {showStudyEnv && selectedProject && (
          <StudyEnvironmentModal
            project={selectedProject}
            onClose={() => setShowStudyEnv(false)}
          />
        )}
      </main>
    </section>
  )
}

function ProjectCard({
  project,
  onDelete,
  onClick,
}: {
  project: Project
  onDelete: (id: string) => void
  onClick: (project: Project) => void
}) {
  const dueDate = parseISO(project.deadline)
  const late = isPast(dueDate)
  return (
    <div
      className="p-4 bg-[#18181b] rounded-xl shadow border border-[#232336] relative cursor-pointer hover:border-emerald-400 transition"
      onClick={() => onClick(project)}
    >
      <h2 className="text-lg font-semibold text-emerald-400">{project.title}</h2>
      <p className="text-sm mt-1 text-gray-300">{project.description}</p>
      <p className={`text-xs mt-2 ${late ? 'text-red-400' : 'text-gray-400'}`}>
        {late ? 'Past due ' : 'Due '}
        {formatDistanceToNow(dueDate, { addSuffix: true })}
      </p>
      <button
        onClick={e => {
          e.stopPropagation()
          onDelete(project.id)
        }}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition"
        aria-label="Delete project"
      >
        <FiTrash2 />
      </button>
    </div>
  )
}

function NewProjectModal({
  onClose,
  onSave,
  error,
}: {
  onClose: () => void
  onSave: (data: { title: string; description: string; deadline: string; files: File[] }) => void
  error: string | null
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [localError, setLocalError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ]
    const maxSize = 5 * 1024 * 1024 // 5MB

    const uploaded: File[] = []
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      if (!allowedTypes.includes(file.type)) {
        setLocalError('Only PDF, TXT, Word, and image files are allowed.')
        return
      }
      if (file.size > maxSize) {
        setLocalError('Each file must be less than 5MB.')
        return
      }
      uploaded.push(file)
    }
    setFiles(uploaded)
    setLocalError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || !deadline) return
    onSave({ title, description, deadline, files })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#232336] text-gray-100 rounded-xl p-6 w-full max-w-md border border-[#2d2d44] shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">New Project</h2>
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
            className="w-full px-3 py-2 bg-[#18181b] text-gray-100 rounded focus:outline-none border border-[#232336] placeholder-gray-400"
            required
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#18181b] text-gray-100 rounded focus:outline-none border border-[#232336] placeholder-gray-400"
            required
          />
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full px-3 py-2 bg-[#18181b] text-gray-100 rounded focus:outline-none border border-[#232336] placeholder-gray-400"
            required
          />
          <div>
            <label className="block mb-2 font-semibold text-white">Add files (PDF, TXT, Word, Images):</label>
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx,image/*"
              multiple
              onChange={handleFileChange}
              className="block w-full text-gray-100 file:bg-emerald-500 file:text-gray-900 file:rounded file:px-3 file:py-1 file:border-none file:mr-3"
            />
            {localError && <div className="text-red-400 mt-2">{localError}</div>}
            {error && <div className="text-red-400 mt-2">{error}</div>}
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-indigo-200">
                {files.map((file, idx) => (
                  <li key={idx}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 text-gray-900 rounded hover:bg-emerald-400 transition font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- ProjectDetailsModal: Generate signed URLs for file access ---

function ProjectDetailsModal({
  project,
  onClose,
  onStartWorking
}: {
  project: Project
  onClose: () => void
  onStartWorking: (id: string) => void
}) {
  const supabase = useSupabaseClient()
  const [fileLinks, setFileLinks] = useState<{ [key: string]: string }>({})
  const [linkErrors, setLinkErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    async function getLinks() {
      const links: { [key: string]: string } = {}
      const errors: { [key: string]: string } = {}

      await Promise.all(
        project.files.map(async (file) => {
          const { data, error } = await supabase
            .storage
            .from('project-files')
            .createSignedUrl(file.url, 60 * 60) // 1 hour
          if (data?.signedUrl) {
            links[file.url] = data.signedUrl
          } else if (error) {
            errors[file.url] = error.message
          }
        })
      )

      setFileLinks(links)
      setLinkErrors(errors)
    }
    getLinks()
  }, [project.files, supabase])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#232336] text-gray-100 rounded-xl p-6 w-full max-w-lg border border-[#2d2d44] shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FiX size={22} />
        </button>
        <h2 className="text-2xl font-bold mb-2 text-emerald-400">{project.title}</h2>
        <p className="text-gray-300 mb-4">{project.description}</p>
        <div>
          <h3 className="font-semibold text-white mb-2">Files:</h3>
          {project.files && project.files.length > 0 ? (
            <ul className="space-y-2">
              {project.files.map((file, idx) => (
                <li key={idx} className="flex items-center gap-2 bg-[#18181b] rounded px-3 py-2">
                  {file.type.startsWith('image') ? (
                    <AiOutlineFileImage className="text-indigo-400" />
                  ) : file.type === 'application/pdf' ? (
                    <FiFile className="text-red-400" />
                  ) : file.type === 'text/plain' ? (
                    <FiFileText className="text-emerald-400" />
                  ) : (
                    <FiFile className="text-gray-400" />
                  )}
                  {fileLinks[file.url] ? (
                    <a
                      href={fileLinks[file.url]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-indigo-200 hover:underline"
                    >
                      {file.name}
                    </a>
                  ) : linkErrors[file.url] ? (
                    <span className="text-red-400">Link error: {linkErrors[file.url]}</span>
                  ) : (
                    <span className="text-gray-400">Loading link...</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400">No files uploaded yet.</div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onStartWorking(project.id)}
            className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-400 transition"
          >
            Start Working
          </button>
        </div>
      </div>
    </div>
  )
}


