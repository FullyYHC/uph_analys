import { useEffect, useRef, useState } from 'react'

interface Props {
  onSearch: (params: Record<string, any>) => void
  initialFrom?: string
  initialTo?: string
}

function toInputVal(s?: string) {
  if (!s) return ''
  const t = s.replace(' ', 'T')
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(t) ? t : ''
}

export default function SearchForm({ onSearch, initialFrom, initialTo }: Props) {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({ search, date_from: dateFrom, date_to: dateTo })
  }

  // 模糊筛选：输入搜索词时自动触发查询（去抖）
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onSearch({ search, date_from: dateFrom, date_to: dateTo })
    }, 300)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [search, dateFrom, dateTo])

  // 初始化输入框为父组件提供的默认值
  useEffect(() => {
    if (initialFrom || initialTo) {
      setDateFrom((prev) => prev || toInputVal(initialFrom))
      setDateTo((prev) => prev || toInputVal(initialTo))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <input
        placeholder="搜索 PlanID/机型/线别/设备类型"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        type="datetime-local"
        step="1"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        type="datetime-local"
        step="1"
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
