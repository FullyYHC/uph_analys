import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useDetailStore } from '@/stores/detail'
import { PatchBody } from '@/types/api'

export default function DetailPage() {
  const { serial } = useParams<{ serial: string }>()
  const [searchParams] = useSearchParams()
  const userNameParam = searchParams.get('userName')
  // Extract Chinese name from "2020120767+梅波" -> "梅波"
  // Also handle pure URL encoded strings if necessary
  const chineseName = userNameParam ? (userNameParam.includes('+') ? userNameParam.split('+')[1] : userNameParam) : ''

  const nav = useNavigate()
  const { analys, item, loading, error, fetchDetail, patchItem } = useDetailStore()
  const [form, setForm] = useState<PatchBody>({})
  
  // Track which field was focused last to know which name to update
  const [activeField, setActiveField] = useState<'line_leader' | 'pie' | 'qc' | null>(null)

  useEffect(() => {
    if (serial) {
      fetchDetail(Number(serial))
    }
  }, [serial])

  useEffect(() => {
    if (item) {
      setForm({
        line_leader_item: item.line_leader_item || '',
        pie_item: item.pie_item || '',
        qc_item: item.qc_item || ''
      })
    }
  }, [item])

  const handleInputClick = (field: 'line_leader' | 'pie' | 'qc') => {
    setActiveField(field)
  }

  const handleSave = async (field: 'line_leader' | 'pie' | 'qc') => {
    // Only update the specific field that triggered the save
    const body: PatchBody = {}
    if (field === 'line_leader') body.line_leader_item = form.line_leader_item
    if (field === 'pie') body.pie_item = form.pie_item
    if (field === 'qc') body.qc_item = form.qc_item
    
    // Always try to update, even if item is undefined (backend will create it)
    const id = item?.id || Number(serial)
    if (!id) return // Safety check

    try {
      await patchItem(id, body, chineseName)
    } catch (e) {
      console.error("Failed to save item:", e)
    }
  }

  if (loading) return <div className="text-gray-500">加载中…</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!analys) return null

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">详情 - {analys.serial_number}</h2>
        <button onClick={() => nav(-1)} className="text-blue-600 hover:underline">返回</button>
      </div>
      <div className="bg-white rounded border p-4 mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>机型：{analys.model_type}</div>
          <div>日期：{analys.date_record}</div>
        </div>
        <div className="grid grid-cols-6 gap-2 text-sm">
          <div>8-10：{analys.diff_cnt_8_10}</div>
          <div>10-12：{analys.diff_cnt_10_12}</div>
          <div>12-14：{analys.diff_cnt_12_14}</div>
          <div>14-16：{analys.diff_cnt_14_16}</div>
          <div>16-18：{analys.diff_cnt_16_18}</div>
          <div>18-20：{analys.diff_cnt_18_20}</div>
          <div>20-22：{analys.diff_cnt_20_22}</div>
          <div>22-24：{analys.diff_cnt_22_24}</div>
          <div>0-2：{analys.diff_cnt_24_2}</div>
          <div>2-4：{analys.diff_cnt_2_4}</div>
          <div>4-6：{analys.diff_cnt_4_6}</div>
          <div>6-8：{analys.diff_cnt_6_8}</div>
        </div>
      </div>
      <div className="bg-white rounded border p-4">
        <h3 className="font-semibold mb-2">人员配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm">拉长</label>
              {item?.line_name && <span className="text-xs text-red-600 border border-red-200 bg-red-50 px-1 rounded">{item.line_name}</span>}
            </div>
            <input
              value={form.line_leader_item || ''}
              onClick={() => handleInputClick('line_leader')}
              onChange={(e) => setForm({ ...form, line_leader_item: e.target.value })}
              onBlur={() => handleSave('line_leader')}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="点击输入..."
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm">PIE</label>
              {item?.pie_name && <span className="text-xs text-red-600 border border-red-200 bg-red-50 px-1 rounded">{item.pie_name}</span>}
            </div>
            <input
              value={form.pie_item || ''}
              onClick={() => handleInputClick('pie')}
              onChange={(e) => setForm({ ...form, pie_item: e.target.value })}
              onBlur={() => handleSave('pie')}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="点击输入..."
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm">QC</label>
              {item?.qc_name && <span className="text-xs text-red-600 border border-red-200 bg-red-50 px-1 rounded">{item.qc_name}</span>}
            </div>
            <input
              value={form.qc_item || ''}
              onClick={() => handleInputClick('qc')}
              onChange={(e) => setForm({ ...form, qc_item: e.target.value })}
              onBlur={() => handleSave('qc')}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="点击输入..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}