import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ApiError, listLanguages, type Language } from './api/client'
import App from './App'
import CategoryEditor from './features/categories/CategoryEditor'
import CategoryListPage from './features/categories/CategoryListPage'
import ProductEditor from './features/products/ProductEditor'
import ProductListPage from './features/products/ProductListPage'

function CatalogRoutes() {
  const [languageCode, setLanguageCode] = useState('tr')
  const [languages, setLanguages] = useState<Language[]>([])
  const [languageError, setLanguageError] = useState('')

  useEffect(() => {
    let active = true
    listLanguages()
      .then((items) => {
        if (active) setLanguages(items)
      })
      .catch((reason: unknown) => {
        if (active) setLanguageError(ApiError.message(reason))
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <Routes>
      <Route element={<App />}>
        <Route index element={<Navigate to="/products" replace />} />
        <Route
          path="products"
          element={
            <CatalogContent error={languageError}>
              <ProductListPage languageCode={languageCode} languages={languages} onLanguageChange={setLanguageCode} />
            </CatalogContent>
          }
        />
        <Route path="products/new" element={<CatalogContent error={languageError}><ProductEditorRoute languageCode={languageCode} /></CatalogContent>} />
        <Route path="products/:id/edit" element={<CatalogContent error={languageError}><ProductEditorRoute languageCode={languageCode} /></CatalogContent>} />
        <Route
          path="categories"
          element={
            <CatalogContent error={languageError}>
              <CategoryListPage languageCode={languageCode} languages={languages} onLanguageChange={setLanguageCode} />
            </CatalogContent>
          }
        />
        <Route path="categories/new" element={<CatalogContent error={languageError}><CategoryEditorRoute /></CatalogContent>} />
        <Route path="categories/:id/edit" element={<CatalogContent error={languageError}><CategoryEditorRoute /></CatalogContent>} />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Route>
    </Routes>
  )
}

function CatalogContent({ error, children }: { error: string; children: ReactNode }) {
  return (
    <>
      {error && <div className="mb-7 rounded-lg border border-coral/35 bg-coral/10 px-4 py-3 text-sm" role="alert">{error}</div>}
      {children}
    </>
  )
}

function ProductEditorRoute({ languageCode }: { languageCode: string }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const productId = id === undefined ? undefined : Number(id)

  if (productId !== undefined && (!Number.isSafeInteger(productId) || productId < 1)) {
    return <Navigate to="/products" replace />
  }

  const returnToList = () => navigate('/products')
  return <ProductEditor id={productId} initialLanguage={languageCode} onCancel={returnToList} onSaved={returnToList} />
}

function CategoryEditorRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  const categoryId = id === undefined ? undefined : Number(id)

  if (categoryId !== undefined && (!Number.isSafeInteger(categoryId) || categoryId < 1)) {
    return <Navigate to="/categories" replace />
  }

  const returnToList = () => navigate('/categories')
  return <CategoryEditor id={categoryId} onCancel={returnToList} onSaved={returnToList} />
}

export default CatalogRoutes
