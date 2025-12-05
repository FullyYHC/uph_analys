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

  // 前日达成按钮功能：设置开始时间为前一日凌晨01:00:00，结束时间为当日凌晨01:00:00
  const handleYesterdayAchievement = () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // 设置开始时间：前一日凌晨01:00:00
    const fromDate = new Date(yesterday)
    fromDate.setHours(1, 0, 0, 0)
    
    // 设置结束时间：当日凌晨01:00:00
    const toDate = new Date(now)
    toDate.setHours(1, 0, 0, 0)
    
    // 格式化日期为datetime-local输入框格式（YYYY-MM-DDTHH:mm:ss）
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    }
    
    const fromStr = formatDate(fromDate)
    const toStr = formatDate(toDate)
    
    setDateFrom(fromStr)
    setDateTo(toStr)
    onSearch({ search, date_from: fromStr, date_to: toStr })
  }

  // 清除筛选按钮功能：恢复默认状态
  const handleClearFilter = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    onSearch({ search: '', date_from: '', date_to: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
      <input
        placeholder="搜索 PlanID/机型/线别/设备类型"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-2 w-[300px]"
      />
      <input
        type="datetime-local"
        step="1"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="border rounded px-3 py-2 w-[200px]"
      />
      <input
        type="datetime-local"
        step="1"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="border rounded px-3 py-2 w-[200px]"
      />
      <button type="button" onClick={handleYesterdayAchievement} className="bg-green-600 text-white rounded px-3 py-2 hover:bg-green-700 w-[100px]">
        前日达成
      </button>
      <button type="button" onClick={handleClearFilter} className="bg-gray-600 text-white rounded px-3 py-2 hover:bg-gray-700 w-[100px]">
        清除筛选
      </button>
      <button type="submit" className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 w-[100px]">
        查询
      </button>
    </form>
  )
}
