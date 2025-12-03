import { useEffect, useState } from 'react'
import { analysesApi } from '@/utils/axios'

interface Props {
  serial: number
  slot: string
  onClose: () => void
  onFlag?: (flags: { lowPct: boolean; zeroPlan: boolean }) => void
  source?: 'cs' | 'sz'
}

export default function BucketModal({ serial, slot, onClose, onFlag, source }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await analysesApi.bucket(serial, slot, source)
        setData(data)
        const sumP = source === 'cs' ? data?.cs?.summary?.p : source === 'sz' ? data?.sz?.summary?.p : ((data?.cs?.summary?.p ?? 0) + (data?.sz?.summary?.p ?? 0))
        const pct = source === 'cs' ? data?.cs?.summary?.pct : source === 'sz' ? data?.sz?.summary?.pct : (data?.cs?.summary?.pct ?? data?.sz?.summary?.pct)
        const low = typeof pct === 'number' && pct < 0.9
        const zeroPlan = !sumP || sumP === 0
        if (onFlag) onFlag({ lowPct: low, zeroPlan })
      } finally {
        setLoading(false)
      }
    })()
  }, [serial, slot])
  if (!data && loading) return <div className="fixed inset-0 bg-black/30 flex items-center justify-center"><div className="bg-white p-4 rounded">加载中…</div></div>
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white p-4 rounded w-[720px]" onClick={(e)=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <div className="font-semibold">计算过程 {slot}</div>
          <button className="px-3 py-1 border rounded" onClick={onClose}>关闭</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(['cs','sz'] as const).filter(k => !source || source === k).map(k => (
            <div key={k}>
              <div className="mb-2 text-sm text-gray-700">源: {k.toUpperCase()}</div>
              <table className="min-w-full border text-sm">
                <thead><tr className="bg-gray-100"><th className="px-2 py-1">HID</th><th className="px-2 py-1">PQty</th><th className="px-2 py-1">MQty</th><th className="px-2 py-1">AQty</th></tr></thead>
                <tbody>
                  {(data?.[k]?.items||[]).map((r:any)=> (
                    <tr key={r.ID}><td className="px-2 py-1">{r.ID}</td><td className="px-2 py-1">{r.PQty}</td><td className="px-2 py-1">{r.MQty}</td><td className="px-2 py-1">{r.AQty}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-sm">合计 P={data?.[k]?.summary?.p} M={data?.[k]?.summary?.m} A={data?.[k]?.summary?.a} 使用={data?.[k]?.summary?.use} 计算 Diff={data?.[k]?.summary?.diff} 比例={data?.[k]?.summary?.pct!=null? (data[k].summary.pct*100).toFixed(2)+'%':'—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
