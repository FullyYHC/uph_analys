import { useState } from 'react'

interface Props {
  onSearch: (params: Record<string, any>) => void
}

export default function SearchForm({ onSearch }: Props) {
  const [model, setModel] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({ model, date_from: dateFrom, date_to: dateTo })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <input
        placeholder="机型"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">
        查询
      </button>
    </form>
  )
}