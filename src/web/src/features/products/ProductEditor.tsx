import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Languages } from 'lucide-react'
import {
  ApiError,
  getProduct,
  listCategories,
  saveProduct,
  type Category,
  type ProductInput,
} from '../../api/client'

const languageOptions = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'İngilizce' },
  { code: 'fr', name: 'Fransızca' },
]

const emptyForm = (languageCode: string): ProductInput => ({
  sku: '',
  price: 0,
  categoryId: 0,
  languageCode,
  name: '',
  description: '',
})

export default function ProductEditor({
  id,
  initialLanguage,
  onCancel,
  onSaved,
}: {
  id?: number
  initialLanguage: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [languageCode, setLanguageCode] = useState(initialLanguage)
  const [form, setForm] = useState(() => emptyForm(initialLanguage))
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const categoryRequest = listCategories(languageCode)
    const productRequest = id ? getProduct(id, languageCode) : Promise.resolve(null)
    Promise.all([categoryRequest, productRequest]).then(([items, product]) => {
      if (!active) return
      setCategories(items)
      if (product) {
        setForm({
          sku: product.sku,
          price: product.price,
          categoryId: product.categoryId,
          languageCode,
          name: product.name ?? '',
          description: product.description ?? '',
        })
      } else {
        setForm((current) => ({
          ...current,
          languageCode,
          name: '',
          description: '',
        }))
      }
    })
      .catch((reason: unknown) => {
        if (active) setError(ApiError.message(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, languageCode])

  function change<K extends keyof ProductInput>(field: K, value: ProductInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveProduct({ ...form, languageCode, price: Number(form.price) }, id)
      onSaved()
    } catch (reason) {
      setError(ApiError.message(reason))
    } finally {
      setSaving(false)
    }
  }

  const chosenLanguage = languageOptions.find((language) => language.code === languageCode)

  return (
    <form className="mx-auto max-w-3xl" onSubmit={submit}>
      <button
        type="button"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
        onClick={onCancel}
      >
        <ArrowLeft size={16} /> Ürünlere dön
      </button>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">ÜRÜN / {id ? 'DÜZENLE' : 'YENİ'}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            {id ? 'Ürünü düzenle' : 'Yeni ürün'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ürün bilgileri ortaktır; ad ve açıklama dile göre kaydedilir.
          </p>
        </div>
        <button className="button-primary" type="submit" disabled={saving || loading}>
          <Check size={16} /> {saving ? 'Kaydediliyor…' : 'Ürünü kaydet'}
        </button>
      </div>
      {error && (
        <p
          className="mt-6 whitespace-pre-line rounded-lg border border-coral/30 bg-coral/10 px-4 py-3 text-sm"
          role="alert"
        >
          {error}
        </p>
      )}
      <section className="mt-8 rounded-xl border border-line bg-white p-5 shadow-sm md:p-7">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Ürün yükleniyor…</p>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="product-sku">SKU</label>
                <input
                  className="field mt-2 font-mono"
                  id="product-sku"
                  value={form.sku}
                  onChange={(event) => change('sku', event.target.value)}
                  maxLength={40}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="product-price">Fiyat (EUR)</label>
                <input
                  className="field mt-2"
                  id="product-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price || ''}
                  onChange={(event) => change('price', Number(event.target.value))}
                  required
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Languages size={17} className="text-forest" />
                    <h2 className="font-display text-lg font-semibold">Çeviri dili</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Aşağıdaki çevrilecek alanlar için dili seçin.
                  </p>
                </div>
                <select
                  className="field-compact min-w-40"
                  value={languageCode}
                  onChange={(event) => setLanguageCode(event.target.value)}
                  aria-label="Çeviri dili"
                >
                  {languageOptions.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label" htmlFor="product-category">Kategori</label>
                <select
                  className="field mt-2"
                  id="product-category"
                  value={form.categoryId || ''}
                  onChange={(event) => change('categoryId', Number(event.target.value))}
                  required
                >
                  <option value="" disabled>Kategori seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name || `[${category.code}] Çevrilmedi`} · {category.code}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="mt-2 text-xs text-coral">Ürün eklemeden önce bir kategori oluşturun.</p>
                )}
              </div>
            </div>
            <div className="mt-7 rounded-lg border border-line bg-[#fbfdfb] p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{chosenLanguage?.name} içeriği</h3>
                <span className="font-mono text-xs uppercase text-muted">{languageCode}</span>
              </div>
              <label className="form-label" htmlFor="product-name">Ad</label>
              <input
                className="field mt-2"
                id="product-name"
                value={form.name}
                onChange={(event) => change('name', event.target.value)}
                maxLength={160}
                required
              />
              <label className="form-label mt-5 block" htmlFor="product-description">Açıklama</label>
              <textarea
                className="field mt-2 min-h-32 resize-y"
                id="product-description"
                value={form.description}
                onChange={(event) => change('description', event.target.value)}
                maxLength={1000}
                required
              />
            </div>
          </>
        )}
      </section>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="button-secondary" onClick={onCancel}>İptal</button>
        <button type="submit" className="button-primary" disabled={saving || loading}>
          <Check size={16} /> {saving ? 'Kaydediliyor…' : 'Ürünü kaydet'}
        </button>
      </div>
    </form>
  )
}