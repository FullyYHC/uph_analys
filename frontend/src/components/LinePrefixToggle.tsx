type Val = 'ALL' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'O'

interface Props {
  value: Val
  onChange: (v: Val) => void
}

export default function LinePrefixToggle({ value, onChange }: Props) {
  const base = 'px-3 py-1 rounded-full border text-sm'
  const active = 'bg-blue-600 text-white border-blue-600'
  const inactive = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
  const items: Val[] = ['ALL','A','B','C','D','E','F','O']
  return (
    <div className="flex gap-2 items-center">
      {items.map(k => (
        <button key={k} className={`${base} ${value === k ? active : inactive}`} onClick={() => onChange(k)}>{k}</button>
      ))}
    </div>
  )
}
