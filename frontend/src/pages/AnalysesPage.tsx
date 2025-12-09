import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAnalysesStore } from '@/stores/analyses'
import { analysesApi } from '@/utils/axios'
import SourceToggle from '@/components/SourceToggle'
import LinePrefixToggle from '@/components/LinePrefixToggle'
import SearchForm from '@/components/SearchForm'
import Table from '@/components/Table'
import Pagination from '@/components/Pagination'
import Top3PushButton from '@/components/Top3PushButton'

export default function AnalysesPage() {
  const { list, page, size, total, loading, error, fetchList, setPage, setSize, setFilters, filters, 
          top3Loading, top3Status, pushTop3, getTop3Status } = useAnalysesStore()
  const [searchParams] = useSearchParams()
  const userNameParam = searchParams.get('userName')
  // Extract Chinese name from "2020120767+梅波" -> "梅波" or "2020120767_梅波" -> "梅波" or "梅波" -> "梅波"
  const chineseName = userNameParam ? (() => {
    if (userNameParam.includes('+')) {
      return userNameParam.split('+')[1] || userNameParam;
    }
    const underscoreIndex = userNameParam.indexOf('_');
    if (underscoreIndex !== -1) {
      return userNameParam.substring(underscoreIndex + 1);
    }
    return userNameParam;
  })() : ''
  
  const [tip, setTip] = useState<{ text: string; ok: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [source, setSource] = useState<'all' | 'sz' | 'hn'>('all')
  const [linePref, setLinePref] = useState<'ALL'|'A'|'B'|'C'|'D'|'E'|'F'|'O'>('ALL')
  // 添加密码确认相关状态
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 页面加载和分页/过滤变化时，只刷新列表数据
  useEffect(() => {
    fetchList()
  }, [page, filters, fetchList])

  // 独立的TOP3状态请求逻辑
  useEffect(() => {
    // 初始加载时请求一次
    getTop3Status()
    
    // 设置每小时更新一次状态
    const intervalId = setInterval(() => {
      getTop3Status()
    }, 60 * 60 * 1000) // 3600000毫秒 = 1小时
    
    // 清理定时器
    return () => clearInterval(intervalId)
  }, [getTop3Status])

  const handleSearch = (params: Record<string, any>) => {
    const srcParam = source === 'all' ? undefined : (source === 'sz' ? 'sz' : 'cs')
    // Apply line prefix filter when searching
    let linePrefix: string | undefined;
    let lineGroup: string | undefined;
    if (linePref === 'ALL') {
      linePrefix = undefined;
      lineGroup = undefined;
    } else if (linePref === 'O') {
      linePrefix = undefined;
      lineGroup = 'O';
    } else {
      linePrefix = linePref;
      lineGroup = undefined;
    }
    setFilters({ ...params, source: srcParam, line_prefix: linePrefix, line_group: lineGroup })
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
            // Apply line prefix filter when source changes
            let linePrefix: string | undefined;
            let lineGroup: string | undefined;
            if (linePref === 'ALL') {
              linePrefix = undefined;
              lineGroup = undefined;
            } else if (linePref === 'O') {
              linePrefix = undefined;
              lineGroup = 'O';
            } else {
              linePrefix = linePref;
              lineGroup = undefined;
            }
            setFilters({ source: srcParam, line_prefix: linePrefix, line_group: lineGroup })
            setPage(1)
            fetchList()
          }} />
          <LinePrefixToggle value={linePref} onChange={(v) => {
            setLinePref(v)
            const srcParam = source === 'all' ? undefined : (source === 'sz' ? 'sz' : 'cs')
            // Apply line prefix filter based on selection
            let linePrefix: string | undefined;
            let lineGroup: string | undefined;
            if (v === 'ALL') {
              linePrefix = undefined;
              lineGroup = undefined;
            } else if (v === 'O') {
              linePrefix = undefined;
              lineGroup = 'O';
            } else {
              linePrefix = v;
              lineGroup = undefined;
            }
            setFilters({ source: srcParam, line_prefix: linePrefix, line_group: lineGroup })
            setPage(1)
            fetchList()
          }} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // 显示密码确认模态框
              setShowPasswordModal(true)
              setPassword('')
              setPasswordError('')
            }}
            disabled={syncing}
            className={`bg-green-600 text-white rounded px-4 py-2 ${syncing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
          >
            同步数据
          </button>
          
          {/* 密码确认模态框 */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h3 className="text-lg font-semibold mb-4">确认同步数据</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">请输入密码：</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    取消
                  </button>
                  <button
                    onClick={async () => {
                      if (password === 'admin123') {
                        // 密码正确，开始同步
                        setShowPasswordModal(false)
                        try {
                          // 先诊断是否需要同步：比较 cs/sz 与 pm 的最新时间
                          const { data: max } = await analysesApi.maxDates()
                          const target = source === 'all'
                            ? [max?.cs, max?.sz].filter(Boolean).sort().pop()
                            : (source === 'sz' ? max?.sz : max?.cs)
                          const current = max?.pm
                          if (!target) {
                            setTip({ text: '暂无可同步数据', ok: true })
                            return
                          }
                          // 若已最新则直接刷新
                          if (current && String(current) >= String(target)) {
                            await fetchList()
                            setTip({ text: '已是最新数据，无需同步', ok: true })
                            return
                          }
                          const df = current ? String(current).slice(0, 10) : String(target).slice(0, 10)
                          const dt = String(target).slice(0, 10)
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
                      } else {
                        // 密码错误
                        setPasswordError('密码错误，请输入正确的密码')
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 新增：TOP3推送按钮 */}
          <Top3PushButton 
            loading={top3Loading} 
            status={top3Status} 
            onPush={pushTop3} 
          />
        </div>
      </div>
      {tip && (
        <div className={`mb-3 px-3 py-2 rounded ${tip.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tip.text}</div>
      )}
      <SearchForm onSearch={handleSearch} initialFrom={filters.date_from} initialTo={filters.date_to} />
      {loading ? (
        <div className="text-gray-500">加载中…</div>
      ) : (
        <>
          <Table data={list} chineseName={chineseName} />
          <Pagination page={page} size={size} total={total} onChange={(p) => { setPage(p); fetchList() }} onSizeChange={(s) => { setSize(s); fetchList() }} />
        </>
      )}
    </div>
  )
}
