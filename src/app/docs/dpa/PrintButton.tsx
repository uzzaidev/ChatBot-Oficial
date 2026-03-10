'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors print:hidden"
    >
      Imprimir / Salvar PDF
    </button>
  )
}
