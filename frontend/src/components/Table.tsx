import { useNavigate } from 'react-router-dom'
import { UphAnalys } from '@/types/api'
import { useAnalysesStore } from '@/stores/analyses'
import { formatDateTime } from '@/utils/format'

interface Props {
  data: UphAnalys[]
}

export default function Table({ data }: Props) {
  const nav = useNavigate()
  const { sort_by, sort_dir, setSort, fetchList } = useAnalysesStore()

  const renderSort = (col: string, label: string) => (
    <button
      className="px-4 py-2 text-left flex items-center gap-1 select-none"
      onClick={() => { setSort(col); fetchList() }}
    >
      <span>{label}</span>
      <span className="text-gray-500 text-xs">
        {sort_by === col ? (sort_dir === 'asc' ? '▲' : '▼') : ''}
      </span>
    </button>
  )

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border whitespace-nowrap">
        <thead>
          <tr className="bg-gray-100">
            <th className="whitespace-nowrap">{renderSort('serial_number', '序号')}</th>
            <th className="whitespace-nowrap">{renderSort('model_type', '机型')}</th>
            <th className="whitespace-nowrap">{renderSort('date_record', '日期')}</th>
            <th className="px-4 py-2 text-left">8-10</th>
            <th className="px-4 py-2 text-left">10-12</th>
            <th className="px-4 py-2 text-left">12-14</th>
            <th className="px-4 py-2 text-left">14-16</th>
            <th className="px-4 py-2 text-left">16-18</th>
            <th className="px-4 py-2 text-left">18-20</th>
            <th className="px-4 py-2 text-left">20-22</th>
            <th className="px-4 py-2 text-left">22-24</th>
            <th className="px-4 py-2 text-left">0-2</th>
            <th className="px-4 py-2 text-left">2-4</th>
            <th className="px-4 py-2 text-left">4-6</th>
            <th className="px-4 py-2 text-left">6-8</th>
            <th className="px-4 py-2 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.serial_number} className="hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap">{row.serial_number}</td>
              <td className="px-4 py-2 whitespace-nowrap">{row.model_type}</td>
              <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.date_record)}</td>
              <td className="px-4 py-2">{row.diff_cnt_8_10}</td>
              <td className="px-4 py-2">{row.diff_cnt_10_12}</td>
              <td className="px-4 py-2">{row.diff_cnt_12_14}</td>
              <td className="px-4 py-2">{row.diff_cnt_14_16}</td>
              <td className="px-4 py-2">{row.diff_cnt_16_18}</td>
              <td className="px-4 py-2">{row.diff_cnt_18_20}</td>
              <td className="px-4 py-2">{row.diff_cnt_20_22}</td>
              <td className="px-4 py-2">{row.diff_cnt_22_24}</td>
              <td className="px-4 py-2">{row.diff_cnt_24_2}</td>
              <td className="px-4 py-2">{row.diff_cnt_2_4}</td>
              <td className="px-4 py-2">{row.diff_cnt_4_6}</td>
              <td className="px-4 py-2">{row.diff_cnt_6_8}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => nav(`/detail/${row.serial_number}`)}
                  className="text-blue-600 hover:underline"
                >
                  详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
