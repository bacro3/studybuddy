// src/app/page.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <section
      className="
        pt-20        // <-- push content down on mobile
        md:pt-0      // reset on desktop
        h-screen
        overflow-hidden
        flex items-center justify-center
        px-6 sm:px-12
        bg-gray-900 text-white
      "
    >
      <div className="max-w-7xl w-full flex flex-col-reverse md:flex-row items-center gap-12">
        {/* Text */}
        <div className="md:w-1/2 text-center md:text-left space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Learn Smarter with AI ✨
          </h1>
          <p className="text-white/80 text-lg">
            StudyBuddy helps you understand tech topics faster using AI. Chat with an AI tutor,
            create flashcards, and organize your projects all in one place.
          </p>
          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
            <Link
              href="/auth/register"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Get Started
            </Link>
            <Link
              href="/chat"
              className="px-6 py-3 border border-white/30 hover:border-white/60 text-white rounded-lg font-medium transition"
            >
              Try Demo
            </Link>
          </div>
        </div>

        {/* Image */}
        <div className="md:w-1/2">
          <Image
            src="/road.svg"
            alt="AI Illustration"
            width={600}
            height={400}
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  )
}
