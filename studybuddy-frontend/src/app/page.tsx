'use client'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <section
      className="
        min-h-screen flex flex-col items-center justify-center
        px-4 py-12
        relative
        overflow-hidden
      "
      style={{
        background:
          'radial-gradient(ellipse at 60% 40%, #232946 0%, #181824 70%, #11111a 100%)',
      }}
    >
      {/* Optional: Soft blurred accent shapes for extra friendliness */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-700 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-emerald-700 opacity-20 blur-2xl" />

      <div className="w-full max-w-2xl bg-[#232336]/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-8 border border-[#2d2d44] backdrop-blur-md">
        <Image
          src="/road.svg"
          alt="AI Illustration"
          width={320}
          height={200}
          className="w-48 h-auto drop-shadow-lg"
        />
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-center drop-shadow">
          Welcome to <span className="text-emerald-400">StudyBuddy</span>
        </h1>
        <p className="text-gray-300 text-lg text-center max-w-xl">
          StudyBuddy helps you master tech topics with AI.<br />
          Chat with your AI tutor, create flashcards, and organize your learning—all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href="/auth/register"
            className="flex-1 px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-gray-900 font-bold rounded-lg text-center transition shadow-lg"
          >
            Get Started
          </Link>
          <Link
            href="/chat"
            className="flex-1 px-6 py-3 border-2 border-indigo-400 hover:bg-indigo-900/40 text-indigo-200 rounded-lg font-bold text-center transition shadow-lg"
          >
            Try Demo
          </Link>
        </div>
      </div>
    </section>
  )
}