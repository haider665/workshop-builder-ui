export type CWShopType =
  | 'Auto'
  | 'Paint'
  | 'Body'
  | 'Quick Service'
  | 'Diagnostics'
  | 'Custom'

export type CWShopStatus = 'Active' | 'Inactive'

export type CWShop = {
  id: string
  name: string
  type: CWShopType
  description: string
  status: CWShopStatus
  createdAt: string
  updatedAt: string
}

export type CWBayStatus = 'Available' | 'Occupied' | 'Inactive'

export type CWBay = {
  id: string
  shopId: string
  name: string
  status: CWBayStatus
  createdAt: string
  updatedAt: string
}

export type CWRoleStatus = 'Active' | 'Inactive'

export type CWRole = {
  id: string
  name: string
  status: CWRoleStatus
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export type CWUserStatus = 'Active' | 'Inactive' | 'Suspended'

export type CWUser = {
  id: string
  fullName: string
  email: string
  mobile: string
  roleIds: string[]
  shopIds: string[]
  status: CWUserStatus
  password?: string
  createdAt: string
  updatedAt: string
}

export type CWTaskFieldType =
  | 'Text Input'
  | 'Text Area'
  | 'Number'
  | 'Checkbox'
  | 'Checkbox Group'
  | 'Radio Button Group'
  | 'Dropdown'
  | 'Date Picker'
  | 'Image Upload'
  | 'File Upload'

export type CWTaskField = {
  id: string
  label: string
  type: CWTaskFieldType
  required: boolean
  options?: string[]
  order: number
}

export type CWTaskTemplateStatus = 'Active' | 'Inactive'

export type CWTaskTemplate = {
  id: string
  shopId: string
  name: string
  description: string
  status: CWTaskTemplateStatus
  fields: CWTaskField[]
  createdAt: string
  updatedAt: string
}

export type CWF1Config = {
  returnWindowDays: number
  updatedAt: string
}

export type CWTaskStatus = 'Assigned' | 'In Progress' | 'Pending' | 'Completed'

export type CWTaskFieldValue = string | number | boolean | string[] | null

export type CWTask = {
  id: string
  shopId: string
  bayId?: string
  registrationNo?: string
  templateId: string
  templateName: string
  title: string
  assignedToName: string
  assignedToNames?: string[]
  assignedRoleId?: string
  status: CWTaskStatus
  pendingReason?: string
  plannedStartAt?: string
  plannedEndAt?: string
  dependsOnTaskIds?: string[]
  dependencyOverrideReason?: string
  /** ID of the appointment concern this task was created from (JC decomposition) */
  sourceConcernId?: string
  fields: CWTaskField[]
  createdAt: string
  updatedAt: string
}

export type CWTaskComment = {
  id: string
  taskId: string
  authorName: string
  message: string
  createdAt: string
}

export type CWTaskAttachment = {
  id: string
  taskId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export type CWCustomerStatus = 'Active' | 'Inactive'
export type CWCustomerType = 'Individual' | 'Corporate'

export type CWAddress = {
  division?: string
  city?: string
  postalCode?: string
  street?: string
}

export type CWOccupation = {
  type?: string
  companyName?: string
  designation?: string
}

export type CWCorporateInfo = {
  parentCompanyName?: string
  parentCompanyAddress?: CWAddress
  transportOfficerName?: string
  transportOfficerPhone?: string
  transportOfficerEmail?: string
  transportManagerName?: string
  transportManagerPhone?: string
  transportManagerEmail?: string
  note?: string
  socialMedia?: string
}

export type CWCustomer = {
  id: string
  fullName: string
  phone: string
  email?: string
  type?: CWCustomerType
  address?: CWAddress
  occupation?: CWOccupation
  // Driver info
  isSelfDriven?: boolean
  driverName?: string
  driverPhone?: string
  isPersonalUse?: boolean
  // Corporate
  corporate?: CWCorporateInfo
  // Socials
  whatsappLink?: string
  facebookLink?: string
  linkedinLink?: string
  googleLink?: string
  customerDocuments?: CWCustomerDocument[]
  status: CWCustomerStatus
  createdAt: string
  updatedAt: string
}

export type CWVehicleStatus = 'Active' | 'Inactive'
export type CWVehicleCategory = 'SUV' | 'Sedan' | 'Hatchback' | 'Pickup' | 'Van' | 'Truck' | 'Bus' | 'Other'
export type CWVehicleSize = 'Small' | 'Medium' | 'Large'

export type CWVehicle = {
  id: string
  customerId: string
  registrationNo: string
  make?: string
  model?: string
  vin?: string
  odometerKm?: number
  vehicleCategory?: CWVehicleCategory
  vehicleSize: CWVehicleSize
  modelYear?: number
  modelVariant?: string
  countryOfOrigin?: string
  countryOfAssembly?: string
  exteriorColor?: string
  exteriorColorCode?: string
  interiorColor?: string
  interiorColorCode?: string
  tyreSize?: string
  additionalNotes?: string
  vehicleDocuments?: CWGateVehicleDocument[]
  status: CWVehicleStatus
  createdAt: string
  updatedAt: string
}

export type CWVehicleOwnershipTransfer = {
  id: string
  vehicleId: string
  previousCustomerId: string
  newCustomerId: string
  effectiveDate: string
  reason: string
  proofFileUrl?: string
  notes?: string
  transferredByUserId: string
  transferredAt: string
}

export type CWPendingVehicleStatus = 'Pending' | 'Resolved' | 'Job Created'
export type CWIntakerType = 'Owner' | 'Driver' | 'Technician' | 'Other'
export type CWVehicleDocumentType = 'Registration Certificate' | 'Tax Token' | 'Fitness Certificate' | 'Insurance' | 'Route Permit' | 'Other'
export type CWDocumentVerificationStatus = 'Pending' | 'Verified' | 'Rejected'
export type CWCustomerDocumentType = 'National ID' | 'Driving License' | 'Passport' | 'Tax Identification' | 'Trade License' | 'Company Registration' | 'Other'

export type CWGateVehicleDocument = {
  id?: string
  documentType: CWVehicleDocumentType
  documentNumber?: string
  fileUrl: string
  verificationStatus: CWDocumentVerificationStatus
  verifiedByUserId?: string
  verifiedAt?: string
  verificationNote?: string
}

export type CWCustomerDocument = Omit<CWGateVehicleDocument, 'documentType'> & { documentType: CWCustomerDocumentType }

export type CWPendingVehicle = {
  id: string
  registrationNo: string
  customerId?: string
  vehicleId?: string
  appointmentId?: string
  intakerType?: CWIntakerType
  intakerName?: string
  intakerPhone?: string
  intakerPhotoUrl?: string
  drivingLicensePhotoUrl?: string
  vehicleDocuments?: CWGateVehicleDocument[]
  isTemporary?: boolean
  status: CWPendingVehicleStatus
  arrivedAt: string
  updatedAt: string
}

// ─── Concerns (Admin-managed) ────────────────────────────────────────────────

export type CWConcernCategoryStatus = 'Active' | 'Inactive'

export type CWConcernCategory = {
  id: string
  name: string
  shopId: string
  status: CWConcernCategoryStatus
  createdAt: string
  updatedAt: string
}

export type CWConcernStatus = 'Active' | 'Inactive'

export type CWConcern = {
  id: string
  categoryId: string
  code: string             // e.g. "CC-BRK-001"
  name: string
  sourceSystem?: string
  externalReference?: string
  processTimeMins?: number
  status: CWConcernStatus
  createdAt: string
  updatedAt: string
}

// ─── Services (Admin-managed, seeded from CSV) ────────────────────────────────

export type CWServiceStatus = 'Active' | 'Inactive'
export type CWServiceSeverity = 'Light' | 'Medium' | 'Severe'

// Admin-defined stage for a service (master data)
export type CWServiceStageDefinition = {
  id: string
  name: string             // "Disassembly", "Body Repair", or any custom name
  order: number            // sequential position (1, 2, 3...)
  durationMins: number     // estimated time
}

export type CWService = {
  id: string
  code: string
  category: string
  section?: string          // "Painting", "Body Repair", "Brakes", etc.
  description: string
  vehicleSize?: CWVehicleSize
  severity?: CWServiceSeverity  // Body/Paint only
  processTimeMins: number  // LTS (Auto) or TOTAL_STAGE_TIME (Body/Paint)
  ratePerHr?: number       // optional — not in client data
  price: number            // MRP
  shopId: string
  status: CWServiceStatus
  stages?: CWServiceStageDefinition[]  // admin-managed, any shop
  createdAt: string
  updatedAt: string
}

// ─── Per-technician assignment with timer ──────────────────────────────────────

export type CWTechnicianAssignmentStatus = 'Assigned' | 'In Progress' | 'Paused' | 'Completed'

export type CWTechnicianAssignment = {
  id: string
  technicianUserId: string
  status: CWTechnicianAssignmentStatus
  assignmentRemark?: string
  startedAt?: string
  pausedAt?: string
  completedAt?: string
  totalPausedMs: number
  notes?: string
}

// ─── Appointment concern / service line items ─────────────────────────────────

export type CWConcernWorkStatus = 'Pending' | 'In Progress' | 'Completed'

export type CWQCItemStatus = 'Passed' | 'Failed'

export type CWAppointmentConcernItem = {
  id: string
  concernId: string
  concernName: string
  remark: string
  // Process time in minutes (from concern definition)
  processTimeMins?: number
  diagnosisRemark?: string
  // Services linked to this concern
  serviceIds?: string[]
  // JC assigns SE + bay:
  assignedSEUserId?: string
  bayId?: string
  plannedStartAt?: string
  plannedEndAt?: string
  // SE assigns technicians:
  technicianAssignments: CWTechnicianAssignment[]
  workStatus?: CWConcernWorkStatus
  // QC verification:
  qcStatus?: CWQCItemStatus
  qcNote?: string
}

export type CWServiceWorkStatus = 'Pending' | 'In Progress' | 'Completed'

export type CWAppointmentServiceItem = {
  id: string
  serviceId: string
  serviceCode: string
  serviceDescription: string
  processTimeMins: number
  ratePerHr?: number
  price: number
  remark: string
  addedBySA: boolean
  // JC assigns SE + bay (used when NO stages):
  assignedSEUserId?: string
  bayId?: string
  // SE assigns technicians (used when NO stages):
  technicianAssignments: CWTechnicianAssignment[]
  workStatus?: CWServiceWorkStatus
  plannedStartAt?: string
  plannedEndAt?: string
  // Stage-level scheduling (when service has stages):
  stageItems?: CWAppointmentServiceStageItem[]
  // QC verification:
  qcStatus?: CWQCItemStatus
  qcNote?: string
}

// ─── Runtime stage instances (auto-populated from service stage definitions) ──

export type CWStageWorkStatus = 'Pending' | 'Scheduled' | 'In Progress' | 'Completed'

export type CWAppointmentServiceStageItem = {
  id: string
  stageDefinitionId: string    // links to CWServiceStageDefinition.id
  stageName: string
  stageOrder: number
  durationMins: number
  // JC assigns per stage (same flow as service-level):
  bayId?: string
  teamId?: string
  assignedSEUserId?: string
  plannedStartAt?: string
  plannedEndAt?: string
  // SE assigns technicians (same as current flow):
  technicianAssignments: CWTechnicianAssignment[]
  // Sequential dependency:
  dependsOnStageId?: string    // previous stage item's ID
  // Execution:
  workStatus: CWStageWorkStatus
  actualStartAt?: string
  actualEndAt?: string
}

export type CWWhatsappLog = {
  id: string
  sentAt: string
  direction: 'outbound' | 'inbound'
  authorName: string
  message: string
}

// ─── Inspection checklist (Health Check) ──────────────────────────────────────

export type CWInspectionCondition = 'Good' | 'Warning' | 'Bad'
export type CWInspectionResult = 'Pass' | 'Advisory' | 'Fail' | 'Not Applicable'
export type CWInspectionGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'
export type CWInspectionSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type CWInspectionUrgency = 'Immediate' | 'Within 7 Days' | 'Within 30 Days' | 'Monitor'

export type CWInspectionCheck = {
  id: string
  category: string        // 'System Component' | 'Scheduled Maintenance' | 'Tire/Brake Wire'
  section?: string        // e.g. 'Brake System', 'Left Front'
  label: string
  checked: boolean
  condition?: CWInspectionCondition
  remark?: string
  photoUrl?: string       // base64 data URL for MVP
  note?: string
  componentCode?: string
  zoneId?: string
  viewId?: string
  result?: CWInspectionResult
  conditionGrade?: CWInspectionGrade
  defectType?: string
  severity?: CWInspectionSeverity
  measurementValue?: number
  measurementUnit?: string
  minimumAllowed?: number
  maximumAllowed?: number
  recommendedValue?: string
  actionRequired?: string
  repairRecommendation?: string
  estimatedUrgency?: CWInspectionUrgency
  notApplicableReason?: string
  mediaUrls?: string[]
  inspectedByUserId?: string
  inspectedAt?: string
  linkedConcernItemId?: string
  linkedPartRequestIds?: string[]
}

// ─── Vehicle exterior/interior view checklists ────────────────────────────────

export type CWVehicleView = 'Front' | 'Right' | 'Left' | 'Rear' | 'Interior'

export type CWVehicleViewCheck = {
  id: string
  view: CWVehicleView
  label: string
  checked: boolean
  remark?: string
  photoUrl?: string
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export type CWTimelineEvent = {
  id: string
  timestamp: string
  actor: string
  action: string
  details?: string
}

// ─── 16-status workflow ───────────────────────────────────────────────────────

export type CWAppointmentStatus =
  | 'New'
  | 'SA Inspection'
  | 'SA Reviewed'
  | 'Customer Notified'
  | 'Customer Approved'
  | 'Customer Rejected'
  | 'Diagnosis Assigned'
  | 'Diagnosis In Progress'
  | 'Diagnosis Complete'
  | 'Service Approval Pending'
  | 'Service Approved'
  | 'Service Assigned'
  | 'Service In Progress'
  | 'Service Complete'
  | 'QC Assigned'
  | 'QC Approved'
  | 'QC Rejected'
  | 'Payment Pending'
  | 'Payment Done'
  | 'Released'

export type CWAppointmentPhoto = {
  side: string           // 'front' | 'rear' | 'left' | 'right'
  dataUrl: string        // base64 for MVP
}

export type CWAppointment = {
  id: string
  customerId: string
  vehicleId: string
  /** Legacy free-text concerns (kept for backward compat) */
  concerns: string
  notes: string
  slotDate?: string
  slotTime?: string
  scheduledAt?: string
  status: CWAppointmentStatus
  // CRO assigns SA
  assignedSAUserId?: string
  // SA assigns QC
  assignedQCUserId?: string
  qcRejectionNote?: string
  // SA inspection
  inspectionChecks: CWInspectionCheck[]
  vehicleViewChecks: CWVehicleViewCheck[]
  // SA photos & vehicle condition
  currentMileage?: number
  currentFuelLevel?: string
  photos: CWAppointmentPhoto[]
  // Structured concern/service items
  concernItems: CWAppointmentConcernItem[]
  serviceItems: CWAppointmentServiceItem[]
  // Customer approval (used for both approval rounds)
  customerApprovalStatus: 'Pending' | 'Approved' | 'Rejected'
  customerApprovalNote?: string
  whatsappLogs: CWWhatsappLog[]
  // Workflow timeline
  timeline: CWTimelineEvent[]
  // Gate entry link
  gateEntryId?: string
  // JC assignment
  assignedTeamId?: string
  // Payment & release
  paymentStatus: 'Pending' | 'Done'
  gatePassIssuedAt?: string
  releasedAt?: string
  createdAt: string
  updatedAt: string
}

export type CWJobStatus = 'Active' | 'Test Drive Approved' | 'Job Finished'

export type CWJob = {
  id: string
  registrationNo: string
  pendingVehicleId?: string
  appointmentId?: string
  shopIds: string[]
  taskIds: string[]
  status: CWJobStatus
  testDriveDriverName?: string
  testDriveDriverNid?: string
  testDriveExpectedReturnAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Teams (Admin-managed) ────────────────────────────────────────────────────

export type CWTeamStatus = 'Active' | 'Inactive'

export type CWTeam = {
  id: string
  name: string
  seUserId: string
  technicianUserIds: string[]
  status: CWTeamStatus
  createdAt: string
  updatedAt: string
}

// ─── Parts Division (Phase 2) ─────────────────────────────────────────────────

// ── Part Catalog ──────────────────────────────────────────────────────────────

export type CWPartStatus = 'Active' | 'Inactive'

export type CWPart = {
  id: string
  itemId?: string
  itemName?: string
  name: string
  partNumber: string
  description?: string
  category?: string                      // "Engine Parts", "Brake System", "Body Parts", etc.
  brand?: string                         // "Bosch", "Brembo", "Denso", etc.
  manufacturer?: string
  modelVariant?: string                  // "Sedan XLE", "SUV Sport", etc.
  modelYear?: string
  vehicleFitment?: string[]              // e.g. ["Toyota Corolla 2020"]
  alternatePartNumbers?: string[]        // supersession / interchangeability
  mediaUrls?: string[]
  rackLocation?: string                  // e.g. "A-3-14"
  binNumber?: string
  uom?: string
  purchaseCategory?: string
  salesDescription?: string
  purchaseDescription?: string
  isReturnable?: boolean
  isComboProduct?: boolean
  isSalesItem?: boolean
  isPurchaseItem?: boolean
  reorderLevel?: number                  // triggers procurement when stock ≤ this
  defaultSellPrice?: number              // default sell price (৳) for this part
  stockCount?: number                    // current unit count (denormalized for display)
  stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock'
  status: CWPartStatus
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  updatedByUserId?: string
}

// ── Stock Units ───────────────────────────────────────────────────────────────

export type CWStockUnitStatus =
  | 'Pending Procurement'
  | 'Available'
  | 'Reserved'
  | 'WIP'
  | 'Consumed'
  | 'Returned-Restockable'
  | 'Returned-Defective'
  | 'Vendor Claim'

export type CWPartStockUnit = {
  id: string
  partId: string
  quantity: number
  initialQuantity: number
  status: CWStockUnitStatus
  reservedForAppointmentId?: string
  reservedForVehicleId?: string
  costPrice: number
  sellPrice: number
  poId?: string
  poNumber?: string
  standardPurchaseOrderId?: string
  purchaseReceiptId?: string
  purchaseReceiptItemId?: string
  grnId?: string
  grnNumber?: string
  vendorId?: string
  vendorName?: string
  rackLocation?: string
  createdAt: string
  updatedAt: string
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export type CWVendorSourcingType = 'Local' | 'Foreign'
export type CWVendorStatus = 'Active' | 'Inactive'

export type CWVendor = {
  id: string
  name: string
  code: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  sourcingType: CWVendorSourcingType
  qualityRating: number                  // 0–100
  returnsHistory: number
  preferred: boolean
  status: CWVendorStatus
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  updatedByUserId?: string
}

export type CWPricingSourcingType = 'OEM' | 'Genuine' | 'Aftermarket'

export type CWVendorPartPrice = {
  id: string
  vendorId: string
  partId: string
  unitPrice: number
  currency: 'BDT' | 'USD' | 'EUR'
  leadTimeDays: number
  sourcingType: CWPricingSourcingType
  moq?: number
  lastUpdated: string
}

// ── Estimate Lines ────────────────────────────────────────────────────────────

export type CWEstimateLineStatus =
  | 'Requested'
  | 'Identified'
  | 'Priced'
  | 'Submitted'                          // 🔒 PRICE LOCKED
  | 'Approved'
  | 'Declined'
  | 'Fulfilled'
  | 'Substitution Required'

export type CWEstimateLineOption = {
  vendorId: string
  vendorName: string
  sourcingType: CWPricingSourcingType
  unitPrice: number
  sellPrice: number
}

export type CWEstimateLine = {
  id: string
  appointmentId: string
  concernItemId?: string
  // SE-provided
  description: string
  mediaUrls?: string[]
  requestedByUserId: string
  // Buyer-provided
  partId?: string
  partNumber?: string
  partName?: string
  // Pricing
  vendorId?: string
  unitPrice?: number
  sellPrice?: number
  quantity: number
  sourcingType?: CWPricingSourcingType
  currency?: 'BDT' | 'USD' | 'EUR'
  // Availability
  inStock: boolean
  estimatedDeliveryDate?: string
  advanceRequired: boolean
  // Options
  options?: CWEstimateLineOption[]
  // State
  status: CWEstimateLineStatus
  identifiedByUserId?: string
  pricedByUserId?: string
  submittedAt?: string
  submittedByUserId?: string
  approvedAt?: string
  approvedByUserId?: string
  declinedAt?: string
  materialRequestId?: string
  procurementCaseId?: string
  reservedQuantity?: number
  procureQuantity?: number
  fulfillmentStatus?: 'In Stock' | 'Partially Available' | 'Procurement Required' | 'Procurement Open' | 'Parts Available' | 'Operationally Fulfilled' | 'Integration Attention'
  integrationError?: string
  declinedByUserId?: string
  remarks?: string
  substitutedByLineId?: string
  createdAt: string
  updatedAt: string
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export type CWPurchaseOrderStatus =
  | 'Awaiting Advance'
  | 'Draft'
  | 'Pending Approval'
  | 'Issued'
  | 'Rejected'
  | 'In Transit'
  | 'Received'
  | 'Partially Received'
  | 'Closed'
  | 'Cancelled'

export type CWPOLine = {
  id: string
  partId: string
  partNumber: string
  partName: string
  quantity: number
  unitPrice: number
  discount?: number
  lineTotal: number
  receivedQty: number
  estimateLineId?: string
}

export type CWPurchaseOrder = {
  id: string
  poNumber: string
  vendorId: string
  status: CWPurchaseOrderStatus
  currency: 'BDT' | 'USD' | 'EUR'
  sourcingType: CWVendorSourcingType
  expectedArrivalDate: string
  totalAmount: number
  advanceRequired: boolean
  advanceConfirmedAt?: string
  advanceConfirmedByUserId?: string
  submittedAt?: string
  submittedByUserId?: string
  approvedAt?: string
  approvedByUserId?: string
  rejectedAt?: string
  rejectedByUserId?: string
  rejectionReason?: string
  blockedAppointmentIds: string[]
  lines: CWPOLine[]
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

// ── Goods Receipt Notes ───────────────────────────────────────────────────────

export type CWGRNLineCondition = 'Good' | 'Damaged' | 'Wrong Item'

export type CWGRNLine = {
  id: string
  poLineId: string
  partId: string
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  sellPrice: number
  condition: CWGRNLineCondition
  notes?: string
}

export type CWGoodsReceiptNote = {
  id: string
  grnNumber: string
  poId: string
  receivedByUserId: string
  receivedAt: string
  lines: CWGRNLine[]
  notes?: string
  discrepancyNotes?: string
  createdAt: string
}

// ── Requisitions ──────────────────────────────────────────────────────────────

export type CWRequisitionStatus =
  | 'Created'
  | 'Sent to Store'
  | 'Request Received'
  | 'Part Ready'
  | 'Partially Ready'
  | 'Picked'
  | 'Received'
  | 'Closed'
  | 'Return Raised'
  | 'Cancelled'

export type CWRequisitionLineStatus =
  | 'Pending'
  | 'Part Ready'
  | 'Picked'
  | 'Received'
  | 'Return Raised'
  | 'Closed'

export type CWRequisitionLine = {
  id: string
  partId: string
  partNumber: string
  partName: string
  quantity: number
  stockUnitIds: string[]
  rackLocation?: string
  bayId?: string
  serviceItemId?: string
  concernItemId?: string
  estimateLineId?: string
  status: CWRequisitionLineStatus
  pendingReason?: string                 // "procure" | "substitute"
}

export type CWRequisition = {
  id: string
  requisitionNumber: string
  appointmentId: string
  requestedByUserId: string
  urgencyNote?: string
  status: CWRequisitionStatus
  lines: CWRequisitionLine[]
  pickedByUserId?: string
  pickedAt?: string
  pickProofUrl?: string
  pickSignatureUrl?: string
  pickPhotoUrls?: string[]
  receivedByUserId?: string
  receivedAt?: string
  receiveProofUrl?: string
  receiveSignatureUrl?: string
  receivePhotoUrls?: string[]
  acknowledgedByUserId?: string
  acknowledgedAt?: string
  createdAt: string
  updatedAt: string
}

// ── Returns & RTV ─────────────────────────────────────────────────────────────

export type CWReturnReasonCode = 'Defective' | 'Wrong Part' | 'Not Used' | 'Excess'
export type CWReturnDisposition = 'Restockable' | 'Defective-RTV'
export type CWReturnStatus = 'Raised' | 'Received at Store' | 'Dispositioned' | 'Closed'

export type CWPartReturn = {
  id: string
  requisitionId: string
  requisitionLineId: string
  partId: string
  stockUnitId: string
  appointmentId: string
  reasonCode: CWReturnReasonCode
  photoUrl?: string
  raisedByUserId: string
  raisedAt: string
  returnProofUrl?: string
  receivedByUserId?: string
  receivedAt?: string
  receiveProofUrl?: string
  disposition?: CWReturnDisposition
  dispositionedByUserId?: string
  dispositionedAt?: string
  vendorClaimId?: string
  status: CWReturnStatus
  createdAt: string
  updatedAt: string
}

export type CWVendorClaimStatus = 'Open' | 'Resolved' | 'Rejected'
export type CWVendorClaimType = 'Replacement' | 'Credit'

export type CWVendorClaim = {
  id: string
  vendorId: string
  poId: string
  partId: string
  returnId: string
  claimType: CWVendorClaimType
  status: CWVendorClaimStatus
  createdAt: string
  resolvedAt?: string
}

// ── Part Requests (Legacy / Phase 1 compat) ───────────────────────────────────

export type CWPartRequestStatus = 'Requested' | 'Labeled' | 'Fulfilled' | 'Rejected'

export type CWPartRequest = {
  id: string
  appointmentId: string
  concernItemId?: string
  partName: string
  partNumber?: string
  price?: number
  quantity?: number
  deliveryDate?: string
  status: CWPartRequestStatus
  requestedBy: string
  labeledBy?: string
  estimatorRemarks?: string
  createdAt: string
  updatedAt: string
}

// ─── Call Detail Records (CRE) ────────────────────────────────────────────────

export type CWCallDirection = 'inbound' | 'outbound'

export type CWCallRecord = {
  id: string
  appointmentId?: string
  customerId?: string
  customerName: string
  direction: CWCallDirection
  durationSecs: number
  startedAt: string
  notes: string
  createdBy: string
}

// ─── Reminders / Follow-ups (CRE) ────────────────────────────────────────────

export type CWReminderStatus = 'Pending' | 'Sent' | 'Cancelled'
export type CWReminderType = 'follow-up' | 'reminder' | 'next-service'

export type CWReminder = {
  id: string
  appointmentId: string
  customerId: string
  customerName: string
  vehicleReg: string
  type: CWReminderType
  scheduledAt: string
  message: string
  status: CWReminderStatus
  sentAt?: string
  createdAt: string
}

/* ──────────────── Notification ──────────────────────────────────── */

export type CWNotificationCategory =
  | 'parts_request'
  | 'estimate'
  | 'purchase_order'
  | 'requisition'
  | 'grn'
  | 'return'
  | 'advance'
  | 'invoice'
  | 'general'

export type CWNotification = {
  id: string
  title: string
  message: string
  category: CWNotificationCategory
  /** The role(s) this notification targets */
  targetRoles: string[]
  /** Specific user ID if targeted to one person */
  targetUserId?: string
  /** Link to navigate to on click */
  actionUrl?: string
  /** Reference entity ID (e.g. PO id, requisition id) */
  referenceId?: string
  read: boolean
  createdByUserId?: string
  createdAt: string
}

/* ──────────────── Invoice (Parts Hook) ──────────────────────────── */

export type CWInvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Cancelled'

export type CWInvoiceLine = {
  id: string
  partId: string
  partNumber: string
  partName: string
  quantity: number
  unitPrice: number
  sellPrice: number
  lineTotal: number
  requisitionLineId?: string
}

export type CWInvoice = {
  id: string
  invoiceNumber: string
  appointmentId: string
  status: CWInvoiceStatus
  lines: CWInvoiceLine[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  advanceApplied: number
  netPayable: number
  issuedAt?: string
  issuedByUserId?: string
  paidAt?: string
  createdByUserId: string
  createdAt: string
  updatedAt: string
}
