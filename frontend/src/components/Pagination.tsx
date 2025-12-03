interface Props {
  page: number
  size: number
  total: number
  onChange: (p: number) => void
  onSizeChange?: (s: number) => void
  sizes?: number[]
}

export default function Pagination({ page, size, total, onChange, onSizeChange, sizes = [10, 30, 50] }: Props) {
  const pages = Math.ceil(total / size)
  if (pages <= 1) return null

  return (
    <div className="flex items-center gap-2 mt-4">
      <button
        disabled={page === 1}
        onClick={() => onChange(1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        首页
      </button>
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        上一页
      </button>
      <span className="text-sm text-gray-600">
        {page} / {pages}
      </span>
      <button
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        下一页
      </button>
      <button
        disabled={page === pages}
        onClick={() => onChange(pages)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        末页
      </button>
      {onSizeChange && (
        <label className="ml-4 text-sm text-gray-700 flex items-center gap-2">
          每页
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            {sizes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
