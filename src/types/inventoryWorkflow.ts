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
  source: 'ERPNext' | 'CW Part'
}

export interface InventoryStockEntryItem {
  itemCode: string
  itemName: string
  qty: number
  uom: string | null
  fromWarehouse: string | null
  toWarehouse: string | null
  rate: number
  amount: number
}

export interface InventoryStockEntry {
  id: string
  company: string
  purpose: string
  postingDate: string | null
  fromWarehouse: string | null
  toWarehouse: string | null
  totalValue: number
  docstatus: number
  status: 'Draft' | 'Posted' | 'Cancelled' | string
  remarks: string
  items: InventoryStockEntryItem[]
}

export interface InventoryItemDetail {
  itemCode: string
  itemName: string
  uom: string | null
  isStockItem: boolean
  disabled: boolean
  valuationRate: number
}

export interface InventoryMovement {
  id: string
  postingDate: string | null
  postingTime: string | null
  itemCode: string
  warehouseId: string
  quantity: number
  balanceQty: number
  valuationRate: number
  valueDifference: number
  voucherType: string
  voucherId: string
}

export interface InventoryPermissions {
  canEdit: boolean
  canAdjustStock: boolean
}

export interface InventoryDetailResponse {
  position: InventoryPosition
  part: import('./cw').CWPart | null
  item: InventoryItemDetail | null
  movements: InventoryMovement[]
  permissions: InventoryPermissions
}

export interface UpdateInventoryInput {
  company?: string
  partId: string
  reason: string
  reorderLevel?: number
  rackLocation?: string
  binNumber?: string
  defaultSellPrice?: number
}

export interface AdjustStockInput {
  company?: string
  partId?: string
  itemCode?: string
  warehouseId: string
  quantity: number
  valuationRate?: number
  postingDate?: string
  reason: string
}

export interface AdjustStockResponse {
  movement: InventoryStockEntry
  position: InventoryPosition | null
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
