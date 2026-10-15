import axios from 'axios'

const http = axios.create({ baseURL: '/api' })

export type Language = { code: string; displayName: string }
export type Category = { id: number; code: string; name: string | null; description: string | null; hasTranslation: boolean }
export type CategoryTranslation = { languageCode: string; name: string; description: string }
export type CategoryDetail = { id: number; code: string; translations: CategoryTranslation[] }
export type Product = { id: number; sku: string; price: number; categoryId: number; categoryCode: string; categoryName: string | null; name: string | null; description: string | null; hasTranslation: boolean }
export type CategoryInput = { code: string; translations: CategoryTranslation[] }
export type ProductInput = { sku: string; price: number; categoryId: number; languageCode: string; name: string; description: string }

type ProblemDetails = { title?: string; detail?: string; errors?: Record<string, string[]> }

export const ApiError = {
  message(reason: unknown) {
    if (axios.isAxiosError<ProblemDetails>(reason)) {
      const response = reason.response?.data
      const validationMessages = Object.entries(response?.errors ?? {})
        .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
      if (validationMessages.length > 0) return validationMessages.join('\n')
      return response?.detail ?? response?.title ?? reason.message
    }
    return reason instanceof Error ? reason.message : 'Beklenmeyen bir hata oluştu.'
  },
}

export async function listLanguages() { return (await http.get<Language[]>('/languages')).data }
export async function listCategories(languageCode: string) { return (await http.get<Category[]>('/categories', { params: { languageCode } })).data }
export async function getCategory(id: number) { return (await http.get<CategoryDetail>(`/categories/${id}`)).data }
export async function saveCategory(input: CategoryInput, id?: number) {
  if (id) return (await http.put<CategoryDetail>(`/categories/${id}`, input)).data
  return (await http.post<CategoryDetail>('/categories', input)).data
}
export async function listProducts(languageCode: string) { return (await http.get<Product[]>('/products', { params: { languageCode } })).data }
export async function getProduct(id: number, languageCode: string) { return (await http.get<Product>(`/products/${id}`, { params: { languageCode } })).data }
export async function saveProduct(input: ProductInput, id?: number) {
  if (id) return (await http.put<Product>(`/products/${id}`, input)).data
  return (await http.post<Product>('/products', input)).data
}