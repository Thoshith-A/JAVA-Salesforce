import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SpectatorLeaderboard from '../components/SpectatorLeaderboard'

export default function SpectatePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputJobId, setInputJobId] = useState(searchParams.get('jobId') ?? '')
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
        <div className="max-w-xl mx-auto panel space-y-3">
          <h1 className="text-2xl font-bold">Enter a Job ID</h1>
          <input
            value={inputJobId}
            onChange={(e) => setInputJobId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-full"
            placeholder="Paste job ID"
          />
          <button
            className="px-4 py-2 rounded bg-cyan-500 text-gray-950 font-semibold"
            onClick={() => setSearchParams({ jobId: inputJobId })}
          >
            Go
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <SpectatorLeaderboard jobId={jobId} />
      </div>
    </div>
  )
}
