'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type QuizQuestion = {
  question: string
  options: string[]
  answer: string
}

type StudyData = {
  type: string
  title: string
  questions?: QuizQuestion[]
  summary?: string
  flashcards?: { front: string; back: string }[]
  result?: { text: string }
}

export default function StudySessionPage() {
  const params = useParams()
  const { type, sessionId } = params as { type: string; sessionId: string }
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StudyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/study_sessions?id=eq.${sessionId}`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            },
          }
        )
        const data = await res.json()
        setData(data[0]) // result is an array
      } catch (err: any) {
        setError(err.message)
      }
      setLoading(false)
    }
    fetchData()
  }, [sessionId])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center">No data found.</div>

  let questions: QuizQuestion[] = []

  if (Array.isArray(data.questions)) {
    questions = data.questions
  } else if (data.result && typeof data.result.text === 'string') {
    questions = parseQuizMarkdown(data.result.text)
  }

  const flashcards = Array.isArray(data.flashcards) ? data.flashcards : []

  return (
    <div className="min-h-screen bg-[#18181b] text-gray-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6 text-emerald-400">{data.title || type.toUpperCase()}</h1>
      {type === 'quiz' && questions.length > 0 && (
        <div className="w-full max-w-xl bg-[#232336] rounded-xl p-8 shadow-lg">
          <div className="mb-4 font-semibold text-lg">
            Question {current + 1} of {questions.length}
          </div>
          <div className="mb-6 text-xl">{questions[current].question}</div>
          <ul className="mb-6 space-y-3">
            {questions[current].options.length === 0 ? (
              <li className="text-red-400">No options found for this question.</li>
            ) : (
              questions[current].options.map((opt, idx) => (
                <li key={idx}>
                  <button
                    className={`w-full text-left px-4 py-2 rounded transition
                      ${selected === idx
                        ? showAnswer
                          ? idx === getCorrectOptionIndex(questions[current])
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-emerald-700'
                        : 'bg-[#18181b] hover:bg-emerald-900'}`}
                    disabled={showAnswer}
                    onClick={() => setSelected(idx)}
                  >
                    {opt}
                  </button>
                </li>
              ))
            )}
          </ul>
          {!showAnswer ? (
            <button
              className="px-6 py-2 bg-emerald-500 text-white rounded font-semibold"
              disabled={selected === null}
              onClick={() => setShowAnswer(true)}
            >
              Check Answer
            </button>
          ) : (
            <div className="flex justify-between items-center">
              <span>
                {selected === getCorrectOptionIndex(questions[current])
                  ? <span className="text-emerald-400 font-bold">Correct!</span>
                  : <span className="text-red-400 font-bold">Incorrect.</span>
                }
                {' '}Answer: <span className="font-semibold">{questions[current].answer}</span>
              </span>
              <button
                className="ml-4 px-4 py-2 bg-emerald-700 text-white rounded"
                onClick={() => {
                  setShowAnswer(false)
                  setSelected(null)
                  setCurrent(c => Math.min(c + 1, questions.length - 1))
                }}
                disabled={current === questions.length - 1}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      {type === 'flashcards' && flashcards.length > 0 && (
        <div className="w-full max-w-xl bg-[#232336] rounded-xl p-8 shadow-lg flex flex-col items-center">
          <div className="mb-4 font-semibold text-lg">
            Flashcard {current + 1} of {flashcards.length}
          </div>
          <div className="mb-6 text-xl">{showAnswer ? flashcards[current].back : flashcards[current].front}</div>
          <button
            className="px-6 py-2 bg-emerald-500 text-white rounded font-semibold"
            onClick={() => setShowAnswer(a => !a)}
          >
            {showAnswer ? 'Show Question' : 'Show Answer'}
          </button>
          <div className="mt-4 flex gap-2">
            <button
              className="px-4 py-2 bg-emerald-700 text-white rounded"
              onClick={() => {
                setShowAnswer(false)
                setCurrent(c => Math.max(c - 1, 0))
              }}
              disabled={current === 0}
            >
              Previous
            </button>
            <button
              className="px-4 py-2 bg-emerald-700 text-white rounded"
              onClick={() => {
                setShowAnswer(false)
                setCurrent(c => Math.min(c + 1, flashcards.length - 1))
              }}
              disabled={current === flashcards.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {type === 'summarize' && data.summary && (
        <div className="w-full max-w-2xl bg-[#232336] rounded-xl p-8 shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-emerald-400">Summary</h2>
          <p className="text-lg">{data.summary}</p>
        </div>
      )}
    </div>
  )
}

// Parser for your markdown format
function parseQuizMarkdown(markdown: string): QuizQuestion[] {
  // Find the line where the answer key starts (case-insensitive, with or without bold)
  const answerKeyRegex = /^(\*\*\s*)?(Answers|Svarnøkkel)\s*:?\s*(\*\*)?$/im;
  const lines = markdown.split('\n');
  let answerStart = lines.findIndex(line => answerKeyRegex.test(line.trim()));
  let questionsLines = lines;
  let answersLines: string[] = [];
  if (answerStart !== -1) {
    questionsLines = lines.slice(0, answerStart);
    answersLines = lines.slice(answerStart + 1);
  }

  // Parse answers
  let answers: string[] = [];
  if (answersLines.length > 0) {
    answers = answersLines
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        let ans = l.replace(/^\d+\.\s*/, '');
        if (/^[A-Da-d]$/.test(ans)) ans = ans + ')';
        return ans;
      });
  }

  // Parse questions and options
  const questions: QuizQuestion[] = [];
  let i = 0;
  while (i < questionsLines.length) {
    const line = questionsLines[i].trim();
    if (
      line &&
      !/^(-?\s*)?[A-Da-d][\)\.\:]/.test(line) &&
      !/^(-?\s*)?[A-Da-d][\)\.\:]$/.test(line) &&
      !answerKeyRegex.test(line)
    ) {
      let question = line.replace(/^\d+\.\s*/, '').replace(/^\*\*|\*\*$/g, '').replace(/^__|__$/g, '').trim();
      i++;
      const options: string[] = [];
      while (
        i < questionsLines.length &&
        /^(\s*-)?\s*[A-Da-d][\)\.\:]/.test(questionsLines[i])
      ) {
        options.push(
          questionsLines[i]
            .replace(/^(\s*-)?\s*[A-Da-d][\)\.\:]\s*/, '')
            .trim()
        );
        i++;
      }
      const answer = answers[questions.length] || '';
      questions.push({ question, options, answer });
    } else {
      i++;
    }
  }
  return questions;
}

// Helper to get the correct answer index from the answer letter (A/B/C/D/a/b/c/d)
function getCorrectOptionIndex(q: QuizQuestion) {
  // Try to match answer letter (a/b/c/d, any case)
  const letterMatch = q.answer.match(/^([A-Da-d])\)/)
  if (letterMatch) {
    const idx = ['a', 'b', 'c', 'd'].indexOf(letterMatch[1].toLowerCase())
    if (idx !== -1 && idx < q.options.length) return idx
  }
  // If answer is just the letter (e.g. "b"), not "b)"
  const singleLetter = q.answer.trim().toLowerCase()
  if (['a', 'b', 'c', 'd'].includes(singleLetter)) {
    const idx = ['a', 'b', 'c', 'd'].indexOf(singleLetter)
    if (idx !== -1 && idx < q.options.length) return idx
  }
  // Try to match answer text (fallback)
  const answerText = q.answer.replace(/^[A-Da-d]\)\s*/i, '').trim().toLowerCase()
  const idx = q.options.findIndex(opt => opt.trim().toLowerCase() === answerText)
  return idx
}