import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Shapes } from 'lucide-react'
import { ApiError, listCategories, type Category, type Language } from '../../api/client'

const languageNames: Record<string, string> = { tr: 'Türkçe', en: 'İngilizce', fr: 'Fransızca' }

export default function CategoryListPage({
  languageCode,
  languages,
  onLanguageChange,
}: Readonly<{
  languageCode: string
  languages: Language[]
  onLanguageChange: (languageCode: string) => void
}>) {
  const [result, setResult] = useState<{ languageCode: string; categories: Category[]; error: string } | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    listCategories(languageCode)
      .then((items) => {
        if (active) setResult({ languageCode, categories: items, error: '' })
      })
      .catch((reason: unknown) => {
        if (active) setResult({ languageCode, categories: [], error: ApiError.message(reason) })
      })
    return () => {
      active = false
    }
  }, [languageCode])

  const loading = result?.languageCode !== languageCode
  const categories = result?.languageCode === languageCode ? result.categories : []
  const error = result?.languageCode === languageCode ? result.error : ''
  const visibleCategories = categories.filter((category) =>
    `${category.code} ${category.name ?? ''} ${category.description ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  )
  const addCategory = () => navigate('/categories/new')
  const editCategory = (id: number) => navigate(`/categories/${id}/edit`)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">KATALOG / {languageCode.toUpperCase()}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">Kategoriler</h1>
          <p className="mt-2 text-sm text-muted">Desteklenen tüm dillerde çevrilen ortak kategori sınıflandırması.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            <span>Dil</span>
            <select className="field-compact min-w-32" value={languageCode} onChange={(event) => onLanguageChange(event.target.value)} aria-label="Liste dili">
              {languages.length
                ? languages.map((language) => <option key={language.code} value={language.code}>{languageNames[language.code] ?? language.displayName}</option>)
                : ['tr', 'en', 'fr'].map((code) => <option key={code} value={code}>{code.toUpperCase()}</option>)}
            </select>
          </label>
          <button className="button-primary" onClick={addCategory}><Plus size={17} /> Kategori ekle</button>
        </div>
      </div>
      {error && (
        <div className="mt-7 flex items-start justify-between gap-4 rounded-lg border border-coral/35 bg-coral/10 px-4 py-3 text-sm" role="alert">
          <span className="whitespace-pre-line">{error}</span>
          <button
            className="text-xs font-semibold uppercase text-coral"
            onClick={() => setResult((current) => current?.languageCode === languageCode ? { ...current, error: '' } : current)}
          >
            Kapat
          </button>
        </div>
      )}
      <section className="mt-8 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold">Kategori listesi</h2>
            <span className="rounded-full bg-mist px-2.5 py-1 font-mono text-xs text-muted">{categories.length.toString().padStart(2, '0')}</span>
          </div>
          <label className="relative block w-full md:w-64">
              <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                  className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Kayıtlarda ara"
                  aria-label="Kayıtlarda ara"
              />
          </label>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-muted">Kategoriler yükleniyor…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[700px]">
              <thead><tr><th>Kod</th><th>Kategori · {languageCode.toUpperCase()}</th><th>Açıklama</th><th>Çeviri</th><th><span className="sr-only">İşlemler</span></th></tr></thead>
              <tbody>
                {visibleCategories.map((category) => (
                  <CategoryRow key={category.id} category={category} onEdit={() => editCategory(category.id)} />
                ))}
              </tbody>
            </table>
            {visibleCategories.length === 0 && <EmptyState searching={search.length > 0} onAdd={addCategory} />}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted md:px-6">
          <span>Toplam {categories.length} kategori</span>
          <span>{languageCode.toUpperCase()} dilindeki içerik gösteriliyor</span>
        </div>
      </section>
    </>
  )
}

function CategoryRow({ category, onEdit }: Readonly<{ category: Category; onEdit: () => void }>) {
  return (
    <tr>
      <td><span className="font-mono text-xs font-medium text-ink">{category.code}</span></td>
      <td className="font-medium text-ink">{category.name || <Missing />}</td>
      <td><div className="max-w-lg truncate text-sm text-muted">{category.description || 'Açıklama yok'}</div></td>
      <td><TranslationStatus present={category.hasTranslation} /></td>
      <td><button className="button-quiet" onClick={onEdit}>Düzenle<span className="sr-only"> {category.code}</span></button></td>
    </tr>
  )
}

function TranslationStatus({ present }: { present: boolean }) {
  return present
    ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-forest"><span className="size-1.5 rounded-full bg-teal" /> Hazır</span>
    : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-coral"><span className="size-1.5 rounded-full bg-coral" /> Eksik</span>
}

function Missing() {
  return <span className="font-normal italic text-muted">Çevrilmedi</span>
}

function EmptyState({ searching, onAdd }: { searching: boolean; onAdd: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-mist text-forest"><Shapes size={21} /></div>
      <p className="mt-4 font-display text-lg font-semibold">{searching ? 'Eşleşen kayıt bulunamadı' : 'Henüz kategori yok'}</p>
      {!searching && <button className="mt-3 text-sm font-semibold text-forest underline decoration-teal decoration-2 underline-offset-4" onClick={onAdd}>İlk kategoriyi oluştur</button>}
    </div>
  )
}
