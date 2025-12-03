import { useEffect, useState } from 'react'
import { useAnalysesStore } from '@/stores/analyses'
import { analysesApi } from '@/utils/axios'
import SourceToggle from '@/components/SourceToggle'
import SearchForm from '@/components/SearchForm'
import Table from '@/components/Table'
import Pagination from '@/components/Pagination'

export default function AnalysesPage() {
  const { list, page, size, total, loading, error, fetchList, setPage, setSize, setFilters, filters } = useAnalysesStore()
  const [tip, setTip] = useState<{ text: string; ok: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [source, setSource] = useState<'all' | 'sz' | 'hn'>('all')

  useEffect(() => {
    fetchList()
  }, [page])

  const handleSearch = (params: Record<string, any>) => {
    const srcParam = source === 'all' ? undefined : (source === 'sz' ? 'sz' : 'cs')
    setFilters({ ...params, source: srcParam })
    setPage(1)
    fetchList()
  }

  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <h2 className="text-lg font-semibold">UPH 达成列表</h2>
          <SourceToggle value={source} onChange={(v) => {
            setSource(v)
            const srcParam = v === 'all' ? undefined : (v === 'sz' ? 'sz' : 'cs')
            setFilters({ source: srcParam })
            setPage(1)
            fetchList()
          }} />
        </div>
        <button
          onClick={async () => {
            try {
              // 强制执行增量/覆盖同步，确保新字段写入
              const df = (filters.date_from || '').slice(0, 10)
              const dt = (filters.date_to || '').slice(0, 10)
              const srcParam = source === 'all' ? 'cs,sz' : (source === 'sz' ? 'sz' : 'cs')
              const { data } = await analysesApi.sync({ date_from: df, date_to: dt, async: true, sources: srcParam })
              if (!data?.ok && data?.reason === 'busy') {
                setTip({ text: '正在同步…', ok: true })
                setSyncing(true)
              } else if (!data?.ok) {
                setTip({ text: '同步失败！(服务繁忙)', ok: false })
                return
              }
              setTip({ text: '正在同步…', ok: true })
              setSyncing(true)
              const start = Date.now()
              const poll = async () => {
                try {
                  const { data: st } = await analysesApi.syncStatus()
                  if (st?.status === 'completed') {
                    setTip({ text: '同步数据成功！', ok: true })
                    setSyncing(false)
                    await fetchList()
                  } else if (st?.status === 'failed') {
                    setTip({ text: `同步失败！${st?.error ? '(' + st.error + ')' : ''}` , ok: false })
                    setSyncing(false)
                  } else if (Date.now() - start < 180000) {
                    setTimeout(poll, 2000)
                  } else {
                    setTip({ text: '同步超时！', ok: false })
                    setSyncing(false)
                  }
                } catch (err: any) {
                  // 网络异常重试
                  setTimeout(poll, 3000)
                }
              }
              setTimeout(poll, 1500)
            } catch (e: any) {
              const msg = e?.response?.data?.error || e?.message || '未知错误'
              setTip({ text: `同步失败！(${msg})`, ok: false })
              setSyncing(false)
            }
          }}
          disabled={syncing}
          className={`bg-green-600 text-white rounded px-4 py-2 ${syncing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
        >
          同步数据
        </button>
      </div>
      {tip && (
        <div className={`mb-3 px-3 py-2 rounded ${tip.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tip.text}</div>
      )}
      <SearchForm onSearch={handleSearch} initialFrom={filters.date_from} initialTo={filters.date_to} />
      {loading ? (
        <div className="text-gray-500">加载中…</div>
      ) : (
        <>
          <Table data={list} />
          <Pagination page={page} size={size} total={total} onChange={(p) => { setPage(p); fetchList() }} onSizeChange={(s) => { setSize(s); fetchList() }} />
        </>
      )}
    </div>
  )
}
