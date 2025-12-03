interface Props {
  value: 'all' | 'sz' | 'hn'
  onChange: (v: 'all' | 'sz' | 'hn') => void
}

export default function SourceToggle({ value, onChange }: Props) {
  const base = 'px-4 py-2 rounded-full border transition-colors'
  const active = 'bg-blue-600 text-white border-blue-600'
  const inactive = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
  return (
    <div className="flex gap-3 items-center">
      <button className={`${base} ${value === 'all' ? active : inactive}`} onClick={() => onChange('all')}>全部</button>
      <button className={`${base} ${value === 'sz' ? active : inactive}`} onClick={() => onChange('sz')}>SZ</button>
      <button className={`${base} ${value === 'hn' ? active : inactive}`} onClick={() => onChange('hn')}>HN</button>
    </div>
  )
}
