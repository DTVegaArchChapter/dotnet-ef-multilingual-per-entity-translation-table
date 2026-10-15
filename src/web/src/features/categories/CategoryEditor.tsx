import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { ApiError, getCategory, saveCategory, type CategoryTranslation } from '../../api/client'

const languageNames = { tr: 'Türkçe', en: 'İngilizce', fr: 'Fransızca' }
const languageOrder: Record<string, number> = { tr: 0, en: 1, fr: 2 }
const emptyTranslations = (): CategoryTranslation[] => ['tr', 'en', 'fr'].map((languageCode) => ({ languageCode, name: '', description: '' }))

export default function CategoryEditor({ id, onCancel, onSaved }: { id?: number; onCancel: () => void; onSaved: () => void }) {
  const [code, setCode] = useState('')
  const [translations, setTranslations] = useState(emptyTranslations)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(id !== undefined)

  useEffect(() => {
    if (!id) return
    let active = true
    getCategory(id).then((category) => {
      if (active) { setCode(category.code); setTranslations(category.translations) }
    }).catch((reason: unknown) => {
      if (active) setError(ApiError.message(reason))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id])

  const updateTranslation = (languageCode: string, field: 'name' | 'description', value: string) => {
    setTranslations((current) => current.map((translation) => translation.languageCode === languageCode ? { ...translation, [field]: value } : translation))
  }

  const orderedTranslations = [...translations].sort((a, b) => languageOrder[a.languageCode] - languageOrder[b.languageCode])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSaving(true)
    try { await saveCategory({ code: code.trim(), translations }, id); onSaved() }
    catch (reason) { setError(ApiError.message(reason)) }
    finally { setSaving(false) }
  }

  if (loading) return <p className="py-16 text-center text-sm text-muted">Kategori yükleniyor…</p>

  return (
    <form className="mx-auto max-w-4xl" onSubmit={submit}>
      <button type="button" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink" onClick={onCancel}><ArrowLeft size={16} /> Kategorilere dön</button>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">KATEGORİ / {id ? 'DÜZENLE' : 'YENİ'}</p><h1 className="mt-2 font-display text-4xl font-semibold">{id ? 'Kategoriyi düzenle' : 'Yeni kategori'}</h1><p className="mt-2 text-sm text-muted">Tüm çevirileriyle birlikte tek bir kategori tanımını yönetin.</p></div><button className="button-primary" type="submit" disabled={saving}><Check size={16} /> {saving ? 'Kaydediliyor…' : 'Kategoriyi kaydet'}</button></div>
      {error && <p className="mt-6 whitespace-pre-line rounded-lg border border-coral/30 bg-coral/10 px-4 py-3 text-sm" role="alert">{error}</p>}
      <section className="mt-8 rounded-xl border border-line bg-white p-5 shadow-sm md:p-7"><div className="max-w-sm"><label className="form-label" htmlFor="category-code">Kategori kodu</label><input className="field mt-2 font-mono" id="category-code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={40} required placeholder="örn. ses" /></div></section>
      <section className="mt-5 overflow-hidden rounded-xl border border-line bg-white shadow-sm" aria-label="Kategori çevirileri">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px] table-fixed">
            <colgroup><col className="w-36" />{orderedTranslations.map((translation) => <col key={translation.languageCode} className="w-64" />)}</colgroup>
            <thead><tr><th scope="col">Alan</th>{orderedTranslations.map((translation) => <th scope="col" key={translation.languageCode}><div className="flex items-center justify-between"><span>{languageNames[translation.languageCode as keyof typeof languageNames]}</span><span className="font-mono text-[11px]">{translation.languageCode.toUpperCase()}</span></div></th>)}</tr></thead>
            <tbody>
              <tr><th scope="row" className="text-xs font-semibold text-ink">Ad</th>{orderedTranslations.map((translation) => <td key={translation.languageCode}><label className="sr-only" htmlFor={`category-name-${translation.languageCode}`}>{languageNames[translation.languageCode as keyof typeof languageNames]} dilinde ad</label><input className="field" id={`category-name-${translation.languageCode}`} value={translation.name} onChange={(event) => updateTranslation(translation.languageCode, 'name', event.target.value)} maxLength={120} required /></td>)}</tr>
              <tr><th scope="row" className="text-xs font-semibold text-ink">Açıklama</th>{orderedTranslations.map((translation) => <td key={translation.languageCode}><label className="sr-only" htmlFor={`category-description-${translation.languageCode}`}>{languageNames[translation.languageCode as keyof typeof languageNames]} dilinde açıklama</label><textarea className="field min-h-24 resize-y" id={`category-description-${translation.languageCode}`} value={translation.description} onChange={(event) => updateTranslation(translation.languageCode, 'description', event.target.value)} maxLength={500} required /></td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-6 flex justify-end gap-3"><button type="button" className="button-secondary" onClick={onCancel}>İptal</button><button type="submit" className="button-primary" disabled={saving}><Check size={16} /> {saving ? 'Kaydediliyor…' : 'Kategoriyi kaydet'}</button></div>
    </form>
  )
}