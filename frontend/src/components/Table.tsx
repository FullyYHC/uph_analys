import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { UphAnalys } from '@/types/api'
import { useAnalysesStore } from '@/stores/analyses'
import BucketModal from '@/components/BucketModal'
import { analysesApi } from '@/utils/axios'
import { formatDateTime } from '@/utils/format'

interface Props {
  data: UphAnalys[]
}

export default function Table({ data }: Props) {
  const nav = useNavigate()
  const { sort_by, sort_dir, setSort, fetchList, page, size, filters } = useAnalysesStore()
  const [bucket, setBucket] = useState<{ serial: number; slot: string } | null>(null)
  const [flags, setFlags] = useState<Record<string, { red: boolean; yellow: boolean }>>({})
  const markFlag = (serial: number, slot: string, f: { lowPct: boolean; zeroPlan: boolean }) => {
    const key = `${serial}_${slot}`
    setFlags(prev => ({ ...prev, [key]: { red: !!f.lowPct, yellow: !!f.zeroPlan } }))
  }
  const isRed = (serial: number, slot: string, val: number) => {
    const key = `${serial}_${slot}`
    return val < 0 || !!flags[key]?.red
  }
  const isYellow = (serial: number, slot: string, row?: UphAnalys) => {
    const key = `${serial}_${slot}`
    const fromState = !!flags[key]?.yellow
    const fromRow = row?.pqtyZero ? !!row.pqtyZero[slot] : false
    return fromState || fromRow
  }
  const startIdx = (page - 1) * size
  
  const formatNum = (n: number) => n.toLocaleString()

  const sumDiffs = (row: UphAnalys) => {
    return (row.diff_cnt_8_10 || 0) +
      (row.diff_cnt_10_12 || 0) +
      (row.diff_cnt_12_14 || 0) +
      (row.diff_cnt_14_16 || 0) +
      (row.diff_cnt_16_18 || 0) +
      (row.diff_cnt_18_20 || 0) +
      (row.diff_cnt_20_22 || 0) +
      (row.diff_cnt_22_24 || 0) +
      (row.diff_cnt_24_2 || 0) +
      (row.diff_cnt_2_4 || 0) +
      (row.diff_cnt_4_6 || 0) +
      (row.diff_cnt_6_8 || 0)
  }

  useEffect(() => {
    const srcVal = (filters.source as 'cs'|'sz'|undefined)
    const ids = data.map(d => d.serial_number)
    if (!ids.length) return
    ;(async () => {
      try {
        const sources = srcVal ? [srcVal] : ['cs','sz']
        let combined: Record<number, Record<string, boolean>> = {}
        for (const s of sources) {
          const { data: z } = await analysesApi.pqtyZero(ids, s as 'cs'|'sz')
          combined = Object.keys(z).reduce((acc, idStr) => {
            const id = Number(idStr)
            acc[id] = acc[id] || {}
            const slots = z[id] || {}
            for (const k of Object.keys(slots)) acc[id][k] = acc[id][k] === undefined ? !!slots[k] : (!!acc[id][k] && !!slots[k])
            return acc
          }, combined)
        }
        setFlags(prev => {
          const next = { ...prev }
          for (const id of ids) {
            const slots = combined[id] || {}
            for (const k of Object.keys(slots)) {
              const key = `${id}_${k}`
              const old = next[key] || { red: false, yellow: false }
              next[key] = { red: old.red, yellow: !!slots[k] }
            }
          }
          return next
        })
      } catch {}
    })()
  }, [data, filters.source])

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
            <th className="px-4 py-2 text-left whitespace-nowrap">序号</th>
            <th className="whitespace-nowrap">{renderSort('serial_number', 'PlanID')}</th>
            <th className="whitespace-nowrap">{renderSort('model_type', '机型')}</th>
            <th className="whitespace-nowrap">{renderSort('lineName', '线别')}</th>
            <th className="whitespace-nowrap">{renderSort('lineModel', '设备类型')}</th>
            <th className="whitespace-nowrap">{renderSort('date_record', '计划时间')}</th>
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
            <th className="px-4 py-2 text-left">合计</th>
            <th className="px-4 py-2 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={`${row.serial_number}_${row.data_source||i}`} className="hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap">{startIdx + i + 1}</td>
              <td className="px-4 py-2 whitespace-nowrap">{row.serial_number}</td>
              <td className="px-4 py-2 whitespace-nowrap">{row.model_type}</td>
              <td className="px-4 py-2 whitespace-nowrap">{row.lineName ?? ''}</td>
              <td className="px-4 py-2 whitespace-nowrap">{row.lineModel ?? ''}</td>
              <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.date_record)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'8_10',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'8_10',row.diff_cnt_8_10)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '8_10' })}>{formatNum(row.diff_cnt_8_10)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'10_12',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'10_12',row.diff_cnt_10_12)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '10_12' })}>{formatNum(row.diff_cnt_10_12)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'12_14',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'12_14',row.diff_cnt_12_14)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '12_14' })}>{formatNum(row.diff_cnt_12_14)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'14_16',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'14_16',row.diff_cnt_14_16)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '14_16' })}>{formatNum(row.diff_cnt_14_16)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'16_18',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'16_18',row.diff_cnt_16_18)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '16_18' })}>{formatNum(row.diff_cnt_16_18)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'18_20',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'18_20',row.diff_cnt_18_20)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '18_20' })}>{formatNum(row.diff_cnt_18_20)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'20_22',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'20_22',row.diff_cnt_20_22)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '20_22' })}>{formatNum(row.diff_cnt_20_22)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'22_24',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'22_24',row.diff_cnt_22_24)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '22_24' })}>{formatNum(row.diff_cnt_22_24)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'24_2',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'24_2',row.diff_cnt_24_2)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '24_2' })}>{formatNum(row.diff_cnt_24_2)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'2_4',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'2_4',row.diff_cnt_2_4)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '2_4' })}>{formatNum(row.diff_cnt_2_4)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'4_6',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'4_6',row.diff_cnt_4_6)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '4_6' })}>{formatNum(row.diff_cnt_4_6)}</td>
              <td className={`px-4 py-2 cursor-pointer ${isYellow(row.serial_number,'6_8',row)?'bg-yellow-100':''} ${isRed(row.serial_number,'6_8',row.diff_cnt_6_8)?'text-red-600':''}`} onClick={() => setBucket({ serial: row.serial_number, slot: '6_8' })}>{formatNum(row.diff_cnt_6_8)}</td>
              <td className={`px-4 py-2 font-bold ${sumDiffs(row)<0?'text-red-600':''}`}>{formatNum(sumDiffs(row))}</td>
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
      {bucket && <BucketModal serial={bucket.serial} slot={bucket.slot} source={(filters.source as 'cs'|'sz'|undefined)} onClose={() => setBucket(null)} onFlag={(f)=> markFlag(bucket.serial, bucket.slot, f)} />}
    </div>
  )
}
