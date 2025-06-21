export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-blue-100 to-green-100">
      <div className="bg-white/90 rounded-3xl shadow-xl p-10 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">404 - Page Not Found</h1>
        <p className="text-slate-500 mb-4">Sorry, we couldn't find that page.</p>
        <a href="/" className="text-blue-500 underline font-medium">Go Home</a>
      </div>
    </div>
  )
}
