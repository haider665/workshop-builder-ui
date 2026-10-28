import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  AccountBalance,
  AssignmentTurnedIn,
  Refresh,
  ShoppingCart,
} from "@mui/icons-material";
import { workshopApi } from "../../services/workshopApi";
import { useCompanyStore } from "../../store/companyStore";
import { colors, pageLayout, radii, shadows } from "../../theme/tokens";

type TabId =
  | "procurement"
  | "policy"
  | "requisitions"
  | "quotations"
  | "compare"
  | "orders"
  | "receipts"
  | "invoices"
  | "payments"
  | "journals"
  | "accounting";
type AccountingModule =
  | "requisitions"
  | "quotations"
  | "compare_sheets"
  | "purchase_orders"
  | "receipts"
  | "invoices"
  | "payments"
  | "journals";
type MasterOption = { id: string; label: string; secondary?: string };
type QuotationLineDraft = {
  key: string;
  itemCode: string;
  quantity: string;
  rate: string;
  description?: string;
  materialRequestId?: string;
  materialRequestItemId?: string;
  warehouse?: string;
};

const PROCUREMENT_DEMO_STEPS = [
  {
    title: "Part request from the floor",
    role: "SA / SE / Technician",
    required: "Appointment, vehicle, part, quantity, and reason",
    detail:
      "A part is requested against the appointment, vehicle, customer, concern, and quantity. The request remains traceable to the job.",
  },
  {
    title: "Store review",
    role: "Parts / Store Keeper",
    required: "Stock and FIFO availability decision",
    detail:
      "The store checks available stock and FIFO stock units. If the part is available, it returns to Counter Desk; if there is a shortage, procurement demand is opened.",
  },
  {
    title: "Quotation collection",
    role: "Procurement",
    required: "At least one supplier quotation",
    detail:
      "Procurement collects supplier quotations against the requisition. Supplier, price, delivery date, tax, currency, and commercial terms are recorded.",
  },
  {
    title: "Comparative Statement",
    role: "Procurement",
    required: "Quotation comparison and recommendation",
    detail:
      "The quotations are compared in a controlled Compare Statement. The recommended supplier and commercial justification are recorded.",
  },
  {
    title: "Audit verification",
    role: "Audit",
    required: "Compare sheet and supporting documents verified",
    detail:
      "Audit verifies the quotations, comparative statement, supplier information, pricing, tax, and supporting documents before any approval is requested.",
  },
  {
    title: "Approval",
    role: "GM / ED / MD / Chairman",
    required: "Policy threshold and authorized approver",
    detail:
      "After audit verification, the configured company policy routes the case to GM or escalates it to ED, MD, or Chairman. Thresholds and escalation are evaluated server-side.",
  },
  {
    title: "Purchase Order and supplier confirmation",
    role: "Procurement",
    required: "Approved supplier, ETA, tax, terms, advance instruction",
    detail:
      "The approved supplier becomes the Purchase Order supplier. ETA, advance instruction, VAT, tax, terms, and delivery conditions are captured.",
  },
  {
    title: "Supplier confirmation",
    role: "Procurement",
    required: "Supplier acceptance and delivery commitment",
    detail:
      "Procurement records supplier confirmation, agreed ETA, payment terms, and any advance or shipment instructions against the purchase order.",
  },
  {
    title: "GRN and inventory",
    role: "Store Keeper / Procurement",
    required: "Physical verification and received quantity",
    detail:
      "The store physically verifies the delivery and submits the GRN. Inventory is increased using FIFO-aware stock records and the procurement case is updated.",
  },
  {
    title: "Physical audit review",
    role: "Audit / Store Keeper",
    required: "Received quantity and supporting delivery documents",
    detail:
      "Audit reviews the physical receipt and supporting documents. Store remains responsible for the actual receipt and inventory update.",
  },
  {
    title: "Procurement file completion",
    role: "Procurement",
    required: "Complete PO, GRN, invoice, and attachments",
    detail:
      "Procurement completes the commercial file so every quotation, approval, purchase order, receipt, invoice, and attachment is available for review and printing.",
  },
  {
    title: "Audit clearance",
    role: "Audit",
    required: "Completed procurement file cleared",
    detail:
      "Audit clears the completed procurement file before the accounting team posts and settles the supplier liability.",
  },
  {
    title: "Actual accounts",
    role: "Accounts",
    required: "Supplier invoice checked and posted",
    detail:
      "Accounts verifies the supplier invoice and posts the payable using the linked receipt and approved purchase order.",
  },
  {
    title: "Reconciliation",
    role: "Accounts Manager",
    required: "Payment and ledger reconciliation",
    detail:
      "The Accounts Manager confirms the payment allocation and reconciliation against the supplier invoice and company ledger.",
  },
  {
    title: "Bill settlement",
    role: "Accounts",
    required: "Payment entry and authentic reference",
    detail:
      "Accounts records the Payment Entry with the bank or transaction reference and settles the outstanding supplier balance.",
  },
  {
    title: "Paid / Closed",
    role: "Procurement / Accounts",
    required: "All gates complete and audit history retained",
    detail:
      "The case is closed only after receipt, accounting, reconciliation, and settlement are complete. The full printable file remains linked to the appointment.",
  },
];

const PROCUREMENT_DEMO_DATA = {
  case: {
    id: "DEMO-PROC-0001",
    title: "Nissan X-Trail · Front brake pad set",
    stage: "Requested",
    currentStage: "Requested",
    status: "Open",
    owner: "parts@continental-works.com",
    currentOwnerRole: "Parts / Store Keeper",
    sourceName: "Appointment APPT-DEMO-0001",
    approvalAmount: 128000,
    updatedAt: "2026-10-18 10:30:00",
  },
  documents: {
    requisitions: [
      {
        id: "DEMO-MR-0001",
        name: "DEMO-MR-0001",
        status: "Submitted",
        itemName: "Front Brake Pad Set",
        itemCode: "CW-PART-BRAKE-001",
        qty: 1,
        company: "Continental Works",
        source: "APPT-DEMO-0001",
      },
    ],
    quotations: [
      {
        id: "DEMO-QTN-0001",
        name: "DEMO-QTN-0001",
        status: "Submitted",
        supplierName: "Continental Auto Parts Ltd.",
        supplierId: "SUP-CW-001",
        totalAmount: 128000,
        company: "Continental Works",
      },
      {
        id: "DEMO-QTN-0002",
        name: "DEMO-QTN-0002",
        status: "Submitted",
        supplierName: "Dhaka Motor Components",
        supplierId: "SUP-CW-002",
        totalAmount: 135000,
        company: "Continental Works",
      },
    ],
    compare_sheets: [
      {
        id: "DEMO-CS-0001",
        name: "DEMO-CS-0001",
        status: "Approved",
        supplierName: "Continental Auto Parts Ltd.",
        totalAmount: 128000,
        company: "Continental Works",
        recommendation: "Lowest compliant quotation; ETA 3 working days",
      },
    ],
    purchase_orders: [
      {
        id: "DEMO-PO-0001",
        name: "DEMO-PO-0001",
        status: "Submitted",
        supplierName: "Continental Auto Parts Ltd.",
        grandTotal: 128000,
        company: "Continental Works",
        eta: "2026-10-21",
      },
    ],
    receipts: [
      {
        id: "DEMO-GRN-0001",
        name: "DEMO-GRN-0001",
        status: "Submitted",
        supplierName: "Continental Auto Parts Ltd.",
        total: 128000,
        company: "Continental Works",
        receivedBy: "Store Keeper",
      },
    ],
    invoices: [
      {
        id: "DEMO-PINV-0001",
        name: "DEMO-PINV-0001",
        status: "Submitted",
        supplierName: "Continental Auto Parts Ltd.",
        grandTotal: 128000,
        company: "Continental Works",
      },
    ],
    payments: [
      {
        id: "DEMO-PAY-0001",
        name: "DEMO-PAY-0001",
        status: "Paid",
        partyName: "Continental Auto Parts Ltd.",
        paidAmount: 128000,
        company: "Continental Works",
        modeOfPayment: "Bank Transfer",
      },
    ],
    journals: [],
  },
};

const DEMO_ACTION_CHAIN = [
  {
    action: "store_review",
    label: "Complete store review",
    toStage: "Procurement Review",
    owner: "Parts / Store Keeper",
  },
  {
    action: "open_quotation_collection",
    label: "Start quotation collection",
    toStage: "Quotation Collection",
    owner: "Procurement",
  },
  {
    action: "prepare_compare",
    label: "Prepare comparative statement",
    toStage: "Compare Sheet Preparation",
    owner: "Procurement",
  },
  {
    action: "submit_audit_verification",
    label: "Submit for audit verification",
    toStage: "Audit Verification",
    owner: "Audit",
  },
  {
    action: "complete_audit_verification",
    label: "Complete audit verification",
    toStage: "GM Approval",
    owner: "GM - Operations",
  },
  {
    action: "complete_gm_approval",
    label: "Approve as GM",
    toStage: "Management Approval",
    owner: "ED / MD / Chairman",
  },
  {
    action: "complete_management_approval",
    label: "Complete management approval",
    toStage: "PO Creation",
    owner: "Procurement",
  },
  {
    action: "create_purchase_order",
    label: "Create purchase order",
    toStage: "Supplier Confirmation",
    owner: "Procurement",
  },
  {
    action: "confirm_supplier",
    label: "Confirm supplier and ETA",
    toStage: "Chalan / GRN",
    owner: "Store Keeper / Procurement",
  },
  {
    action: "submit_grn",
    label: "Submit GRN and update stock",
    toStage: "Actual Accounts",
    owner: "Accounts",
  },
  {
    action: "post_supplier_invoice",
    label: "Post supplier invoice",
    toStage: "Bill Settlement",
    owner: "Accounts",
  },
  {
    action: "settle_payment",
    label: "Settle payment",
    toStage: "Paid / Closed",
    owner: "Accounts",
  },
];

const PROCESS_PRINT_MODULES: Array<AccountingModule | null> = [
  null,
  "requisitions",
  "quotations",
  "compare_sheets",
  "compare_sheets",
  "compare_sheets",
  "compare_sheets",
  "purchase_orders",
  "purchase_orders",
  "receipts",
  "receipts",
  "invoices",
  "invoices",
  "invoices",
  "payments",
  "payments",
  "payments",
];

function demoActionsForStage(stage: string) {
  const stages = [
    "Requested",
    "Procurement Review",
    "Quotation Collection",
    "Compare Sheet Preparation",
    "Audit Verification",
    "GM Approval",
    "Management Approval",
    "PO Creation",
    "Supplier Confirmation",
    "Chalan / GRN",
    "Actual Accounts",
    "Bill Settlement",
  ];
  const next = DEMO_ACTION_CHAIN[stages.indexOf(stage)];
  if (!next) return [];
  return [
    { ...next, allowed: true, requiresReason: false, disabledReason: null },
  ];
}

const cardSx = {
  background: colors.bg.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: radii.lg,
  boxShadow: shadows.card,
  p: 2.5,
} as const;

function statusColor(
  status?: string,
): "default" | "success" | "warning" | "error" | "info" {
  const value = (status || "").toLowerCase();
  if (
    value.includes("approved") ||
    value.includes("paid") ||
    value.includes("complete")
  )
    return "success";
  if (value.includes("reject") || value.includes("cancel")) return "error";
  if (
    value.includes("pending") ||
    value.includes("review") ||
    value.includes("draft")
  )
    return "warning";
  return "info";
}

