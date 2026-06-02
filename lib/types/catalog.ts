/** VTEX Catalog types — Module 4 */

// ─── Catalog system search result ───────────────────────────────────────────

export interface VtexProductSearchItem {
  itemId: string;
  name: string;
  nameComplete: string;
  images: Array<{ imageId: string; imageLabel: string; imageUrl: string }>;
  sellers: Array<{
    sellerId: string;
    commertialOffer: {
      Price: number;
      ListPrice: number;
      AvailableQuantity: number;
    };
  }>;
}

export interface VtexProductSearchResult {
  productId: string;
  productName: string;
  brand: string;
  brandId: number;
  categoryId: string;
  categories: string[];
  link: string;
  linkText: string;
  productReference: string;
  description: string;
  isActive?: boolean;
  items: VtexProductSearchItem[];
}

// ─── Raw product (Catalog API) ───────────────────────────────────────────────

export interface VtexProduct {
  Id: number;
  Name: string;
  DepartmentId: number;
  CategoryId: number;
  BrandId: number;
  LinkId: string;
  RefId: string | null;
  IsVisible: boolean;
  Description: string;
  IsActive: boolean;
  Title: string;
  MetaTagDescription: string;
  Score: number | null;
}

// ─── SKU ─────────────────────────────────────────────────────────────────────

export interface VtexSku {
  Id: number;
  ProductId: number;
  IsActive: boolean;
  Name: string;
  RefId: string;
  PackagedHeight: number;
  PackagedLength: number;
  PackagedWidth: number;
  PackagedWeightKg: number;
  Height: number | null;
  Length: number | null;
  Width: number | null;
  WeightKg: number | null;
  CubicWeight: number;
  IsKit: boolean;
  CreationDate: string;
  RewardValue: number | null;
  EstimatedDateArrival: string | null;
  ManufacturerCode: string;
  CommercialConditionId: number;
  MeasurementUnit: string;
  UnitMultiplier: number;
  ModalType: string | null;
  KitItensSellApart: boolean;
  Videos: string[];
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface VtexCategory {
  id: number;
  name: string;
  hasChildren: boolean;
  url: string;
  children: VtexCategory[];
  Title: string;
  MetaTagDescription: string;
  isActive?: boolean;
}

// ─── Brand ───────────────────────────────────────────────────────────────────

export interface VtexBrand {
  id: number;
  name: string;
  isActive: boolean;
  title: string | null;
  metaTagDescription: string | null;
  imageUrl: string | null;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface VtexPrice {
  itemId: string;
  listPrice: number | null;
  costPrice: number;
  markup: number;
  basePrice: number;
  fixedPrices?: Array<{
    tradePolicyId: string;
    value: number;
    listPrice: number | null;
    minQuantity: number;
    dateRange?: { from: string; to: string };
  }>;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface VtexWarehouse {
  id: string;
  name: string;
  warehouseDocks: Array<{ dockId: string; time: string; cost: string }>;
}

export interface VtexInventoryBalance {
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  reservedQuantity: number;
  hasUnlimitedQuantity: boolean;
  timeToRefill: string | null;
  dateOfSupplyUtc: string | null;
}

// ─── Logistics ───────────────────────────────────────────────────────────────

export interface VtexDock {
  id: string;
  name: string;
  priority: number;
  dockTimeFake: string;
  timeFakeOverhead: string;
  salesChannels: Array<{ id: string }>;
  warehouseIds: string[];
  wmsEndPoint: string;
  pickupStoreInfo: { isPickupStore: boolean; storeId: string | null };
}

export interface VtexCarrier {
  id: string;
  name: string;
  slaType: string;
  isActive: boolean;
  maxDimension: {
    weight: number;
    width: number;
    height: number;
    length: number;
    maxSumDimension: number;
  };
  exclusiveToDeliveryPoints: boolean;
  minimumValueInsurance: number;
}

// ─── Form input types ─────────────────────────────────────────────────────────

export interface CreateProductInput {
  // Product
  productName: string;
  categoryId: number;
  brandId: number;
  refId: string;
  description: string;
  // SKU
  skuName: string;
  skuRefId: string;
  weightKg: number;
  height: number;
  width: number;
  length: number;
  // Pricing (in EUR, will be converted to cents)
  listPrice: number;
  sellingPrice: number;
  // Stock
  quantity: number;
}

export interface UpdateProductInput {
  productName: string;
  categoryId: number;
  brandId: number;
  refId: string;
  description: string;
  title: string;
  isActive: boolean;
}

export interface UpdateSkuInput {
  name: string;
  refId: string;
  isActive: boolean;
  weightKg: number;
  height: number;
  width: number;
  length: number;
}

export interface CreateBrandInput {
  name: string;
  isActive: boolean;
}

export interface CreateCategoryInput {
  name: string;
  parentCategoryId: number | null;
}
