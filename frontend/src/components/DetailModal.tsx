import { useEffect, useState } from 'react'
import { useDetailStore } from '@/stores/detail'
import { PatchBody } from '@/types/api'

interface Props {
  serial: number
  chineseName?: string
  onClose: () => void
}

export default function DetailModal({ serial, chineseName, onClose }: Props) {
  const { analys, item, loading, error, fetchDetail, patchItem } = useDetailStore()
  const [form, setForm] = useState<PatchBody>({})

  useEffect(() => {
    fetchDetail(serial)
  }, [serial, fetchDetail])

  useEffect(() => {
    if (item) {
      setForm({
        line_leader_item: item.line_leader_item || '',
        pie_item: item.pie_item || '',
        qc_item: item.qc_item || ''
      })
    }
  }, [item])

  const handleSave = async (field: 'line_leader' | 'pie' | 'qc') => {
    // Only update the specific field that triggered the save
    const body: PatchBody = {}
    if (field === 'line_leader') body.line_leader_item = form.line_leader_item
    if (field === 'pie') body.pie_item = form.pie_item
    if (field === 'qc') body.qc_item = form.qc_item
    
    // Always try to update, even if item is undefined (backend will create it)
    const id = item?.id || serial
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">详情 - {analys.serial_number}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">
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
                  {chineseName && <span className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-1 rounded">{chineseName}</span>}
                </div>
                <textarea
                  value={form.line_leader_item || ''}
                  onChange={(e) => setForm({ ...form, line_leader_item: e.target.value })}
                  onBlur={() => handleSave('line_leader')}
                  rows={4}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
                  placeholder="点击输入..."
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm">PIE</label>
                  {item?.pie_name && <span className="text-xs text-red-600 border border-red-200 bg-red-50 px-1 rounded">{item.pie_name}</span>}
                  {chineseName && <span className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-1 rounded">{chineseName}</span>}
                </div>
                <textarea
                  value={form.pie_item || ''}
                  onChange={(e) => setForm({ ...form, pie_item: e.target.value })}
                  onBlur={() => handleSave('pie')}
                  rows={4}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
                  placeholder="点击输入..."
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm">QC</label>
                  {item?.qc_name && <span className="text-xs text-red-600 border border-red-200 bg-red-50 px-1 rounded">{item.qc_name}</span>}
                  {chineseName && <span className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-1 rounded">{chineseName}</span>}
                </div>
                <textarea
                  value={form.qc_item || ''}
                  onChange={(e) => setForm({ ...form, qc_item: e.target.value })}
                  onBlur={() => handleSave('qc')}
                  rows={4}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
                  placeholder="点击输入..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}