import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDetailStore } from '@/stores/detail'
import { PatchBody } from '@/types/api'

export default function DetailPage() {
  const { serial } = useParams<{ serial: string }>()
  const nav = useNavigate()
  const { analys, item, loading, error, fetchDetail, patchItem } = useDetailStore()
  const [form, setForm] = useState<PatchBody>({})

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

  const handleSave = () => {
    if (!item) return
    const userName = prompt('请输入用户名（格式：工号_中文名）：')
    if (!userName) return
    patchItem(item.id, form, userName)
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
            <label className="block text-sm mb-1">拉长</label>
            <input
              value={form.line_leader_item || ''}
              onChange={(e) => setForm({ ...form, line_leader_item: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">PIE</label>
            <input
              value={form.pie_item || ''}
              onChange={(e) => setForm({ ...form, pie_item: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">QC</label>
            <input
              value={form.qc_item || ''}
              onChange={(e) => setForm({ ...form, qc_item: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}