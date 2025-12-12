import { useEffect, useRef, useState } from 'react'

interface Props {
  onSearch: (params: Record<string, any>) => void
  initialFrom?: string
  initialTo?: string
}

function toInputVal(s?: string) {
  if (!s) return ''
  // 只保留日期部分，去掉时间
  const dateOnly = s.split(' ')[0]
  return dateOnly
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

  // 初始化输入框为父组件提供的默认值或当前日期
  useEffect(() => {
    // 获取当前日期，格式为 YYYY-MM-DD
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    // 如果有初始值，使用初始值；否则使用当前日期
    const fromDate = initialFrom ? toInputVal(initialFrom) : todayStr
    const toDate = initialTo ? toInputVal(initialTo) : todayStr

    setDateFrom(fromDate)
    setDateTo(toDate)
    
    // 初始加载时触发一次搜索
    onSearch({ search, date_from: fromDate, date_to: toDate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 前日达成按钮功能：设置开始和结束日期都为前一日
  const handleYesterdayAchievement = () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // 格式化日期为date输入框格式（YYYY-MM-DD）
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const yesterdayStr = formatDate(yesterday)
    
    // 开始和结束日期都设置为前一天
    setDateFrom(yesterdayStr)
    setDateTo(yesterdayStr)
    onSearch({ search, date_from: yesterdayStr, date_to: yesterdayStr })
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
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="border rounded px-3 py-2 w-[180px]"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="border rounded px-3 py-2 w-[180px]"
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
