export type InventoryStockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

export interface InventoryPosition {
  partId: string | null
  itemId: string
  itemCode: string
  itemName: string
  partNumber: string | null
  warehouseId: string
  warehouseName: string
  onHand: number
  reserved: number
  available: number
  projected: number
  valuationRate: number
  stockValue: number
  reorderLevel: number
  stockStatus: InventoryStockStatus
  preferredVendorName: string | null
  source: 'ERPNext'
}

export interface InventoryListResponse {
  data: InventoryPosition[]
  meta: {
    page: number
    pageSize: number
    total: number
    warehouses: Array<{ id: string; name: string }>
  }
}