export function FinanceWorkspacePage({
  initialTab = "procurement",
  workspace = "procurement",
}: {
  initialTab?: TabId;
  workspace?: "procurement" | "accounting";
}) {
  const { selectedCompanyId, companies } = useCompanyStore();
  const company = companies.find((item) => item.id === selectedCompanyId);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [dashboard, setDashboard] = useState<{
    counts: Record<string, number>;
    attention?: Array<{
      id: string;
      title: string;
      count: number;
      route?: string;
      severity?: string;
      description?: string;
    }>;
  } | null>(null);
  const [cases, setCases] = useState<
    Array<{
      id: string;
      title?: string;
      stage?: string;
      status?: string;
      owner?: string;
      updatedAt?: string;
      approvalAmount?: number;
      slaDueAt?: string;
      currentOwnerRole?: string;
      sourceName?: string;
      requestContext?: {
        request?: string;
        partName?: string;
        partNumber?: string;
        quantity?: number;
        requestedByName?: string;
        partCount?: number;
        parts?: Array<{
          id?: string;
          partName?: string;
          partNumber?: string;
          quantity?: number;
          status?: string;
          requestedByName?: string;
          requestedAt?: string;
          deliveryDate?: string;
        }>;
        appointment?: { id?: string; scheduledAt?: string; status?: string };
        customer?: { name?: string; phone?: string };
        vehicle?: { registrationNo?: string; vin?: string; make?: string; model?: string; modelVariant?: string };
        concern?: { name?: string; remark?: string } | null;
      } | null;
    }>
  >([]);
  const [inbox, setInbox] = useState<
    Array<{
      id: string;
      title?: string;
      stage?: string;
      status?: string;
      owner?: string;
      updatedAt?: string;
      checklist?: Array<{ label?: string; ready?: boolean }>;
    }>
  >([]);
  const [clearances, setClearances] = useState<
    Array<{
      id: string;
      type?: string;
      status?: string;
      appointmentId?: string;
      requestedAmount?: number;
      outstandingAmount?: number;
      requestedByUserId?: string;
      requestedAt?: string;
      reviewedByUserId?: string;
      reviewedAt?: string;
      reviewNote?: string;
    }>
  >([]);
  const [documents, setDocuments] = useState<
    Record<AccountingModule, Array<Record<string, unknown>>>
  >({
    requisitions: [],
    quotations: [],
    compare_sheets: [],
    purchase_orders: [],
    receipts: [],
    invoices: [],
    payments: [],
    journals: [],
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [selectedModule, setSelectedModule] = useState<AccountingModule | null>(
    null,
  );
  const [selectedCase, setSelectedCase] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [documentsDrawerOpen, setDocumentsDrawerOpen] = useState(false);
  const [processBoardOpen, setProcessBoardOpen] = useState(false);
  const [appointmentContextOpen, setAppointmentContextOpen] = useState(true);
  const [selectedProcessStep, setSelectedProcessStep] = useState(0);
  const [caseActions, setCaseActions] = useState<
    Array<{
      action: string;
      label: string;
      allowed: boolean;
      requiresReason: boolean;
      disabledReason?: string | null;
      toStage: string;
    }>
  >([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createItemCode, setCreateItemCode] = useState("");
  const [createSupplier, setCreateSupplier] = useState("");
  const [createQty, setCreateQty] = useState("1");
  const [createRate, setCreateRate] = useState("0");
  const [createRemarks, setCreateRemarks] = useState("");
  const [createMaterialRequestId, setCreateMaterialRequestId] = useState("");
  const [quotationLines, setQuotationLines] = useState<QuotationLineDraft[]>([]);
  const [createBusy, setCreateBusy] = useState(false);
  const [itemOptions, setItemOptions] = useState<MasterOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<MasterOption[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [accountOptions, setAccountOptions] = useState<MasterOption[]>([]);
  const [modeOptions, setModeOptions] = useState<MasterOption[]>([]);
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentParty, setPaymentParty] = useState("");
  const [paymentFrom, setPaymentFrom] = useState("");
  const [paymentTo, setPaymentTo] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [createFromOpen, setCreateFromOpen] = useState(false);
  const [createFromModule, setCreateFromModule] = useState<
    "orders" | "receipts" | "invoices" | null
  >(null);
  const [createFromId, setCreateFromId] = useState("");
  const [printPreview, setPrintPreview] = useState<{
    title: string;
    documentId: string;
    module: AccountingModule | "appointment" | null;
  } | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoDataLoaded, setDemoDataLoaded] = useState(false);
  const [storeReviewStatus, setStoreReviewStatus] = useState<"Stock Available" | "Local Shortage" | "Foreign Required">("Local Shortage");
  const [storeProcurementType, setStoreProcurementType] = useState<"Local" | "Foreign">("Local");
  const [storeVendorRoute, setStoreVendorRoute] = useState<"Enlisted Vendor" | "Non-enlisted Vendor" | "Single Vendor">("Enlisted Vendor");
  const [storeReviewNote, setStoreReviewNote] = useState("");
  const [storePartReviews, setStorePartReviews] = useState<Record<string, { status: "Stock Available" | "Local Shortage" | "Foreign Required"; procurementType: "Local" | "Foreign"; note: string; stockAvailable: number }>>({});
  const [foreignCustomerConfirmation, setForeignCustomerConfirmation] = useState<"Not Required" | "Pending" | "Confirmed" | "Rejected">("Pending");
  const [foreignAdvanceStatus, setForeignAdvanceStatus] = useState<"Not Required" | "Pending" | "Confirmed" | "Partially Paid" | "Paid">("Pending");
  const [foreignAdvanceAmount, setForeignAdvanceAmount] = useState("");
  const [foreignShipmentEta, setForeignShipmentEta] = useState("");
  const [foreignNote, setForeignNote] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [estimateLineId, setEstimateLineId] = useState("");
  const [estimateStatus, setEstimateStatus] = useState("Requested");
  const [estimateDescription, setEstimateDescription] = useState("");
  const [estimatePart, setEstimatePart] = useState<MasterOption | null>(null);
  const [estimatePartOptions, setEstimatePartOptions] = useState<MasterOption[]>([]);
  const [estimatePartNumber, setEstimatePartNumber] = useState("");
  const [estimatePartName, setEstimatePartName] = useState("");
  const [estimateQuantity, setEstimateQuantity] = useState("1");
  const [estimateSellPrice, setEstimateSellPrice] = useState("0");
  const [estimateDeliveryDate, setEstimateDeliveryDate] = useState("");
  const [estimateSourcingType, setEstimateSourcingType] = useState<"OEM" | "Genuine" | "Aftermarket">("Genuine");
  const [estimateRemarks, setEstimateRemarks] = useState("");

  function loadDemoData() {
    setDemoDataLoaded(true);
    setTab("procurement");
    setQuery("");
    setCases([PROCUREMENT_DEMO_DATA.case]);
    setInbox([
      {
        id: "DEMO-TASK-0001",
        title: "Complete supplier payment settlement",
        stage: "Bill Settlement",
        status: "Open",
        owner: "Accounts",
        updatedAt: PROCUREMENT_DEMO_DATA.case.updatedAt,
      },
    ]);
    setClearances([]);
    setDocuments(
      PROCUREMENT_DEMO_DATA.documents as Record<
        AccountingModule,
        Array<Record<string, unknown>>
      >,
    );
    setItemOptions([
      {
        id: "CW-PART-BRAKE-001",
        label: "Front Brake Pad Set",
        secondary: "Workshop Parts",
      },
    ]);
    setSupplierOptions([
      {
        id: "DEMO-SUPPLIER-A",
        label: "Demo Parts Supplier",
        secondary: "Enlisted vendor",
      },
      {
        id: "DEMO-SUPPLIER-B",
        label: "Demo Auto Components",
        secondary: "Non-enlisted vendor",
      },
    ]);
    setDashboard({
      counts: {
        openCases: 1,
        requisitions: 1,
        quotations: 2,
        outstandingPayments: 128000,
      },
      attention: [
        {
          id: "demo-payment",
          title: "Payment settlement",
          count: 1,
          description:
            "Complete the final payment step in the demonstration case.",
        },
      ],
    });
    setCaseActions(demoActionsForStage("Requested"));
    setSelectedCase(PROCUREMENT_DEMO_DATA.case);
    setSelectedRecord(null);
  }

  async function openDocument(
    module: AccountingModule,
    row: Record<string, unknown>,
  ) {
    const id = String(row.name || row.id || "");
    if (!id) return;
    setSelectedRecord(row);
    setSelectedModule(module);
    setDetailLoading(true);
    try {
      const detail = await workshopApi.accountingGet(module, id);
      setSelectedRecord(detail);
    } catch {
      // The list DTO is still useful when a legacy document cannot be read.
    } finally {
      setDetailLoading(false);
    }
  }

  async function openCase(id: string) {
    setSelectedCase({ id });
    setCaseActions([]);
    setDetailLoading(true);
    if (demoDataLoaded && id === PROCUREMENT_DEMO_DATA.case.id) {
      setSelectedCase(PROCUREMENT_DEMO_DATA.case);
      setCaseActions(
        demoActionsForStage(
          String(PROCUREMENT_DEMO_DATA.case.currentStage || "Requested"),
        ),
      );
      setDetailLoading(false);
      return;
    }
    try {
      const [detail, available] = await Promise.all([
        workshopApi.procurementCase(id),
        workshopApi.procurementCaseActions(id),
      ]);
      setSelectedCase(detail);
      setCaseActions(available.actions || []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load procurement case",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedCase) return;
    const value = selectedCase as Record<string, unknown>;
    setStoreReviewStatus((value.storeReviewStatus as typeof storeReviewStatus) || "Local Shortage");
    setStoreProcurementType((value.procurementType as typeof storeProcurementType) || "Local");
    setStoreVendorRoute((value.vendorRoute as typeof storeVendorRoute) || "Enlisted Vendor");
    setStoreReviewNote(String(value.storeReviewNote || ""));
    const context = value.requestContext as { parts?: Array<Record<string, unknown>> } | null;
    if (context?.parts?.length) {
      setStorePartReviews(Object.fromEntries(context.parts.map((part, index) => {
        const id = String(part.id || part.partRequestId || index);
        const status = String(part.storeReviewStatus || "") as "Stock Available" | "Local Shortage" | "Foreign Required";
        const procurementType = String(part.procurementType || "") as "Local" | "Foreign";
        return [id, {
          status: ["Stock Available", "Local Shortage", "Foreign Required"].includes(status) ? status : "Local Shortage",
          procurementType: procurementType === "Foreign" ? "Foreign" : "Local",
          note: String(part.storeReviewNote || ""),
          stockAvailable: Number(part.stockAvailable || 0),
        }];
      })));
    } else {
      setStorePartReviews({});
    }
    setForeignCustomerConfirmation((value.foreignCustomerConfirmation as typeof foreignCustomerConfirmation) || "Pending");
    setForeignAdvanceStatus((value.foreignAdvanceStatus as typeof foreignAdvanceStatus) || "Pending");
    setForeignAdvanceAmount(value.foreignAdvanceAmount ? String(value.foreignAdvanceAmount) : "");
    setForeignShipmentEta(String(value.foreignShipmentEta || ""));
    setForeignNote("");
    setEstimateLineId(String(value.estimateLineId || ""));
    setEstimateStatus(String(value.estimateStatus || "Requested"));
    setEstimateDescription(String(value.partName || value.caseTitle || ""));
    setEstimatePartNumber(String(value.partNumber || ""));
    setEstimatePartName(String(value.partName || ""));
    setEstimateQuantity(String(value.quantity || 1));
    setEstimateSellPrice(String(value.sellPrice || value.approvalAmount || 0));
    setEstimateDeliveryDate(String(value.estimatedDeliveryDate || ""));
    setEstimateRemarks("");
  }, [selectedCase]);

  useEffect(() => {
    if (!selectedCase?.id || demoDataLoaded) return;
    let active = true;
    const caseValue = selectedCase as Record<string, unknown>;
    Promise.all([
      caseValue.partRequestId ? workshopApi.getPartRequest(String(caseValue.partRequestId)).catch(() => null) : Promise.resolve(null),
      caseValue.appointmentId ? workshopApi.listEstimateLines({ appointmentId: String(caseValue.appointmentId), pageSize: 100 }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      workshopApi.listParts({ status: "Active", pageSize: 100 }).catch(() => ({ data: [] })),
    ]).then(([partRequest, lines, parts]) => {
      if (!active) return;
      const request = partRequest as Record<string, unknown> | null;
      if (request) {
        setEstimateDescription(String(request.partName || ""));
        setEstimatePartNumber(String(request.partNumber || ""));
        setEstimatePartName(String(request.partName || ""));
        setEstimateQuantity(String(request.quantity || 1));
      }
      const line = (lines.data || []).find((item) => {
        const candidate = item as typeof item & { partRequestId?: string };
        return String(candidate.id) === String(caseValue.estimateLineId || "") || String(candidate.partRequestId || "") === String(caseValue.partRequestId || "");
      });
      if (line) {
        setEstimateLineId(String(line.id));
        setEstimateStatus(String(line.status || "Requested"));
        setEstimateDescription(String(line.description || ""));
        setEstimatePartNumber(String(line.partNumber || ""));
        setEstimatePartName(String(line.partName || ""));
        setEstimateQuantity(String(line.quantity || 1));
        setEstimateSellPrice(String(line.sellPrice || 0));
        setEstimateDeliveryDate(String(line.estimatedDeliveryDate || ""));
        setEstimateSourcingType((line.sourcingType as typeof estimateSourcingType) || "Genuine");
        setSelectedCase((current) => current ? { ...current, estimateLineId: line.id, estimateStatus: line.status, partRequestId: (line as typeof line & { partRequestId?: string }).partRequestId || caseValue.partRequestId } : current);
      }
      const options = (parts.data || []).map((part) => ({ id: part.id, label: `${part.partNumber} · ${part.name}`, secondary: part.description || part.brand }));
      setEstimatePartOptions(options);
      const selectedPartId = line?.partId;
      if (selectedPartId) setEstimatePart(options.find((option) => option.id === selectedPartId) || null);
    });
    return () => { active = false; };
  // Deliberately key this hydration to the case id; updating the linked estimate
  // on selectedCase must not recursively restart the same requests.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCase?.id, demoDataLoaded]);

  async function saveEstimate(submit = true) {
    if (!selectedCase?.id || !selectedCase.appointmentId) return;
    setWorkflowBusy(true);
    setError(null);
    try {
      let lineId = estimateLineId;
      if (!lineId) {
        const created = await workshopApi.createEstimateLine({
          appointmentId: String(selectedCase.appointmentId),
          partRequestId: selectedCase.partRequestId ? String(selectedCase.partRequestId) : undefined,
          description: estimateDescription.trim(),
          partId: estimatePart?.id || undefined,
          partNumber: estimatePartNumber.trim() || undefined,
          partName: estimatePartName.trim() || undefined,
          quantity: Math.max(Number(estimateQuantity) || 1, 1),
        });
        lineId = created.id;
        setEstimateLineId(lineId);
      }
      await workshopApi.priceEstimateLine(lineId, {
        quantity: Math.max(Number(estimateQuantity) || 1, 1),
        sellPrice: Number(estimateSellPrice) || 0,
        sourcingType: estimateSourcingType,
        estimatedDeliveryDate: estimateDeliveryDate || undefined,
        remarks: estimateRemarks.trim() || undefined,
      });
      if (submit && estimateStatus !== "Submitted" && estimateStatus !== "Approved") {
        await workshopApi.submitEstimateLines(String(selectedCase.appointmentId), [lineId]);
      }
      await openCase(String(selectedCase.id));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save estimate");
    } finally {
      setWorkflowBusy(false);
    }
  }

  async function approveEstimate() {
    if (!estimateLineId) return;
    setWorkflowBusy(true);
    setError(null);
    try {
      await workshopApi.approveEstimateLine(estimateLineId);
      if (selectedCase?.id) await openCase(String(selectedCase.id));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to approve estimate");
    } finally {
      setWorkflowBusy(false);
    }
  }

  async function saveStoreReview() {
    if (!selectedCase?.id) return;
    setWorkflowBusy(true);
    setError(null);
    try {
      const lineReviews = Object.entries(storePartReviews).map(([partRequestId, review]) => ({ partRequestId, storeReviewStatus: review.status, procurementType: review.procurementType, stockAvailable: review.stockAvailable, note: review.note || undefined }));
      if (demoDataLoaded && selectedCase.id === PROCUREMENT_DEMO_DATA.case.id) {
        const allStock = lineReviews.length > 0 && lineReviews.every((line) => line.storeReviewStatus === "Stock Available");
        const nextStage = (allStock || storeReviewStatus === "Stock Available") ? "Counter Desk Fulfilment" : "Quotation Collection";
        setSelectedCase({ ...selectedCase, currentStage: nextStage, stage: nextStage, status: "In Progress", procurementType: storeProcurementType, vendorRoute: storeVendorRoute, storeReviewStatus, storeReviewNote });
        setCaseActions(demoActionsForStage(nextStage));
      } else {
        await workshopApi.procurementStoreReview(String(selectedCase.id), { storeReviewStatus, procurementType: storeProcurementType, vendorRoute: storeVendorRoute, note: storeReviewNote.trim() || undefined, parts: lineReviews });
        await openCase(String(selectedCase.id));
        await load();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save store review");
    } finally {
      setWorkflowBusy(false);
    }
  }

  async function saveForeignMilestone() {
    if (!selectedCase?.id) return;
    setWorkflowBusy(true);
    setError(null);
    try {
      if (demoDataLoaded && selectedCase.id === PROCUREMENT_DEMO_DATA.case.id) {
        setSelectedCase({ ...selectedCase, foreignCustomerConfirmation, foreignAdvanceStatus, foreignAdvanceAmount: Number(foreignAdvanceAmount) || 0, foreignShipmentEta, foreignNote });
      } else {
        await workshopApi.procurementForeignMilestone(String(selectedCase.id), { customerConfirmation: foreignCustomerConfirmation, advanceStatus: foreignAdvanceStatus, advanceAmount: Number(foreignAdvanceAmount) || 0, shipmentEta: foreignShipmentEta || undefined, note: foreignNote.trim() || undefined });
        await openCase(String(selectedCase.id));
        await load();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save foreign procurement milestone");
    } finally {
      setWorkflowBusy(false);
    }
  }

  function openCaseComposer(kind: "quotation" | "compare" | "order" | "receipt" | "invoice") {
    if (!selectedCase) return;
    if (kind === "quotation") {
      setTab("quotations");
      setCreateMaterialRequestId(String(selectedCase.materialRequestId || ""));
      const context = selectedCase.requestContext as { parts?: Array<Record<string, unknown>> } & Record<string, unknown> | null;
      const parts: Array<Record<string, unknown>> = context?.parts?.length ? context.parts : [context || {}];
      setQuotationLines(parts.map((part, index) => ({
        key: String(part.id || part.partRequestId || part.partNumber || index),
        itemCode: String(part.partNumber || part.itemCode || ""),
        quantity: String(part.quantity || 1),
        rate: String(part.rate || part.estimatedRate || 0),
        description: String(part.partName || part.request || ""),
        materialRequestId: String(part.materialRequestId || selectedCase.materialRequestId || "") || undefined,
        materialRequestItemId: String(part.materialRequestItemId || "") || undefined,
      })));
      setCreateOpen(true);
      return;
    }
    if (kind === "compare") {
      setTab("compare");
      setCompareOpen(true);
      return;
    }
    setTab(kind === "order" ? "orders" : kind === "receipt" ? "receipts" : "invoices");
    setCreateFromModule(kind === "order" ? "orders" : kind === "receipt" ? "receipts" : "invoices");
    setCreateFromId("");
    setCreateFromOpen(true);
  }

  async function runCaseAction(action: {
    action: string;
    label: string;
    requiresReason: boolean;
    toStage?: string;
  }) {
    if (!selectedCase?.id) return;
    const note =
      action.requiresReason || action.action.includes("reject")
        ? window.prompt(`Reason for ${action.label}`)
        : window.prompt(`${action.label} note (optional)`);
    if (
      (action.requiresReason || action.action.includes("reject")) &&
      !note?.trim()
    )
      return;
    if (demoDataLoaded && selectedCase.id === PROCUREMENT_DEMO_DATA.case.id) {
      const nextStage = action.toStage || selectedCase.currentStage;
      setSelectedCase({
        ...selectedCase,
        currentStage: nextStage,
        stage: nextStage,
        status: nextStage === "Paid / Closed" ? "Paid / Closed" : "In Progress",
        currentOwnerRole:
          DEMO_ACTION_CHAIN.find((item) => item.toStage === nextStage)?.owner ||
          selectedCase.currentOwnerRole,
        lastAction: action.label,
        note: note || undefined,
      });
      setCaseActions(demoActionsForStage(String(nextStage)));
      return;
    }
    setBusyId(String(selectedCase.id));
    setError(null);
    try {
      await workshopApi.procurementCaseAction(
        String(selectedCase.id),
        action.action,
        note?.trim() || undefined,
      );
      await openCase(String(selectedCase.id));
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Procurement action failed",
      );
    } finally {
      setBusyId(null);
    }
  }

  const load = useCallback(async () => {
    if (!selectedCompanyId) {
      setLoading(false);
      setError(
        "Select a company to load the company-scoped procurement and accounting records.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summary, queue, caseList, clearanceList, policyResult] =
        await Promise.all([
          workshopApi.accountingDashboard(selectedCompanyId),
          workshopApi
            .procurementInbox(selectedCompanyId)
            .catch(() => ({ data: [] })),
          workshopApi
            .procurementCases(selectedCompanyId)
            .catch(() => ({
              data: [],
              meta: { page: 1, pageSize: 100, total: 0 },
            })),
          workshopApi
            .financialClearances(selectedCompanyId)
            .catch(() => ({
              data: [],
              meta: { page: 1, pageSize: 100, total: 0 },
            })),
          workshopApi
            .procurementApprovalPolicies(selectedCompanyId)
            .catch(() => ({ data: [], defaults: [] })),
        ]);
      setDashboard(summary);
      setInbox(queue.data || []);
      setCases(caseList.data || []);
      setClearances(clearanceList.data || []);
      setPolicy(policyResult.data?.[0] || policyResult.defaults?.[0] || null);
      const modules: AccountingModule[] = [
        "requisitions",
        "quotations",
        "compare_sheets",
        "purchase_orders",
        "receipts",
        "invoices",
        "payments",
        "journals",
      ];
      const moduleErrors: string[] = [];
      const results = await Promise.all(
        modules.map(async (module) => {
          try {
            return await workshopApi.accountingList(module, selectedCompanyId);
          } catch {
            moduleErrors.push(module);
            return { data: [] };
          }
        }),
      );
      setDocuments(
        Object.fromEntries(
          modules.map((module, index) => [module, results[index].data || []]),
        ) as Record<AccountingModule, Array<Record<string, unknown>>>,
      );
      if (moduleErrors.length)
        setError(
          `Some permitted modules could not be loaded: ${moduleErrors.join(", ")}. Check the role and company assignment.`,
        );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load company finance workspace",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const handler = () => void load();
    window.addEventListener("cw:company-changed", handler);
    return () => window.removeEventListener("cw:company-changed", handler);
  }, [load]);

  const filteredCases = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter((item) =>
      [item.id, item.title, item.stage, item.status, item.owner].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [cases, query]);
  const filteredClearances = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clearances;
    return clearances.filter((item) =>
      [
        item.id,
        item.type,
        item.status,
        item.appointmentId,
        item.requestedByUserId,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [clearances, query]);
  const tabModule: Record<string, AccountingModule> = {
    requisitions: "requisitions",
    quotations: "quotations",
    compare: "compare_sheets",
    orders: "purchase_orders",
    receipts: "receipts",
    invoices: "invoices",
    payments: "payments",
    journals: "journals",
  };
  const activeModule = tabModule[tab];
  const requisitionOptions = documents.requisitions as Array<
    Record<string, unknown>
  >;
  const filteredDocuments = useMemo(() => {
    if (!activeModule) return [];
    const term = query.trim().toLowerCase();
    const rows = documents[activeModule] || [];
    return term
      ? rows.filter((row) =>
          Object.values(row).some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(term),
          ),
        )
      : rows;
  }, [activeModule, documents, query]);

  async function review(id: string, action: "approve" | "reject" | "return") {
    const note = window.prompt(
      action === "approve"
        ? "Approval note (optional)"
        : "Reason for this decision",
    );
    if (action !== "approve" && !note?.trim()) return;
    setBusyId(id);
    try {
      if (action === "approve")
        await workshopApi.approveFinancialClearance(id, note || undefined);
      else if (action === "reject")
        await workshopApi.rejectFinancialClearance(id, note!.trim());
      else await workshopApi.returnFinancialClearance(id, note!.trim());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  async function submitDocument(module: AccountingModule, id: string) {
    setBusyId(id);
    setError(null);
    try {
      await workshopApi.accountingSubmit(module, id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to submit document",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createDocument() {
    if (!selectedCompanyId || !createItemCode.trim()) return;
    const caseId = selectedCase?.id ? String(selectedCase.id) : "";
    setCreateBusy(true);
    setError(null);
    try {
      if (demoDataLoaded && selectedCase?.id === PROCUREMENT_DEMO_DATA.case.id && tab === "quotations") {
        const nextNumber = documents.quotations.length + 1;
        const id = "DEMO-QTN-" + String(nextNumber).padStart(4, "0");
        const lines = quotationLines.length ? quotationLines : [{ key: "1", itemCode: createItemCode.trim(), quantity: createQty, rate: createRate, description: createRemarks }];
        const quotation = {
          id,
          name: id,
          status: "Submitted",
          supplierName: createSupplier.trim() || "Demo supplier",
          supplierId: createSupplier.trim() || "DEMO-SUPPLIER",
          grandTotal: lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rate) || 0), 0),
          totalAmount: lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rate) || 0), 0),
          currency: "BDT",
          company: selectedCompanyId,
          materialRequestId: createMaterialRequestId || "DEMO-MR-0001",
          itemCode: lines[0]?.itemCode || createItemCode.trim(),
          items: lines.map((line) => ({ itemCode: line.itemCode, qty: Number(line.quantity) || 1, rate: Number(line.rate) || 0, description: line.description })),
        };
        setDocuments((current) => ({ ...current, quotations: [...current.quotations, quotation] }));
        setSelectedCase((current) => current ? { ...current, selectedSupplierQuotationId: current.selectedSupplierQuotationId || id, currentStage: "Quotation Collection", stage: "Quotation Collection" } : current);
        setCreateOpen(false);
        setCreateItemCode("");
        setCreateSupplier("");
        setCreateQty("1");
        setCreateRate("0");
        setCreateRemarks("");
        setCreateMaterialRequestId("");
        setQuotationLines([]);
        return;
      }
      const lines = tab === "quotations" && quotationLines.length
        ? quotationLines
        : [{ key: "single", itemCode: createItemCode.trim(), quantity: createQty, rate: createRate, description: createRemarks.trim() }];
      const items = lines.map((line) => ({
        itemCode: line.itemCode.trim(),
        qty: Number(line.quantity) || 1,
        rate: Number(line.rate) || 0,
        description: line.description?.trim() || undefined,
        materialRequestId: line.materialRequestId || (tab === "quotations" ? createMaterialRequestId || undefined : undefined),
        materialRequestItemId: line.materialRequestItemId || undefined,
        warehouse: line.warehouse || undefined,
      }));
      if (tab === "quotations" && createMaterialRequestId)
        items.forEach((item) => { if (!item.materialRequestId) item.materialRequestId = createMaterialRequestId; });
      const data: Record<string, unknown> = {
        company: selectedCompanyId,
        items,
      };
      if (tab === "quotations") data.supplierId = createSupplier.trim();
      if (tab === "requisitions")
        data.remarks = createRemarks.trim() || undefined;
      await workshopApi.accountingCreate(
        tab === "quotations" ? "quotations" : "requisitions",
        data,
      );
      setCreateOpen(false);
      setCreateItemCode("");
      setCreateSupplier("");
      setCreateQty("1");
      setCreateRate("0");
      setCreateRemarks("");
      setCreateMaterialRequestId("");
      setQuotationLines([]);
      await load();
      if (caseId) await openCase(caseId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create document",
      );
    } finally {
      setCreateBusy(false);
    }
  }

  useEffect(() => {
    if (!createOpen && !paymentOpen) return;
    let active = true;
    setMastersLoading(true);
    Promise.all([
      workshopApi.accountingItems(),
      workshopApi.accountingSuppliers(),
      workshopApi.accountingAccounts(selectedCompanyId || undefined),
      workshopApi.accountingPaymentModes(),
    ])
      .then(([items, suppliers, accounts, modes]) => {
        if (!active) return;
        setItemOptions(
          (items.data || []).map((item) => ({
            id: item.itemCode || item.id,
            label: item.itemName || item.itemCode || item.id,
            secondary: item.itemCode,
          })),
        );
        setSupplierOptions(
          (suppliers.data || []).map((supplier) => ({
            id: supplier.id,
            label: supplier.name,
            secondary: supplier.type,
          })),
        );
        setAccountOptions(
          (accounts.data || []).map((account) => ({
            id: account.id,
            label: account.name,
            secondary: account.type,
          })),
        );
        setModeOptions(
          (modes.data || []).map((mode) => ({
            id: mode.id,
            label: mode.name,
            secondary: mode.type,
          })),
        );
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load item and supplier masters",
          );
      })
      .finally(() => {
        if (active) setMastersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [createOpen, paymentOpen, selectedCompanyId]);

  async function createPayment() {
    if (!selectedCompanyId || !paymentAmount || !paymentFrom || !paymentTo)
      return;
    setCreateBusy(true);
    setError(null);
    try {
      await workshopApi.accountingCreatePayment({
        company: selectedCompanyId,
        amount: Number(paymentAmount),
        paymentType: "Pay",
        paidFrom: paymentFrom,
        paidTo: paymentTo,
        partyType: paymentParty ? "Supplier" : undefined,
        party: paymentParty || undefined,
        modeOfPayment: paymentMode || undefined,
      });
      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentParty("");
      setPaymentFrom("");
      setPaymentTo("");
      setPaymentMode("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create payment entry",
      );
    } finally {
      setCreateBusy(false);
    }
  }

  async function savePolicy() {
    if (!selectedCompanyId || !policy) return;
    setPolicyBusy(true);
    setError(null);
    try {
      const saved = await workshopApi.saveProcurementApprovalPolicy({
        ...policy,
        companyId: selectedCompanyId,
      });
      setPolicy(saved);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save procurement policy",
      );
    } finally {
      setPolicyBusy(false);
    }
  }

  const setPolicyValue = (key: string, value: unknown) =>
    setPolicy((current) => (current ? { ...current, [key]: value } : current));

  async function createCompareSheet() {
    if (!selectedCompanyId || compareSelection.length === 0) return;
    const caseId = selectedCase?.id ? String(selectedCase.id) : "";
    setCreateBusy(true);
    setError(null);
    try {
      if (demoDataLoaded && selectedCase?.id === PROCUREMENT_DEMO_DATA.case.id) {
        const id = "DEMO-CS-" + String(documents.compare_sheets.length + 1).padStart(4, "0");
        const selected = documents.quotations.filter((row) => compareSelection.includes(String(row.name || row.id || "")));
        const total = selected.reduce((sum, row) => sum + Number(row.grandTotal || row.totalAmount || 0), 0);
        setDocuments((current) => ({ ...current, compare_sheets: [...current.compare_sheets, { id, name: id, status: "Submitted", company: selectedCompanyId, quotationIds: compareSelection, grandTotal: total, totalAmount: total }] }));
        setSelectedCase((current) => current ? { ...current, compareSheetId: id, currentStage: "Compare Sheet Preparation", stage: "Compare Sheet Preparation" } : current);
        setCompareOpen(false);
        setCompareSelection([]);
        return;
      }
      await workshopApi.accountingCreateCompareSheet({
        company: selectedCompanyId,
        quotationIds: compareSelection,
      });
      setCompareOpen(false);
      setCompareSelection([]);
      await load();
      if (caseId) await openCase(caseId);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create compare statement",
      );
    } finally {
      setCreateBusy(false);
    }
  }

  async function createFromPrevious() {
    if (!createFromModule || !createFromId.trim()) return;
    const caseId = selectedCase?.id ? String(selectedCase.id) : "";
    setCreateBusy(true);
    setError(null);
    try {
      if (createFromModule === "orders")
        await workshopApi.accountingCreatePurchaseOrder({
          compareSheetId: createFromId.trim(),
        });
      if (createFromModule === "receipts")
        await workshopApi.accountingCreateReceipt({
          purchaseOrderId: createFromId.trim(),
        });
      if (createFromModule === "invoices")
        await workshopApi.accountingCreateInvoice({
          purchaseReceiptId: createFromId.trim(),
        });
      setCreateFromOpen(false);
      setCreateFromId("");
      setCreateFromModule(null);
      await load();
      if (caseId) await openCase(caseId);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create the linked document",
      );
    } finally {
      setCreateBusy(false);
    }
  }

  function printProcessDocument(
    module: AccountingModule | "appointment" | null,
    id: string,
    title: string,
  ) {
    if (!id) return;
    if (!demoDataLoaded && module === "appointment") {
      window.open(
        workshopApi.appointmentSheetPrintUrl(id),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (!demoDataLoaded && module) {
      window.open(
        workshopApi.accountingPrintUrl(module as AccountingModule, id),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    setPrintPreview({ title, documentId: id, module });
  }

  function printMockDocument() {
    if (!printPreview) return;
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    popup.document.write(`<html><head><title>${printPreview.title}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:40px}header{border-bottom:2px solid #172033;margin-bottom:24px}h1{font-size:22px}h2{font-size:16px;margin-top:28px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left}.meta{color:#475569;font-size:12px}.stamp{display:inline-block;border:1px solid #16a34a;color:#166534;padding:6px 10px;border-radius:4px;font-weight:bold}</style></head><body><header><h1>Continental Works Ltd.</h1><div class="meta">Workshop Procurement Document · Company-scoped operational record</div></header><h2>${printPreview.title}</h2><p class="meta">Document ID: ${printPreview.documentId}<br/>Generated from procurement case DEMO-PROC-0001<br/>Printed: ${new Date().toLocaleString()}</p><table><tr><th>Process</th><td>${printPreview.title}</td></tr><tr><th>Item</th><td>Nissan X-Trail · Front brake pad set</td></tr><tr><th>Amount</th><td>৳128,000</td></tr><tr><th>Company</th><td>Continental Works</td></tr></table><p class="stamp">DEMO DOCUMENT · PRESENTATION ONLY</p><h2>Audit note</h2><p>This document is a printable demonstration of the procurement process. Live documents are printed from the official company record.</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function compareSheetQuotations(record: Record<string, unknown>) {
    const embedded = Array.isArray(record.quotations)
      ? record.quotations.filter(
          (row): row is Record<string, unknown> =>
            Boolean(row) && typeof row === "object",
        )
      : [];
    if (embedded.length) return embedded;
    const ids = Array.isArray(record.quotationIds)
      ? record.quotationIds.map(String)
      : [];
    const quotations = documents.quotations;
    return ids.length
      ? quotations.filter((row) => ids.includes(String(row.name || row.id || "")))
      : quotations;
  }

  const tabGuidance: Record<string, { title: string; description: string }> = {
    procurement: {
      title: "Case control",
      description:
        "Open a case to see the current operation, required role, approval gate, linked document, and next action.",
    },
    requisitions: {
      title: "Raise the demand",
      description:
        "Create the material requisition from the floor request. Select the company item, quantity, and source remarks.",
    },
    quotations: {
      title: "Collect supplier quotations",
      description:
        "Create one quotation per supplier and link each quotation to the source requisition. The comparison screen uses these quotations.",
    },
    compare: {
      title: "Prepare the Comparative Statement",
      description:
        "Select the quotations, record the recommendation, and submit it for the policy-defined verification and approval chain.",
    },
    orders: {
      title: "Create the Purchase Order",
      description:
        "Create a Purchase Order only from an approved Comparative Statement, then confirm ETA, taxes, advance instruction, and terms.",
    },
    receipts: {
      title: "Receive and post the GRN",
      description:
        "Create the receipt from a submitted Purchase Order, physically verify the delivery, and submit the GRN to update FIFO inventory.",
    },
    invoices: {
      title: "Post the supplier invoice",
      description:
        "Create the invoice from a submitted GRN, validate tax and payable values, then submit after audit clearance.",
    },
    payments: {
      title: "Settle the supplier",
      description:
        "Create the Payment Entry against the supplier invoice. The settlement remains linked to the procurement case and audit history.",
    },
    policy: {
      title: "Configure approval policy",
      description:
        "Set the company thresholds, required approvers, verification gates, and escalation rules used by new procurement cases.",
    },
  };
  const createFromOptions: Array<Record<string, unknown>> =
    (createFromModule === "orders"
      ? documents.compare_sheets
      : createFromModule === "receipts"
        ? documents.purchase_orders
        : documents.receipts) as Array<Record<string, unknown>>;

  return (
    <Box sx={{ ...pageLayout, p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ mb: 2.5, justifyContent: "space-between" }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ color: colors.slate[500], fontWeight: 800 }}
          >
            WORKSHOP OPERATIONS
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {workspace === "accounting"
              ? "Accounting Workspace"
              : "Procurement Workspace"}
          </Typography>
          <Typography sx={{ color: colors.slate[600], mt: 0.5 }}>
            {workspace === "accounting"
              ? "Ledger-facing finance control: invoices, payment entries, journals, clearances and company financial records."
              : "Company-scoped requisitions, supplier quotations, compare sheets, purchase orders and receipts."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => {
              setDemoStep(0);
              setDemoOpen(true);
            }}
            disabled={workspace !== "procurement"}
          >
            Guided process demo
          </Button>
          <Button
            variant="contained"
            onClick={loadDemoData}
            disabled={workspace !== "procurement"}
          >
            Load mock case
          </Button>
          <Button
            startIcon={<Refresh />}
            variant="outlined"
            onClick={() => {
              setDemoDataLoaded(false);
              void load();
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>
      {demoDataLoaded ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Presentation mock case loaded locally. It is not saved to Frappe and
          will be replaced when you refresh.
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box sx={{ ...cardSx, flex: 1 }}>
          <Typography variant="caption">Company</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {company?.name || selectedCompanyId || "Select a company"}
          </Typography>
        </Box>
        {Object.entries(dashboard?.counts || {})
          .slice(0, 4)
          .map(([key, value]) => (
            <Box key={key} sx={{ ...cardSx, flex: 1 }}>
              <Typography variant="caption">
                {key.replace(/([A-Z])/g, " $1")}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {Number(value || 0).toLocaleString()}
              </Typography>
            </Box>
          ))}
      </Stack>
      {dashboard?.attention?.some((item) => item.count > 0) ? (
        <Box sx={{ ...cardSx, mb: 2.5 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>
            Work requiring action
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            {dashboard.attention
              .filter((item) => item.count > 0)
              .map((item) => (
                <Button
                  key={item.id}
                  variant="outlined"
                  onClick={() => {
                    const route = (item.route || "").split("/").pop() || "";
                    const tabMap: Record<string, TabId> = {
                      requisitions: "requisitions",
                      quotations: "quotations",
                      "compare-sheets": "compare",
                      "purchase-orders": "orders",
                      receipts: "receipts",
                      invoices: "invoices",
                      payments: "payments",
                      journals: "journals",
                      cases: "procurement",
                    };
                    setTab(tabMap[route] || "accounting");
                    setQuery("");
                  }}
                >
                  {item.title} · {item.count}
                </Button>
              ))}
          </Stack>
        </Box>
      ) : null}
      <Box sx={cardSx}>
        <Tabs
          value={tab}
          variant="scrollable"
          allowScrollButtonsMobile
          onChange={(_, value: TabId) => {
            setTab(value);
            setQuery("");
          }}
        >
          {workspace === "procurement" ? (
            <>
              <Tab
                value="procurement"
                icon={<ShoppingCart />}
                iconPosition="start"
                label="Procurement cases"
              />
              <Tab value="requisitions" label="Requisitions" />
              <Tab value="quotations" label="Supplier quotations" />
              <Tab value="compare" label="Compare sheets" />
              <Tab value="orders" label="Purchase orders" />
              <Tab value="receipts" label="Receipts / GRN" />
              <Tab value="policy" label="Policy & approvals" />
            </>
          ) : (
            <>
              <Tab
                value="accounting"
                icon={<AccountBalance />}
                iconPosition="start"
                label="Clearances"
              />
              <Tab value="invoices" label="Supplier invoices" />
              <Tab value="payments" label="Payment entry" />
              <Tab value="journals" label="Journal ledger" />
            </>
          )}
        </Tabs>
        <Divider sx={{ mb: 2 }} />
        {tab === "quotations" ? (
          <Autocomplete<Record<string, unknown>>
            size="small"
            sx={{ mb: 2 }}
            options={requisitionOptions}
            value={
              requisitionOptions.find(
                (row) =>
                  String(row.name || row.id || "") === createMaterialRequestId,
              ) || null
            }
            onChange={(_, value: Record<string, unknown> | null) =>
              setCreateMaterialRequestId(
                value ? String(value.name || value.id || "") : "",
              )
            }
            getOptionLabel={(option: Record<string, unknown>) =>
              `${String(option.name || option.id || "")} · ${String(option.company || selectedCompanyId || "")}`
            }
            isOptionEqualToValue={(
              option: Record<string, unknown>,
              value: Record<string, unknown>,
            ) =>
              String(option.name || option.id || "") ===
              String(value.name || value.id || "")
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Source requisition for new quotation (optional)"
                helperText="Linking the requisition keeps the quotation inside its procurement case."
              />
            )}
          />
        ) : null}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <TextField
            fullWidth
            size="small"
            label="Search permitted records"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {["requisitions", "quotations"].includes(tab) ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New {tab === "quotations" ? "quotation" : "requisition"}
            </Button>
          ) : null}
          {tab === "compare" ? (
            <Button
              variant="contained"
              disabled={!documents.quotations.length}
              onClick={() => setCompareOpen(true)}
            >
              Create compare statement
            </Button>
          ) : null}
          {workspace === "accounting" && tab === "payments" ? (
            <Button variant="contained" onClick={() => setPaymentOpen(true)}>
              New payment entry
            </Button>
          ) : null}
        </Stack>
        {tabGuidance[tab] ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 800 }}>
              {tabGuidance[tab].title}
            </Typography>
            <Typography variant="body2">
              {tabGuidance[tab].description}
            </Typography>
          </Alert>
        ) : null}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          {tab === "orders" ? (
            <Button
              variant="contained"
              disabled={!documents.compare_sheets.length}
              onClick={() => {
                setCreateFromModule("orders");
                setCreateFromId("");
                setCreateFromOpen(true);
              }}
            >
              Create PO from approved compare
            </Button>
          ) : null}
          {tab === "receipts" ? (
            <Button
              variant="contained"
              disabled={!documents.purchase_orders.length}
              onClick={() => {
                setCreateFromModule("receipts");
                setCreateFromId("");
                setCreateFromOpen(true);
              }}
            >
              Create GRN from submitted PO
            </Button>
          ) : null}
          {tab === "invoices" ? (
            <Button
              variant="contained"
              disabled={!documents.receipts.length}
              onClick={() => {
                setCreateFromModule("invoices");
                setCreateFromId("");
                setCreateFromOpen(true);
              }}
            >
              Create invoice from submitted GRN
            </Button>
          ) : null}
        </Stack>
        {loading ? (
          <Stack sx={{ py: 6, alignItems: "center" }}>
            <CircularProgress size={28} />
          </Stack>
        ) : tab === "policy" ? (
          <Stack spacing={2} sx={{ py: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Procurement approval policy
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: colors.slate[600], mt: 0.5 }}
              >
                Configure the approval gates for{" "}
                {company?.name || selectedCompanyId}. New procurement cases
                snapshot this policy; historical cases remain unchanged.
              </Typography>
            </Box>
            {policy ? (
              <>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>
                      Approval gates
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(policy.requireGmApproval)}
                          onChange={(e) =>
                            setPolicyValue(
                              "requireGmApproval",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label="GM approval"
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="GM minimum amount"
                      value={String(policy.gmMinAmount ?? 0)}
                      onChange={(e) =>
                        setPolicyValue(
                          "gmMinAmount",
                          Number(e.target.value) || 0,
                        )
                      }
                      sx={{ mb: 1.5 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(policy.requireAuditVerification)}
                          onChange={(e) =>
                            setPolicyValue(
                              "requireAuditVerification",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label="Audit verification"
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Audit verification minimum amount"
                      value={String(policy.auditVerificationMinAmount ?? 0)}
                      onChange={(e) =>
                        setPolicyValue(
                          "auditVerificationMinAmount",
                          Number(e.target.value) || 0,
                        )
                      }
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>
                      Management and receiving controls
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(policy.requireManagementApproval)}
                          onChange={(e) =>
                            setPolicyValue(
                              "requireManagementApproval",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label="Management approval"
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Management minimum amount"
                      value={String(policy.managementMinAmount ?? 0)}
                      onChange={(e) =>
                        setPolicyValue(
                          "managementMinAmount",
                          Number(e.target.value) || 0,
                        )
                      }
                      sx={{ mb: 1.5 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(policy.requirePhysicalAudit)}
                          onChange={(e) =>
                            setPolicyValue(
                              "requirePhysicalAudit",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label="Physical receiving audit"
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Physical audit minimum amount"
                      value={String(policy.physicalAuditMinAmount ?? 0)}
                      onChange={(e) =>
                        setPolicyValue(
                          "physicalAuditMinAmount",
                          Number(e.target.value) || 0,
                        )
                      }
                      sx={{ mb: 1.5 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(policy.requireAuditClearance)}
                          onChange={(e) =>
                            setPolicyValue(
                              "requireAuditClearance",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label="Final audit clearance"
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Audit clearance minimum amount"
                      value={String(policy.auditClearanceMinAmount ?? 0)}
                      onChange={(e) =>
                        setPolicyValue(
                          "auditClearanceMinAmount",
                          Number(e.target.value) || 0,
                        )
                      }
                    />
                  </Box>
                </Stack>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Policy notes"
                  value={String(policy.notes || "")}
                  onChange={(e) => setPolicyValue("notes", e.target.value)}
                />
                <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    disabled={policyBusy}
                    onClick={() => void savePolicy()}
                  >
                    {policyBusy ? "Saving…" : "Save policy"}
                  </Button>
                </Stack>
              </>
            ) : (
              <Alert severity="info">
                No approval policy is available for this company yet. The
                built-in approval chain will remain active until a manager saves
                a policy.
              </Alert>
            )}
          </Stack>
        ) : activeModule ? (
          <Stack spacing={1}>
            {filteredDocuments.map((row) => {
              const id = String(row.name || row.id || "");
              const status = String(
                row.status ||
                  (Number(row.docstatus) === 1 ? "Submitted" : "Draft"),
              );
              const party = String(
                row.supplierName ||
                  row.supplierId ||
                  row.partyName ||
                  row.partyId ||
                  "",
              );
              const amount =
                row.grandTotal ??
                row.totalAmount ??
                row.paidAmount ??
                row.total ??
                null;
              return (
                <Box
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void openDocument(activeModule, row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter")
                      void openDocument(activeModule, row);
                  }}
                  sx={{
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: radii.md,
                    p: 1.75,
                    cursor: "pointer",
                    "&:hover": { borderColor: colors.slate[500] },
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    sx={{ alignItems: { md: "center" } }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {id || "Unnamed document"}
                      </Typography>
                      <Typography variant="caption">
                        {party || "No party"}
                        {amount !== null
                          ? ` · ${Number(amount).toLocaleString()} · `
                          : " · "}
                        {String(row.company || selectedCompanyId || "")}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={status}
                      color={statusColor(status)}
                    />
                    {["Draft", "0", "Open"].includes(status) ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!id || busyId === id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void submitDocument(activeModule, id);
                        }}
                      >
                        Submit
                      </Button>
                    ) : null}
                    {id ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(event) => {
                          event.stopPropagation();
                          printProcessDocument(
                            activeModule,
                            id,
                            tab === "compare"
                              ? "Comparative Statement"
                              : tab === "quotations"
                                ? "Supplier Quotation"
                                : tab === "requisitions"
                                  ? "Material Requisition"
                                  : tab === "orders"
                                    ? "Purchase Order"
                                    : tab === "receipts"
                                      ? "Goods Receipt Note"
                                      : tab === "invoices"
                                        ? "Supplier Invoice"
                                        : tab === "payments"
                                          ? "Payment Entry"
                                          : "Accounting Document",
                          );
                        }}
                      >
                        Print
                      </Button>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
            {!filteredDocuments.length ? (
              <Typography
                sx={{ color: colors.slate[500], py: 4, textAlign: "center" }}
              >
                No records found for this company.
              </Typography>
            ) : null}
          </Stack>
        ) : tab === "procurement" ? (
          <Stack spacing={1}>
            {filteredCases.map((item) => (
              <Box
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => void openCase(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void openCase(item.id);
                }}
                sx={{
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radii.md,
                  p: 1.75,
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: colors.accent.indigo,
                    background: colors.bg.subtle,
                  },
                }}
              >
                {(() => {
                  const context = item.requestContext;
                  const vehicle = context?.vehicle;
                  const appointment = context?.appointment;
                  return (
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  sx={{ alignItems: { md: "center" } }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {context?.appointment?.id ? `Appointment ${context.appointment.id}` : item.title || item.id}
                    </Typography>
                    <Typography variant="caption">
                      {item.id} · {item.stage || "Unstaged"} ·{" "}
                      {item.currentOwnerRole || item.owner || "Unassigned"}
                      {item.sourceName ? ` · Source: ${item.sourceName}` : ""}
                    </Typography>
                    {context ? (
                      <Typography variant="body2" sx={{ mt: 0.5, color: colors.slate[700] }}>
                        <b>Appointment:</b> {appointment?.id || "—"} · <b>Vehicle:</b> {vehicle?.registrationNo || vehicle?.vin || "—"} {vehicle?.make || vehicle?.model ? `(${[vehicle.make, vehicle.model, vehicle.modelVariant].filter(Boolean).join(" ")})` : ""} · <b>Customer:</b> {context.customer?.name || "—"}
                      </Typography>
                    ) : null}
                    {context ? (
                      <Typography variant="caption" sx={{ display: "block", mt: 0.25 }}>
                        <b>{context.parts && context.parts.length > 1 ? "Parts requested:" : "Request:"}</b>{" "}
                        {context.parts && context.parts.length > 1
                          ? context.parts.map((part) => `${part.partName || part.partNumber || "Part"} × ${part.quantity || 0}`).join(" · ")
                          : `${context.request || context.partName || context.partNumber || "—"} × ${context.quantity || 0}`}
                        {context.requestedByName ? ` · Raised by: ${context.requestedByName}` : ""}{context.concern?.name ? ` · Concern: ${context.concern.name}` : ""}
                      </Typography>
                    ) : null}
                    {context?.parts && context.parts.length > 1 ? (
                      <Chip size="small" variant="outlined" label={`${context.parts.length} parts in this appointment case`} sx={{ mt: 0.75, width: "fit-content" }} />
                    ) : null}
                  </Box>
                  {item.approvalAmount ? (
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      ৳{Number(item.approvalAmount).toLocaleString()}
                    </Typography>
                  ) : null}
                  {item.slaDueAt &&
                  new Date(item.slaDueAt).getTime() < Date.now() ? (
                    <Chip size="small" label="Escalated" color="error" />
                  ) : null}
                  <Chip
                    size="small"
                    label={item.status || "Open"}
                    color={statusColor(item.status)}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(event) => {
                      event.stopPropagation();
                      void openCase(item.id);
                    }}
                  >
                    Open full process
                  </Button>
                </Stack>
                  );
                })()}
              </Box>
            ))}
            {!filteredCases.length ? (
              <Typography
                sx={{ color: colors.slate[500], py: 4, textAlign: "center" }}
              >
                No procurement cases found for this company.
              </Typography>
            ) : null}
            {inbox.length ? (
              <Alert icon={<AssignmentTurnedIn />} severity="info">
                {inbox.length} assigned procurement task
                {inbox.length === 1 ? "" : "s"} are visible in your queue. Open
                the case in the Workshop workflow to continue its audited
                transition.
              </Alert>
            ) : null}
          </Stack>
        ) : (
          <Stack spacing={1}>
            {filteredClearances.map((item) => (
              <Box
                key={item.id}
                sx={{
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radii.md,
                  p: 1.75,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  sx={{ alignItems: { md: "center" } }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {item.type || "Financial clearance"} ·{" "}
                      {item.appointmentId || item.id}
                    </Typography>
                    <Typography variant="caption">
                      Requested by {item.requestedByUserId || "user"} ·{" "}
                      {item.requestedAt
                        ? new Date(item.requestedAt).toLocaleString()
                        : "time unavailable"}
                      {item.reviewedByUserId
                        ? ` · Reviewed by ${item.reviewedByUserId}`
                        : ""}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={item.status || "Requested"}
                    color={statusColor(item.status)}
                  />
                  <Stack direction="row" spacing={0.75}>
                    {item.status === "Requested" ? (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busyId === item.id}
                          onClick={() => void review(item.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={busyId === item.id}
                          onClick={() => void review(item.id, "reject")}
                        >
                          Reject
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === item.id}
                          onClick={() => void review(item.id, "return")}
                        >
                          Return
                        </Button>
                      </>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            ))}
            {!filteredClearances.length ? (
              <Typography
                sx={{ color: colors.slate[500], py: 4, textAlign: "center" }}
              >
                No accounting clearances found for this company.
              </Typography>
            ) : null}
          </Stack>
        )}
      </Box>
      <Dialog
        open={Boolean(selectedRecord || selectedCase)}
        onClose={() => {
          setSelectedRecord(null);
          setSelectedModule(null);
          setSelectedCase(null);
          setCaseActions([]);
          setDocumentsDrawerOpen(false);
          setProcessBoardOpen(false);
          setAppointmentContextOpen(true);
          setSelectedProcessStep(0);
        }}
        maxWidth={selectedCase ? "lg" : "md"}
        fullWidth
        slotProps={{ paper: { id: selectedCase ? "procurement-case-dialog" : undefined } }}
      >
        <DialogTitle>
          {selectedCase
            ? `Full procurement process · ${String(selectedCase.id || "")}`
            : `${String(selectedRecord?.doctype || selectedModule || "Document")} · ${String(selectedRecord?.id || selectedRecord?.name || "")}`}
        </DialogTitle>
        <DialogContent dividers>
          {selectedCase ? (
            <Stack spacing={2}>
              <Typography variant="caption">
                One company-scoped process board for the complete
                request-to-payment journey. Actions are validated by role,
                approval policy, and current stage.
              </Typography>
              {detailLoading ? <CircularProgress size={22} /> : null}
              <Stepper
                activeStep={Math.max(
                  0,
                  [
                    "Requested",
                    "Procurement Review",
                    "Quotation Collection",
                    "Compare Sheet Preparation",
                    "Audit Verification",
                    "GM Approval",
                    "Management Approval",
                    "PO Creation",
                    "Supplier Confirmation",
                    "Chalan / GRN",
                    "Audit Physical Review",
                    "Procurement File Completion",
                    "Audit Clearance",
                    "Actual Accounts",
                    "Reconciliation",
                    "Bill Settlement",
                    "Paid / Closed",
                  ].indexOf(String(selectedCase.currentStage || "Requested")),
                )}
                alternativeLabel
                sx={{ overflowX: "auto", py: 1 }}
              >
                {[
                  "Request",
                  "Store review",
                  "Quotations",
                  "Compare",
                  "Audit",
                  "Approval",
                  "PO",
                  "Receipt",
                  "Accounts",
                  "Closed",
                ].map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Chip
                  label={String(selectedCase.currentStage || "Requested")}
                  color="info"
                />
                <Chip
                  label={String(selectedCase.status || "Open")}
                  color={statusColor(String(selectedCase.status || "Open"))}
                />
                <Chip
                  label={`Amount: ${Number(selectedCase.approvalAmount || 0).toLocaleString()}`}
                />
                <Chip
                  label={`Owner: ${String(selectedCase.currentOwnerRole || selectedCase.owner || "Unassigned")}`}
                />
              </Stack>
              {(() => {
                const context = selectedCase.requestContext as {
                  request?: string; partName?: string; partNumber?: string; quantity?: number; requestedByName?: string; requestedBy?: string; requestedAt?: string; deliveryDate?: string;
                  parts?: Array<{ id?: string; partName?: string; partNumber?: string; quantity?: number; status?: string; requestedByName?: string; requestedAt?: string; deliveryDate?: string }>;
                  appointment?: { id?: string; scheduledAt?: string; date?: string; time?: string; status?: string; mileage?: number; shopId?: string };
                  customer?: { id?: string; name?: string; phone?: string };
                  vehicle?: { id?: string; registrationNo?: string; vin?: string; make?: string; model?: string; modelVariant?: string };
                  concern?: { id?: string; name?: string; remark?: string } | null;
                } | null;
                if (!context) return null;
                const vehicle = context.vehicle;
                const appointment = context.appointment;
                return (
                  <Box sx={{ ...cardSx, p: 1.5 }}>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: appointmentContextOpen ? 1.25 : 0 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>Appointment request context</Typography>
                        <Typography variant="caption" sx={{ color: colors.slate[600] }}>Parts and source details stay linked to this procurement case.</Typography>
                      </Box>
                      <Button size="small" variant="outlined" onClick={() => setAppointmentContextOpen((open) => !open)}>
                        {appointmentContextOpen ? "Collapse details" : "Show details"}
                      </Button>
                    </Stack>
                    {appointmentContextOpen ? (
                      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ alignItems: "stretch" }}>
                        <Box sx={{ flex: 1, minWidth: 0, p: 1.25, borderRadius: 1, bgcolor: colors.bg.subtle }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>All parts requested for this appointment ({context.parts?.length || 0})</Typography>
                          {context.parts && context.parts.length ? (
                            <Stack spacing={0.75}>
                              {context.parts.map((part) => (
                                <Box key={part.id || `${part.partNumber}-${part.partName}`} sx={{ p: 0.75, borderRadius: 1, bgcolor: "white" }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{part.partName || part.partNumber || "Part"} · Qty {part.quantity || 0}</Typography>
                                  <Typography variant="caption" sx={{ color: colors.slate[600] }}>{part.status || "Requested"} · {part.requestedByName || "—"}{part.deliveryDate ? ` · Required ${part.deliveryDate}` : ""}</Typography>
                                </Box>
                              ))}
                            </Stack>
                          ) : <Typography variant="body2" sx={{ color: colors.slate[600] }}>No part lines were supplied.</Typography>}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, p: 1.25, border: `1px solid ${colors.border}`, borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>Request details</Typography>
                          <Stack spacing={0.4}>
                            <Typography variant="body2"><b>Request:</b> {context.request || context.partName || context.partNumber || "—"} · Qty {context.quantity || 0}</Typography>
                            <Typography variant="body2"><b>Raised by:</b> {context.requestedByName || context.requestedBy || "—"} · {context.requestedAt || "—"}</Typography>
                            <Typography variant="body2"><b>Required by:</b> {context.deliveryDate || "Not specified"}</Typography>
                            <Typography variant="body2"><b>Concern:</b> {context.concern?.name || "—"}{context.concern?.remark ? ` · ${context.concern.remark}` : ""}</Typography>
                            <Typography variant="body2"><b>Appointment:</b> {appointment?.id || String(selectedCase.appointmentId || "—")} · {appointment?.scheduledAt || [appointment?.date, appointment?.time].filter(Boolean).join(" ") || "—"}</Typography>
                            <Typography variant="body2"><b>Customer:</b> {context.customer?.name || String(selectedCase.customerId || "—")}{context.customer?.phone ? ` · ${context.customer.phone}` : ""}</Typography>
                            <Typography variant="body2"><b>Vehicle:</b> {vehicle?.registrationNo || vehicle?.vin || String(selectedCase.vehicleId || "—")} · {[vehicle?.make, vehicle?.model, vehicle?.modelVariant].filter(Boolean).join(" ") || "—"}</Typography>
                            <Typography variant="body2"><b>Job mileage:</b> {appointment?.mileage || 0} · <b>Status:</b> {appointment?.status || "—"}</Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    ) : null}
                  </Box>
                );
              })()}
              <Box sx={{ ...cardSx, p: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: processBoardOpen ? 1 : 0 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>Process board</Typography>
                    <Typography variant="caption" sx={{ color: colors.slate[600] }}>Click a stage to review its requirements and available document.</Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => setProcessBoardOpen((open) => !open)}>
                    {processBoardOpen ? "Collapse process" : "Expand process"}
                  </Button>
                </Stack>
                {processBoardOpen ? <Stack spacing={1}>
                  {PROCUREMENT_DEMO_STEPS.map((step, index) => {
                    const completed =
                      index <
                      Math.min(
                        PROCUREMENT_DEMO_STEPS.length - 1,
                        Math.max(
                          0,
                          [
                            "Requested",
                            "Procurement Review",
                            "Quotation Collection",
                            "Compare Sheet Preparation",
                            "Audit Verification",
                            "GM Approval",
                            "Management Approval",
                            "PO Creation",
                            "Supplier Confirmation",
                            "Chalan / GRN",
                            "Audit Physical Review",
                            "Procurement File Completion",
                            "Audit Clearance",
                            "Actual Accounts",
                            "Reconciliation",
                            "Bill Settlement",
                            "Paid / Closed",
                          ].indexOf(
                            String(selectedCase.currentStage || "Requested"),
                          ),
                        ),
                      );
                    const docMap = [
                      "sourceName",
                      "materialRequestId",
                      "selectedSupplierQuotationId",
                      "compareSheetId",
                      "compareSheetId",
                      "compareSheetId",
                      "compareSheetId",
                      "purchaseOrderId",
                      "purchaseOrderId",
                      "purchaseReceiptId",
                      "purchaseReceiptId",
                      "purchaseInvoiceId",
                      "purchaseInvoiceId",
                      "purchaseInvoiceId",
                      "paymentEntryId",
                      "paymentEntryId",
                      "paymentEntryId",
                    ];
                    const linked =
                      selectedCase[docMap[index]] ||
                      (demoDataLoaded
                        ? [
                            "DEMO-MR-0001",
                            "DEMO-MR-0001",
                            "DEMO-QTN-0001",
                            "DEMO-CS-0001",
                            "DEMO-CS-0001",
                            "DEMO-CS-0001",
                            "DEMO-CS-0001",
                            "DEMO-PO-0001",
                            "DEMO-PO-0001",
                            "DEMO-GRN-0001",
                            "DEMO-GRN-0001",
                            "DEMO-PINV-0001",
                            "DEMO-PINV-0001",
                            "DEMO-PINV-0001",
                            "DEMO-PAY-0001",
                            "DEMO-PAY-0001",
                            "DEMO-PAY-0001",
                          ][index] || ""
                        : "");
                    const policyText =
                      index === 4 && policy
                        ? ` · GM ≥ ৳${Number(policy.gmMinAmount || 0).toLocaleString()}${policy.requireAuditVerification ? `; audit ≥ ৳${Number(policy.auditVerificationMinAmount || 0).toLocaleString()}` : ""}${policy.requireManagementApproval ? `; management ≥ ৳${Number(policy.managementMinAmount || 0).toLocaleString()}` : ""}`
                        : "";
                    return (
                      <Stack
                        key={step.title}
                        direction="row"
                        spacing={1}
                        onClick={() => setSelectedProcessStep(index)}
                        sx={{
                          alignItems: "center",
                          cursor: "pointer",
                          borderRadius: 1.5,
                          px: 1,
                          pt: 0.75,
                          bgcolor: selectedProcessStep === index ? colors.bg.subtle : "transparent",
                          borderBottom: `1px solid ${colors.border.subtle}`,
                          pb: 0.75,
                        }}
                      >
                        <Chip
                          size="small"
                          label={
                            completed
                              ? "Complete"
                              : index === 0
                                ? "Source"
                                : "Next"
                          }
                          color={
                            completed
                              ? "success"
                              : index === 0
                                ? "info"
                                : "default"
                          }
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {step.title}
                          </Typography>
                          <Typography variant="caption">
                            {step.role} · Required: {step.required}
                            {policyText}
                            {linked ? ` · ${String(linked)}` : ""}
                          </Typography>
                        </Box>
                        {linked && index > 0 ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              printProcessDocument(
                                PROCESS_PRINT_MODULES[index],
                                String(linked),
                                step.title,
                              )
                            }
                          >
                            Print
                          </Button>
                        ) : null}
                        {index === 13 &&
                        (selectedCase.paymentEntryId || demoDataLoaded) ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              printProcessDocument(
                                "payments",
                                String(
                                  selectedCase.paymentEntryId ||
                                    "DEMO-PAY-0001",
                                ),
                                "Payment Entry",
                              )
                            }
                          >
                            Print payment
                          </Button>
                        ) : null}
                      </Stack>
                    );
                  })}
                </Stack> : <Typography variant="body2" sx={{ color: colors.slate[600], mt: 0.75 }}>The process board is collapsed. Expand it to inspect stages, roles, policy gates, and linked documents.</Typography>}
                {processBoardOpen ? <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 1.5, border: `1px solid ${colors.border.default}`, bgcolor: colors.bg.subtle }}>
                  <Typography sx={{ fontWeight: 800 }}>{PROCUREMENT_DEMO_STEPS[selectedProcessStep]?.title || "Selected stage"}</Typography>
                  <Typography variant="body2" sx={{ color: colors.slate[600], mt: 0.35 }}>{PROCUREMENT_DEMO_STEPS[selectedProcessStep]?.detail}</Typography>
                  <Typography variant="caption" sx={{ display: "block", color: colors.slate[600], mt: 0.75 }}>Owner: {PROCUREMENT_DEMO_STEPS[selectedProcessStep]?.role} · Required: {PROCUREMENT_DEMO_STEPS[selectedProcessStep]?.required}</Typography>
                </Box> : null}
              </Box>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    <Typography sx={{ fontWeight: 800 }}>Case documents</Typography>
                    <Button size="small" variant="contained" onClick={() => setDocumentsDrawerOpen(true)}>Open documents</Button>
                  </Stack>
                  <Typography variant="body2" sx={{ color: colors.slate[600] }}>
                    Appointment, requisition, quotations, vendors, comparative statement, purchase order, GRN, invoice, and payment remain available from this case.
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: "wrap", gap: 0.75 }}>
                    <Chip size="small" label="Appointment" variant="outlined" />
                    <Chip size="small" label="Requisition" variant="outlined" />
                    <Chip size="small" label="Quotations" variant="outlined" />
                    <Chip size="small" label="CS" variant="outlined" />
                    <Chip size="small" label="PO / GRN" variant="outlined" />
                    <Chip size="small" label="Accounts" variant="outlined" />
                  </Stack>
                </Box>
              </Stack>
              <Drawer
                anchor="right"
                open={documentsDrawerOpen}
                onClose={() => setDocumentsDrawerOpen(false)}
                ModalProps={{
                  container: () => document.getElementById("procurement-case-dialog") || document.body,
                  disablePortal: true,
                }}
              >
                <Box sx={{ width: { xs: "min(100vw, 380px)", sm: 440 }, p: 2, height: "100%", overflowY: "auto", bgcolor: colors.bg.page }}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 850, fontSize: "1.15rem" }}>Case documents</Typography>
                      <Typography variant="caption" sx={{ color: colors.slate[600] }}>Open, review, or print the controlled procurement file.</Typography>
                    </Box>
                    <Button size="small" onClick={() => setDocumentsDrawerOpen(false)}>Close</Button>
                  </Stack>
                  <Stack spacing={1}>
                  {([
                    ["appointment", "Appointment", selectedCase.appointmentId],
                    ["requisitions", "Requisition", selectedCase.materialRequestId],
                    ["quotations", "Supplier quotation", selectedCase.selectedSupplierQuotationId],
                    ["compare_sheets", "Comparative statement", selectedCase.compareSheetId],
                    ["purchase_orders", "Purchase order", selectedCase.purchaseOrderId],
                    ["receipts", "Goods receipt note", selectedCase.purchaseReceiptId],
                    ["invoices", "Supplier invoice", selectedCase.purchaseInvoiceId],
                    ["payments", "Payment entry", selectedCase.paymentEntryId],
                  ] as Array<[string, string, unknown]>).map(([module, label, value]) => {
                    const id = String(value || "");
                    if (!id && !demoDataLoaded) return null;
                    const documentId = id || "DEMO-" + module.toUpperCase() + "-0001";
                    const printableModule: AccountingModule | "appointment" = module === "appointment" ? "appointment" : module as AccountingModule;
                    return (
                      <Box key={module} sx={{ p: 1.25, border: `1px solid ${colors.border.default}`, borderRadius: 1.5, bgcolor: colors.bg.card }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 750 }}>{label}</Typography>
                            <Typography variant="caption" sx={{ color: colors.slate[600], overflowWrap: "anywhere" }}>{documentId}</Typography>
                          </Box>
                          <Button size="small" variant="outlined" onClick={() => printProcessDocument(printableModule, documentId, label)}>Print</Button>
                        </Stack>
                      </Box>
                    );
                  })}
                  {!demoDataLoaded && !selectedCase.materialRequestId && !selectedCase.selectedSupplierQuotationId && !selectedCase.compareSheetId && !selectedCase.purchaseOrderId && !selectedCase.purchaseReceiptId && !selectedCase.purchaseInvoiceId && !selectedCase.paymentEntryId ? (
                    <Typography variant="caption" sx={{ color: colors.slate[500] }}>Documents will appear here as each stage is completed.</Typography>
                  ) : null}
                  </Stack>
                </Box>
              </Drawer>
              <Box sx={{ ...cardSx, p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>
                  Current operation
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  The next action is controlled by the assigned role and the company approval policy. A disabled action includes the reason it cannot be performed by the current user.
                </Typography>
                <Box sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.5, mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Estimate and customer quotation</Typography>
                  <Typography variant="body2" sx={{ color: colors.slate[600], mb: 1.25 }}>
                    Prepare the estimate from this same SA request. Save it to price the requested part, submit it for review, and let the authorized approver approve it. Approval then performs the stock-first check and links the resulting material request back to this procurement case.
                  </Typography>
                  {!selectedCase.appointmentId ? <Alert severity="warning" sx={{ mb: 1 }}>This case is not linked to an appointment, so an estimate cannot be created yet.</Alert> : null}
                  <Stack spacing={1}>
                    <TextField fullWidth size="small" label="Requested part / estimate description" value={estimateDescription} onChange={(event) => setEstimateDescription(event.target.value)} disabled={estimateStatus === "Approved"} />
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={estimatePartOptions}
                        value={estimatePart}
                        onChange={(_, option) => {
                          setEstimatePart(option);
                          if (option) {
                            const [partNumber, ...name] = option.label.split(" · ");
                            setEstimatePartNumber(partNumber || "");
                            setEstimatePartName(name.join(" · ") || option.label);
                          }
                        }}
                        getOptionLabel={(option) => option.label}
                        renderInput={(params) => <TextField {...params} label="Catalog part (optional)" placeholder="Search part number or name" />}
                        disabled={estimateStatus === "Approved"}
                      />
                      <TextField size="small" label="Part number" value={estimatePartNumber} onChange={(event) => setEstimatePartNumber(event.target.value)} disabled={estimateStatus === "Approved"} />
                      <TextField size="small" label="Quantity" type="number" slotProps={{ htmlInput: { min: 1 } }} value={estimateQuantity} onChange={(event) => setEstimateQuantity(event.target.value)} disabled={estimateStatus === "Approved"} />
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <TextField size="small" label="Part name" value={estimatePartName} onChange={(event) => setEstimatePartName(event.target.value)} disabled={estimateStatus === "Approved"} />
                      <TextField size="small" label="Customer sell price" type="number" slotProps={{ htmlInput: { min: 0 } }} value={estimateSellPrice} onChange={(event) => setEstimateSellPrice(event.target.value)} disabled={estimateStatus === "Approved"} />
                      <TextField select size="small" label="Sourcing" value={estimateSourcingType} onChange={(event) => setEstimateSourcingType(event.target.value as typeof estimateSourcingType)} disabled={estimateStatus === "Approved"} sx={{ minWidth: 150 }}>
                        {(["OEM", "Genuine", "Aftermarket"] as const).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                      </TextField>
                      <TextField size="small" type="date" label="Estimated delivery" slotProps={{ inputLabel: { shrink: true } }} value={estimateDeliveryDate} onChange={(event) => setEstimateDeliveryDate(event.target.value)} disabled={estimateStatus === "Approved"} />
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <TextField fullWidth size="small" label="Estimate remarks / commercial terms" value={estimateRemarks} onChange={(event) => setEstimateRemarks(event.target.value)} disabled={estimateStatus === "Approved"} />
                      <Chip label={`Estimate: ${estimateStatus}`} color={estimateStatus === "Approved" ? "success" : estimateStatus === "Submitted" ? "warning" : "default"} sx={{ alignSelf: "center" }} />
                      <Button variant="contained" disabled={workflowBusy || !selectedCase.appointmentId || estimateStatus === "Approved" || !estimateDescription.trim()} onClick={() => void saveEstimate(true)} sx={{ minWidth: 190 }}>Save & submit estimate</Button>
                      {estimateStatus === "Submitted" ? <Button variant="outlined" disabled={workflowBusy} onClick={() => void approveEstimate()} sx={{ minWidth: 190 }}>Approve & check stock</Button> : null}
                    </Stack>
                  </Stack>
                </Box>
                {(String(selectedCase.currentStage || "") === "Requested" || String(selectedCase.currentStage || "") === "Procurement Review") ? (
                  <Box sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.5, mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Store review and routing</Typography>
                    <Typography variant="body2" sx={{ color: colors.slate[600], mb: 1.25 }}>
                      Parts / Store Keeper checks FIFO stock here. Available stock goes to Counter Desk; a shortage starts local procurement; no local source routes the case to foreign procurement.
                    </Typography>
                    {(() => {
                      const storeContext = selectedCase.requestContext as { parts?: Array<Record<string, unknown>> } | null;
                      const parts = storeContext?.parts || [];
                      if (!parts.length) return null;
                      return (
                        <Box sx={{ mb: 1.25, p: 1, borderRadius: 1, bgcolor: colors.bg.subtle }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>Review each requested part</Typography>
                          <Stack spacing={1}>
                            {parts.map((part, index) => {
                              const id = String(part.id || part.partRequestId || index);
                              const review = storePartReviews[id] || { status: "Local Shortage" as const, procurementType: "Local" as const, note: "", stockAvailable: Number(part.stockAvailable || 0) };
                              return (
                                <Stack key={id} direction={{ xs: "column", md: "row" }} spacing={1} sx={{ alignItems: { md: "center" } }}>
                                  <Box sx={{ flex: 1, minWidth: 180 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{String(part.partName || part.partNumber || "Part")}</Typography>
                                    <Typography variant="caption">Requested {String(part.quantity || 0)} · Available FIFO stock {review.stockAvailable}</Typography>
                                  </Box>
                                  <TextField select size="small" label="Decision" value={review.status} onChange={(event) => setStorePartReviews((current) => ({ ...current, [id]: { ...review, status: event.target.value as typeof review.status } }))} sx={{ minWidth: 190 }}>
                                    <MenuItem value="Stock Available">Stock available</MenuItem>
                                    <MenuItem value="Local Shortage">Local shortage</MenuItem>
                                    <MenuItem value="Foreign Required">Foreign required</MenuItem>
                                  </TextField>
                                  <TextField select size="small" label="Type" value={review.procurementType} onChange={(event) => setStorePartReviews((current) => ({ ...current, [id]: { ...review, procurementType: event.target.value as typeof review.procurementType } }))} sx={{ minWidth: 130 }}>
                                    <MenuItem value="Local">Local</MenuItem>
                                    <MenuItem value="Foreign">Foreign</MenuItem>
                                  </TextField>
                                </Stack>
                              );
                            })}
                          </Stack>
                        </Box>
                      );
                    })()}
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <TextField select size="small" label="Store decision" value={storeReviewStatus} onChange={(event) => setStoreReviewStatus(event.target.value as typeof storeReviewStatus)} sx={{ minWidth: 210 }}>
                        <MenuItem value="Stock Available">Stock available → Counter Desk</MenuItem>
                        <MenuItem value="Local Shortage">Local shortage → Procurement</MenuItem>
                        <MenuItem value="Foreign Required">Foreign required → Procurement</MenuItem>
                      </TextField>
                      <TextField select size="small" label="Procurement type" value={storeProcurementType} onChange={(event) => setStoreProcurementType(event.target.value as typeof storeProcurementType)} sx={{ minWidth: 150 }}>
                        <MenuItem value="Local">Local</MenuItem>
                        <MenuItem value="Foreign">Foreign</MenuItem>
                      </TextField>
                      <TextField select size="small" label="Vendor route" value={storeVendorRoute} onChange={(event) => setStoreVendorRoute(event.target.value as typeof storeVendorRoute)} sx={{ minWidth: 190 }}>
                        <MenuItem value="Enlisted Vendor">Enlisted vendor</MenuItem>
                        <MenuItem value="Non-enlisted Vendor">Non-enlisted vendor</MenuItem>
                        <MenuItem value="Single Vendor">Single vendor</MenuItem>
                      </TextField>
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
                      <TextField fullWidth size="small" label="Store review note" value={storeReviewNote} onChange={(event) => setStoreReviewNote(event.target.value)} />
                      <Button variant="contained" disabled={workflowBusy} onClick={() => void saveStoreReview()} sx={{ minWidth: 160 }}>Save store review</Button>
                    </Stack>
                  </Box>
                ) : null}
                {String(selectedCase.procurementType || "") === "Foreign" ? (
                  <Box sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.5, mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Foreign procurement milestones</Typography>
                    <Typography variant="body2" sx={{ color: colors.slate[600], mb: 1.25 }}>
                      Record supplier/customer quotation confirmation, advance confirmation from Accounts, and shipment ETA before the case moves through foreign procurement.
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <TextField select size="small" label="Customer confirmation" value={foreignCustomerConfirmation} onChange={(event) => setForeignCustomerConfirmation(event.target.value as typeof foreignCustomerConfirmation)} sx={{ minWidth: 190 }}>
                        {(["Not Required", "Pending", "Confirmed", "Rejected"] as const).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" label="Advance status" value={foreignAdvanceStatus} onChange={(event) => setForeignAdvanceStatus(event.target.value as typeof foreignAdvanceStatus)} sx={{ minWidth: 170 }}>
                        {(["Not Required", "Pending", "Confirmed", "Partially Paid", "Paid"] as const).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                      </TextField>
                      <TextField size="small" type="number" label="Advance amount" value={foreignAdvanceAmount} onChange={(event) => setForeignAdvanceAmount(event.target.value)} />
                      <TextField size="small" type="date" label="Shipment ETA" slotProps={{ inputLabel: { shrink: true } }} value={foreignShipmentEta} onChange={(event) => setForeignShipmentEta(event.target.value)} />
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
                      <TextField fullWidth size="small" label="Milestone note" value={foreignNote} onChange={(event) => setForeignNote(event.target.value)} />
                      <Button variant="contained" disabled={workflowBusy} onClick={() => void saveForeignMilestone()} sx={{ minWidth: 190 }}>Save foreign milestone</Button>
                    </Stack>
                  </Box>
                ) : null}
                <Box sx={{ border: `1px dashed ${colors.border.default}`, borderRadius: radii.md, p: 1.25, mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Continue this case from here</Typography>
                  <Typography variant="body2" sx={{ color: colors.slate[600], mb: 1 }}>
                    Create or review the next official document without losing the case context. Each document remains linked to this request and appears in the process board after saving.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
                    {String(selectedCase.currentStage || "") === "Quotation Collection" ? <Button size="small" variant="outlined" onClick={() => openCaseComposer("quotation")}>Collect quotation</Button> : null}
                    {String(selectedCase.currentStage || "") === "Compare Sheet Preparation" ? <Button size="small" variant="outlined" onClick={() => openCaseComposer("compare")}>Create compare sheet</Button> : null}
                    {String(selectedCase.currentStage || "") === "PO Creation" ? <Button size="small" variant="outlined" onClick={() => openCaseComposer("order")}>Create purchase order</Button> : null}
                    {String(selectedCase.currentStage || "") === "Chalan / GRN" ? <Button size="small" variant="outlined" onClick={() => openCaseComposer("receipt")}>Create GRN</Button> : null}
                    {String(selectedCase.currentStage || "") === "Procurement File Completion" ? <Button size="small" variant="outlined" onClick={() => openCaseComposer("invoice")}>Create supplier invoice</Button> : null}
                    {String(selectedCase.currentStage || "") === "Bill Settlement" && selectedCase.purchaseInvoiceId ? <Button size="small" variant="outlined" onClick={() => { setTab("payments"); setPaymentOpen(true); }}>Create payment entry</Button> : null}
                  </Stack>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  {caseActions.map((action) => (
                    <Box key={action.action}>
                      <Button
                        variant={action.allowed ? "contained" : "outlined"}
                        disabled={!action.allowed || busyId === selectedCase.id}
                        title={action.disabledReason || undefined}
                        onClick={() => void runCaseAction(action)}
                      >
                        {action.label}
                      </Button>
                      {!action.allowed && action.disabledReason ? (
                        <Typography variant="caption" sx={{ display: "block", color: colors.slate[600], mt: 0.5 }}>
                          {action.disabledReason}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
                {!caseActions.length ? (
                  <Typography variant="body2" sx={{ color: colors.slate[500] }}>
                    No action is available at this stage for your role or the
                    current checklist.
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{ ...cardSx, p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>
                  Audit context
                </Typography>
                <Typography variant="body2">
                  Source:{" "}
                  {String(
                    selectedCase.sourceName ||
                      selectedCase.source ||
                      "Workshop part request",
                  )}
                </Typography>
                <Typography variant="body2">
                  Last updated:{" "}
                  {String(selectedCase.updatedAt || "Not available")}
                </Typography>
                <Typography variant="body2">
                  All transitions, approvals, documents, and settlement entries
                  remain linked to this case.
                </Typography>
              </Box>
              <Box sx={{ ...cardSx, p: 2, background: colors.slate[50] }}>
                <Stack spacing={1.75}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                  >
                    <Box>
                      <Typography variant="overline" sx={{ color: colors.slate[500], fontWeight: 800 }}>
                        Procurement case summary
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {String(selectedCase.title || "Parts procurement request")}
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.slate[600] }}>
                        Case {String(selectedCase.id || "—")} · {String(selectedCase.sourceName || "Workshop request")}
                      </Typography>
                    </Box>
                    <Chip
                      label={String(selectedCase.status || "Open")}
                      color={statusColor(String(selectedCase.status || "Open"))}
                    />
                  </Stack>
                  <Divider />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: colors.slate[500] }}>CURRENT STAGE</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{String(selectedCase.currentStage || selectedCase.stage || "Requested")}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: colors.slate[500] }}>RESPONSIBLE ROLE</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{String(selectedCase.currentOwnerRole || "Unassigned")}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: colors.slate[500] }}>APPROVAL AMOUNT</Typography>
                      <Typography sx={{ fontWeight: 800 }}>৳{Number(selectedCase.approvalAmount || 0).toLocaleString()}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: colors.slate[500] }}>CASE OWNER</Typography>
                      <Typography variant="body2">{String(selectedCase.owner || "Unassigned")}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: colors.slate[500] }}>LAST UPDATED</Typography>
                      <Typography variant="body2">{String(selectedCase.updatedAt || "Not available")}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: colors.slate[500] }}>LAST ACTION</Typography>
                      <Typography variant="body2">{String(selectedCase.lastAction || "No action recorded")}</Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ borderRadius: radii.md, p: 1.5, background: "#fff", border: `1px solid ${colors.border.subtle}` }}>
                    <Typography variant="caption" sx={{ color: colors.slate[500], fontWeight: 800 }}>REVIEW NOTE</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{String(selectedCase.note || "No review note recorded.")}</Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
                    <Chip size="small" variant="outlined" label={`Supplier quotation: ${String(selectedCase.selectedSupplierQuotationId || "Not selected")}`} />
                    <Chip size="small" variant="outlined" label={`Compare sheet: ${String(selectedCase.compareSheetId || "Not created")}`} />
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="caption">
                Company-scoped record · details are loaded from the audited
                backend.
              </Typography>
              {detailLoading ? <CircularProgress size={22} /> : null}
              {selectedModule === "requisitions" && selectedRecord?.id ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    void workshopApi
                      .accountingWorkflow(String(selectedRecord?.id))
                      .then((workflow) =>
                        setSelectedRecord({ ...selectedRecord, workflow }),
                      )
                  }
                >
                  Load linked workflow
                </Button>
              ) : null}
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    printProcessDocument(
                      selectedModule,
                      String(selectedRecord?.id || selectedRecord?.name || ""),
                      selectedModule === "compare_sheets"
                        ? "Comparative Statement"
                        : String(selectedRecord?.doctype || selectedModule || "Document"),
                    )
                  }
                >
                  Print document
                </Button>
                {selectedModule &&
                ["Draft", "0", "Open"].includes(
                  String(
                    selectedRecord?.status ||
                      (Number(selectedRecord?.docstatus) === 1
                        ? "Submitted"
                        : "Draft"),
                  ),
                ) ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      const id = String(
                        selectedRecord?.id || selectedRecord?.name || "",
                      );
                      void submitDocument(selectedModule, id).then(() =>
                        setSelectedRecord(null),
                      );
                    }}
                  >
                    Submit
                  </Button>
                ) : null}
              </Stack>
              {selectedModule === "compare_sheets" && selectedRecord ? (
                (() => {
                  const quotations = compareSheetQuotations(selectedRecord);
                  const quoteTotal = (row: Record<string, unknown>) =>
                    Number(row.grandTotal ?? row.totalAmount ?? row.total ?? 0);
                  const recommended = quotations.reduce<Record<string, unknown> | null>(
                    (best, row) =>
                      !best || quoteTotal(row) < quoteTotal(best) ? row : best,
                    null,
                  );
                  const total = Number(
                    selectedRecord.grandTotal ??
                      selectedRecord.totalAmount ??
                      quotations.reduce((sum, row) => sum + quoteTotal(row), 0),
                  );
                  return (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <Box sx={{ ...cardSx, p: 2, background: colors.slate[50] }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                        >
                          <Box>
                            <Typography variant="overline" sx={{ fontWeight: 800, color: colors.slate[500] }}>
                              Procurement document
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                              Comparative Statement
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.slate[600] }}>
                              {String(selectedRecord.id || selectedRecord.name || "—")} · {String(selectedRecord.company || selectedCompanyId || "—")}
                            </Typography>
                          </Box>
                          <Chip
                            label={String(selectedRecord.status || "Draft")}
                            color={statusColor(String(selectedRecord.status || "Draft"))}
                          />
                        </Stack>
                      </Box>
                      <Box sx={{ overflowX: "auto" }}>
                        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 560, "& th, & td": { borderBottom: `1px solid ${colors.border.subtle}`, p: 1, textAlign: "left" }, "& th": { color: colors.slate[500], fontSize: ".75rem", textTransform: "uppercase" } }}>
                          <Box component="thead">
                            <Box component="tr">
                              <Box component="th">Supplier</Box>
                              <Box component="th">Quotation</Box>
                              <Box component="th">Total</Box>
                              <Box component="th">Status</Box>
                            </Box>
                          </Box>
                          <Box component="tbody">
                            {quotations.map((row, index) => {
                              const isRecommended = row === recommended;
                              return (
                                <Box component="tr" key={String(row.name || row.id || index)} sx={{ background: isRecommended ? "rgba(22, 163, 74, 0.08)" : "transparent" }}>
                                  <Box component="td" sx={{ fontWeight: 700 }}>{String(row.supplierName || row.supplier || row.supplierId || "Unknown supplier")}</Box>
                                  <Box component="td">{String(row.name || row.id || "—")}</Box>
                                  <Box component="td">৳{quoteTotal(row).toLocaleString()}</Box>
                                  <Box component="td"><Chip size="small" label={isRecommended ? "Recommended" : String(row.status || "Submitted")} color={isRecommended ? "success" : "default"} /></Box>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ ...cardSx, p: 2 }}>
                        <Stack spacing={0.75}>
                          <Typography><b>Recommendation:</b> {String(selectedRecord.recommendation || (recommended ? `Lowest compliant quotation from ${String(recommended.supplierName || recommended.supplier || recommended.supplierId || "selected supplier")}` : "No recommendation recorded"))}</Typography>
                          <Typography><b>Compared total:</b> ৳{total.toLocaleString()}</Typography>
                          <Typography variant="body2" sx={{ color: colors.slate[600] }}>Audit verification must be completed before the authorized approval stage. This statement remains linked to the procurement case and can be printed for the file.</Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  );
                })()
              ) : (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    whiteSpace: "pre-wrap",
                    overflow: "auto",
                    fontFamily: "monospace",
                    fontSize: ".8rem",
                  }}
                >
                  {selectedRecord ? JSON.stringify(selectedRecord, null, 2) : ""}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Create{" "}
          {tab === "quotations" ? "supplier quotation" : "material requisition"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="caption">
              Choose master records from the selected company. Search matches
              code, name, and type.
            </Typography>
            {tab === "quotations" && quotationLines.length ? (
              <Stack spacing={1}>
                <Typography sx={{ fontWeight: 800 }}>
                  Parts in this appointment ({quotationLines.length})
                </Typography>
                <Typography variant="caption" sx={{ color: colors.slate[600] }}>
                  One supplier quotation will contain every requested part. Adjust each quantity and rate before creating it.
                </Typography>
                {quotationLines.map((line, index) => (
                  <Box key={line.key} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Autocomplete<MasterOption>
                        fullWidth
                        size="small"
                        loading={mastersLoading}
                        options={itemOptions}
                        value={itemOptions.find((item) =>
                          item.id === line.itemCode ||
                          item.secondary === line.itemCode ||
                          item.label === line.itemCode ||
                          item.label === line.description
                        ) || (line.itemCode ? {
                          id: line.itemCode,
                          label: line.description || line.itemCode,
                          secondary: line.itemCode,
                        } : null)}
                        onChange={(_, value) => setQuotationLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, itemCode: value?.id || "", description: value?.label || item.description } : item))}
                        getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => <TextField {...params} label={`Part ${index + 1}`} required />}
                      />
                      <TextField size="small" label="Qty" type="number" value={line.quantity} onChange={(event) => setQuotationLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} sx={{ width: { sm: 100 } }} />
                      <TextField size="small" label="Rate" type="number" value={line.rate} onChange={(event) => setQuotationLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, rate: event.target.value } : item))} sx={{ width: { sm: 130 } }} />
                    </Stack>
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: colors.slate[600] }}>
                      {line.description || "No description"} · line total {(Number(line.quantity) || 0) * (Number(line.rate) || 0)}
                    </Typography>
                  </Box>
                ))}
                <Button size="small" variant="text" onClick={() => setQuotationLines((current) => [...current, { key: "line-" + Date.now(), itemCode: "", quantity: "1", rate: "0" }])}>
                  Add another part
                </Button>
              </Stack>
            ) : null}
            {tab !== "quotations" || !quotationLines.length ? <Autocomplete<MasterOption>
              loading={mastersLoading}
              options={itemOptions}
              value={
                itemOptions.find((item) => item.id === createItemCode) || null
              }
              onChange={(_, value) => setCreateItemCode(value?.id || "")}
              getOptionLabel={(option) =>
                option.secondary
                  ? `${option.label} · ${option.secondary}`
                  : option.label
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Item / part" autoFocus />
              )}
            /> : null}
            {tab !== "quotations" || !quotationLines.length ? <TextField
              label="Quantity"
              type="number"
              value={createQty}
              onChange={(event) => setCreateQty(event.target.value)}
            /> : null}
            {tab === "quotations" ? (
              <Autocomplete
                loading={mastersLoading}
                options={supplierOptions}
                value={
                  supplierOptions.find(
                    (supplier) => supplier.id === createSupplier,
                  ) || null
                }
                onChange={(_, value) => setCreateSupplier(value?.id || "")}
                getOptionLabel={(option) =>
                  option.secondary
                    ? `${option.label} · ${option.secondary}`
                    : option.label
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField {...params} required label="Supplier" />
                )}
              />
            ) : null}
            {tab === "quotations" ? (
              <TextField
                label="Rate"
                type="number"
                value={createRate}
                onChange={(event) => setCreateRate(event.target.value)}
              />
            ) : null}
            <TextField
              label="Remarks / description"
              multiline
              minRows={2}
              value={createRemarks}
              onChange={(event) => setCreateRemarks(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              createBusy ||
              (tab === "quotations" && quotationLines.length
                ? quotationLines.some((line) => !line.itemCode.trim() || Number(line.quantity) <= 0)
                : !createItemCode.trim()) ||
              (tab === "quotations" && !createSupplier.trim())
            }
            onClick={() => void createDocument()}
          >
            {createBusy ? "Creating…" : "Create draft"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New payment entry</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="caption">
              Select ledger accounts and payment mode from the database. Bank
              payments require reference number and date on the accounting
              record.
            </Typography>
            <TextField
              required
              label="Amount"
              type="number"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
            <Autocomplete
              options={supplierOptions}
              loading={mastersLoading}
              value={
                supplierOptions.find((item) => item.id === paymentParty) || null
              }
              onChange={(_, value) => setPaymentParty(value?.id || "")}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Supplier (optional for internal transfer)"
                />
              )}
            />
            <Autocomplete
              options={accountOptions}
              loading={mastersLoading}
              value={
                accountOptions.find((item) => item.id === paymentFrom) || null
              }
              onChange={(_, value) => setPaymentFrom(value?.id || "")}
              getOptionLabel={(option) =>
                option.secondary
                  ? `${option.label} · ${option.secondary}`
                  : option.label
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Paid from account" />
              )}
            />
            <Autocomplete
              options={accountOptions}
              loading={mastersLoading}
              value={
                accountOptions.find((item) => item.id === paymentTo) || null
              }
              onChange={(_, value) => setPaymentTo(value?.id || "")}
              getOptionLabel={(option) =>
                option.secondary
                  ? `${option.label} · ${option.secondary}`
                  : option.label
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} required label="Paid to account" />
              )}
            />
            <Autocomplete
              options={modeOptions}
              loading={mastersLoading}
              value={
                modeOptions.find((item) => item.id === paymentMode) || null
              }
              onChange={(_, value) => setPaymentMode(value?.id || "")}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Mode of payment" />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              createBusy || !paymentAmount || !paymentFrom || !paymentTo
            }
            onClick={() => void createPayment()}
          >
            {createBusy ? "Creating…" : "Create payment draft"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create compare statement</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="caption">
              Select the supplier quotations to compare. The backend will
              snapshot the quotations and link the statement to the originating
              procurement case.
            </Typography>
            {documents.quotations.map((row) => {
              const id = String(row.name || row.id || "");
              const selected = compareSelection.includes(id);
              return (
                <Stack
                  key={id}
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                    borderBottom: `1px solid ${colors.border.subtle}`,
                    py: 0.5,
                  }}
                >
                  <Checkbox
                    checked={selected}
                    onChange={() =>
                      setCompareSelection((current) =>
                        selected
                          ? current.filter((value) => value !== id)
                          : [...current, id],
                      )
                    }
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{id}</Typography>
                    <Typography variant="caption">
                      {String(row.supplierName || row.supplierId || "Supplier")}{" "}
                      ·{" "}
                      {Number(
                        row.grandTotal || row.totalAmount || 0,
                      ).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
            {!documents.quotations.length ? (
              <Typography sx={{ color: colors.slate[500] }}>
                Create supplier quotations before preparing a compare statement.
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createBusy || compareSelection.length === 0}
            onClick={() => void createCompareSheet()}
          >
            {createBusy ? "Creating…" : "Create compare statement"}
          </Button>
        </DialogActions>
      </Dialog>
    <Dialog
      open={createFromOpen}
        onClose={() => setCreateFromOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {createFromModule === "orders"
            ? "Create Purchase Order from Comparative Statement"
            : createFromModule === "receipts"
              ? "Create GRN from Purchase Order"
              : "Create supplier invoice from GRN"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Choose the submitted/approved source document. The server will
              validate company scope, status, duplication, and approval policy
              before creating the next document.
            </Typography>
            <Autocomplete<Record<string, unknown>>
              options={createFromOptions}
              value={
                createFromOptions.find(
                  (row) => String(row.name || row.id || "") === createFromId,
                ) || null
              }
              onChange={(_, value: Record<string, unknown> | null) =>
                setCreateFromId(
                  value ? String(value.name || value.id || "") : "",
                )
              }
              getOptionLabel={(row) =>
                `${String(row.name || row.id || "")} · ${String(row.supplierName || row.supplierId || row.company || "")}`
              }
              isOptionEqualToValue={(row, value) =>
                String(row.name || row.id || "") ===
                String(value.name || value.id || "")
              }
              renderInput={(params) => (
                <TextField {...params} required label="Source document" />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFromOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createBusy || !createFromId}
            onClick={() => void createFromPrevious()}
          >
            {createBusy ? "Creating…" : "Create linked document"}
          </Button>
      </DialogActions>
    </Dialog>
    <Dialog open={Boolean(printPreview)} onClose={() => setPrintPreview(null)} maxWidth="md" fullWidth>
      <DialogTitle>Printable document preview</DialogTitle>
      <DialogContent dividers>
        {printPreview ? (
          <Box sx={{ background: "#fff", color: colors.slate[900], border: `1px solid ${colors.border.default}`, p: { xs: 2, md: 4 }, minHeight: 360 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", borderBottom: `2px solid ${colors.slate[900]}`, pb: 1.5, mb: 2 }}>
              <Box><Typography variant="h6" sx={{ fontWeight: 800 }}>Continental Works Ltd.</Typography><Typography variant="caption">Workshop Procurement Document</Typography></Box>
              <Chip label="DEMO · PRESENTATION ONLY" color="success" variant="outlined" />
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{printPreview.title}</Typography>
            <Typography variant="body2" sx={{ color: colors.slate[600], mt: 1 }}>Document ID: {printPreview.documentId}</Typography>
            <Typography variant="body2" sx={{ color: colors.slate[600] }}>Procurement case: DEMO-PROC-0001 · Printed: {new Date().toLocaleString()}</Typography>
            <Stack spacing={1} sx={{ mt: 3 }}><Typography><b>Item:</b> Nissan X-Trail · Front brake pad set</Typography><Typography><b>Company:</b> Continental Works</Typography><Typography><b>Amount:</b> ৳128,000</Typography><Divider /><Typography variant="body2">This paper is generated from the full procurement process and remains linked to the case audit trail.</Typography></Stack>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions><Button onClick={() => setPrintPreview(null)}>Close</Button><Button variant="contained" onClick={printMockDocument}>Print document</Button></DialogActions>
    </Dialog>
    <Dialog
      open={demoOpen}
        onClose={() => setDemoOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Continental Works parts procurement walkthrough
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: colors.slate[600], mb: 2 }}>
            This guided walkthrough is presentation-only. It does not create or
            alter operational records.
          </Typography>
          <Stepper
            activeStep={demoStep}
            alternativeLabel
            sx={{ mb: 3, overflowX: "auto" }}
          >
            {PROCUREMENT_DEMO_STEPS.map((step) => (
              <Step key={step.title}>
                <StepLabel>{step.title}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ ...cardSx, p: 2 }}>
            <Typography
              variant="overline"
              sx={{ color: colors.slate[500], fontWeight: 800 }}
            >
              Step {demoStep + 1} · {PROCUREMENT_DEMO_STEPS[demoStep].role}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
              {PROCUREMENT_DEMO_STEPS[demoStep].title}
            </Typography>
            <Typography sx={{ color: colors.slate[700], mt: 1 }}>
              {PROCUREMENT_DEMO_STEPS[demoStep].detail}
            </Typography>
            <Chip
              label={
                demoStep === PROCUREMENT_DEMO_STEPS.length - 1
                  ? "Complete procurement-to-payment cycle"
                  : "Next operational handoff"
              }
              color={
                demoStep === PROCUREMENT_DEMO_STEPS.length - 1
                  ? "success"
                  : "info"
              }
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDemoOpen(false)}>Close</Button>
          <Button
            disabled={demoStep === 0}
            onClick={() => setDemoStep((step) => Math.max(0, step - 1))}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={demoStep === PROCUREMENT_DEMO_STEPS.length - 1}
            onClick={() =>
              setDemoStep((step) =>
                Math.min(PROCUREMENT_DEMO_STEPS.length - 1, step + 1),
              )
            }
          >
            Next
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
