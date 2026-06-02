# MerchantSpace — Seller Portal Custom VTEX · Project Memory

## Project context
- **Objective:** Démo prospects — remplacer le Seller Portal VTEX déprécié par un portal custom
- **Product name:** MerchantSpace
- **Owner:** William Jeanne (VTEX Solution Engineer)
- **Working directory:** `/Users/williamjeanne/External Seller Portal`
- **VTEX Account:** franceretail
- **Region:** Germany · Interface: English
- **Scope:** Mono-seller, no multi-tenancy
- **Data source:** VTEX marketplace APIs (Option A — APIs VTEX natives, pas External Seller Protocol)

## Stack
- Next.js 14+ App Router + TypeScript strict
- Tailwind CSS + shadcn/ui
- Auth: VTEX ID headless exchange (Google OAuth PKCE → VTEX token)
- App Key/Token server-side only (Server Components + Route Handlers proxy)
- Hébergement cible: Vercel
- Charts: recharts (dashboard, Module 2)
- Pas de DB locale — toutes les données viennent des APIs VTEX

## Design system
- Style: Admin SaaS moderne (Sidebar zinc-900, accents indigo-600, Light only)
- Font: Inter (next/font/google)
- Sidebar fixe 240px avec labels + icônes lucide-react
- shadcn/ui comme bibliothèque de composants

## Environment variables required
```
VTEX_ACCOUNT=franceretail
VTEX_APP_KEY=<créer dans Admin VTEX > Account > App Keys>
VTEX_APP_TOKEN=<créer dans Admin VTEX > Account > App Keys>
VTEX_ENVIRONMENT=vtexcommercestable
NEXT_PUBLIC_VTEX_ACCOUNT=franceretail
GOOGLE_CLIENT_ID=<créer dans Google Cloud Console — OAuth 2.0 Client ID>
GOOGLE_CLIENT_SECRET=<depuis Google Cloud Console>
NEXTAUTH_SECRET=<générer: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

## Modules planned
- [x] Module 0 — Setup + VTEX client wrapper
- [x] Module 1 — Auth VTEX ID (Access Key OTP, fallback Google)
- [x] Module 2 — Dashboard (KPIs, recharts, Adyen payout)
- [x] Module 3 — Seller Onboarding (mock Adyen + checklist)
- [x] Module 4 — Catalog Management (list + create product/SKU/price/stock)
- [x] Module 5 — Order Management (list + détail)
- [x] Module 6 — Fulfillment (warehouses + stock update)

## Build order
1. Module 0 → Module 1 (cette session)
2. Module 5 (Orders) — à montrer en premier en démo
3. Module 4 (Catalog)
4. Module 6 (Fulfillment)
5. Module 3 (Onboarding)
6. Module 2 (Dashboard)
7. Polish + seed data

## Session log

### Session 2026-05-27 (cont.) — Catalog v2 + Fulfillment v2
**Fait :**
- **Fix brands API (🔴 blocking)** : `catalog_system/pvt/brand/list` returns 500 → dual-strategy fallback
  1. Try `catalog_system/pvt/brand/list` first
  2. Fallback: extract unique BrandId/BrandName from `stockKeepingUnitById` across first 100 products
- **`VtexProductListItem`** : ajout de `brandId: number` pour supporter le fallback marques
- **Clickable product rows** : `ProductsTable` rows linkent vers `/catalog/[productId]`
- **Product detail/edit page** `/catalog/[productId]` :
  - Server component qui fetch product + SKUs + prices + inventory en parallèle
  - `ProductEditForm` client component : name, category (picker hiérarchique), brand, refId, title, description, isActive
  - Images section : affiche images existantes + formulaire "Add image by URL"
  - SKUs section : `SkuDetailRow` client component avec prix inline + stock inline par warehouse
- **Hierarchical CategoryPicker** : dropdown expand/collapse tree, selected ID en hidden input
- **Catalog tabs** : Products | Brands | Categories (via `?tab=` searchParam)
- **Brands tab** : table + Create/Edit/Delete avec server actions
- **Categories tab** : arborescence + Create root category + Add subcategory
- **Fulfillment v2** :
  - Warehouse CRUD : Create via `CreateWarehouseForm`, Edit/Delete via `WarehouseCard` (client)
  - Dock CRUD : `DocksSection` + `DockCard` + `CreateDockForm`
  - Shipping Policies : read-only table via `GET /api/logistics/pvt/configuration/carriers`
- TypeScript build clean ✅ (19 routes)

**Nouvelles fonctions `lib/vtex/catalog.ts` :**
- `updateSellerProduct()` — GET current → merge → PUT
- `updateSellerSku()` — GET current → merge → PUT
- `getSellerProductFull()` — product + skus + prices + inventory en parallèle
- `addSkuImageByUrl()` — POST `/api/catalog/pvt/stockkeepingunit/{id}/file` avec JSON {Url}
- `getSkuImages()`, `deleteSkuImage()` — lecture/suppression images SKU
- `createSellerBrand()`, `updateSellerBrand()`, `deleteSellerBrand()`
- `createSellerCategory()` — POST `/api/catalog/pvt/category` avec FatherCategoryId
- `createSellerWarehouse()`, `updateSellerWarehouse()`, `deleteSellerWarehouse()`
- `getSellerDocks()`, `createSellerDock()`, `updateSellerDock()`, `deleteSellerDock()`
- `getShippingPolicies()` — GET `/api/logistics/pvt/configuration/carriers`

**Nouveaux server actions `lib/actions/catalog.ts` :**
- `updateProductAction`, `updateSkuPriceAction`, `updateSkuInventoryAction`
- `addSkuImageUrlAction`
- `createBrandAction`, `updateBrandAction`, `deleteBrandAction`
- `createCategoryAction`

**Nouveaux composants :**
- `components/catalog/CategoryPicker.tsx` — hierarchical expand/collapse picker
- `components/catalog/ProductEditForm.tsx` — client form for product detail
- `components/catalog/SkuDetailRow.tsx` — SKU with inline price + stock edit
- `components/catalog/AddImageForm.tsx` — add image by URL
- `components/catalog/BrandsTab.tsx` — brands CRUD table
- `components/catalog/CategoriesTab.tsx` — categories tree + create
- `components/fulfillment/DockCard.tsx`, `CreateDockForm.tsx`, `DocksSection.tsx`
- `components/fulfillment/CreateWarehouseForm.tsx`, `WarehousesSection.tsx`

---

### Session 2026-05-27
**Fait :**
- Fix auth : access key OTP flow (Plan C) — Google headless exchange non compatible sans OAuth provider custom dans VTEX Admin
- Fix validation 401 : suppression de `validateVtexToken` après OTP (OTP = preuve d'ownership email)
- Fix 404s sur Orders/Catalog/Fulfillment/Onboarding/Settings
- Module 5 terminé : liste des orders avec filtres (status + search), page de détail order (items + summary cards)
- Seller filter appliqué : `f_sellerNames=franceretailer1388` via `VTEX_SELLER_ID` env var
- `vtexSellerFetch()` ajouté dans `lib/vtex/client.ts` pour les calls sur `franceretailer1388.vtexcommercestable.com.br`
- Module 3 terminé : Onboarding page avec SellerProfile, IntegrationCards, PaymentSchedule (Adyen mock), SetupChecklist
- TypeScript build clean ✅

**Notes techniques :**
- Auth : `POST /api/vtexid/pub/authentication/accesskey/send` + `POST .../validate` — pas besoin de `credential/validate` (OTP = email ownership)
- Google headless exchange bloqué : VTEX native Google/Facebook = configuré via VTEX Admin, pas compatible headless exchange sans custom OAuth provider
- Dual credentials : `vtexFetch` (franceretail marketplace) + `vtexSellerFetch` (franceretailer1388 seller) — seller App Key/Token à créer
- `lib/format.ts` : `formatPrice(cents)` → fr-FR locale, EUR

**Action requise avant Module 4 :**
- Créer App Key/Token pour `franceretailer1388` dans VTEX Admin → `.env.local` comme `VTEX_SELLER_APP_KEY` + `VTEX_SELLER_APP_TOKEN`

---

### Session 2026-05-22
**Fait :**
- Analyse et plan complet Module 0 + 1
- Validation des signatures VTEX API via MCP (endpoints 3122, 3115, 3116)
- Choix auth: Headless Exchange (Option B) — domain-agnostic pour Vercel
- Module 0 terminé : Next.js 16.2.6 App Router, shadcn/ui (Radix), VTEX client typé, design system MerchantSpace
- Module 1 terminé : auth flow complet (Google OAuth → VTEX exchange → cookies), sidebar, topbar, middleware (proxy.ts)
- Build TypeScript clean ✅

**Notes techniques :**
- Next.js 16 : `middleware.ts` → `proxy.ts` + export nommé `proxy` (plus `middleware`)
- shadcn v4 : `toast` déprécié → utiliser `sonner`
- Inter font configurée via `--font-sans` CSS variable

**Décisions prises → voir Decisions log**

---

## Decisions log

### Auth — Headless Exchange (2026-05-22)
- **Décision:** Utiliser `POST /api/vtexid/audience/webstore/provider/oauth/exchange` au lieu du redirect VTEX classique
- **Raison:** `VtexIdclientAutCookie` est scopé sur `*.vtexcommercestable.com.br` → inutilisable depuis Vercel. L'exchange renvoie un `authToken` qu'on set comme cookie httpOnly sur notre domaine.
- **Cookie:** `vtex_auth` (authToken, 120 min) + `vtex_user` (email/id JSON, 120 min)

### Google Client ID — Indépendant (2026-05-22)
- **Décision:** Créer un Google OAuth Client ID perso (pas celui de VTEX Admin franceretail)
- **Raison:** On ne peut pas ajouter `localhost:3000` aux redirect URIs d'un Client ID corporate VTEX
- **Pourquoi ça marche:** VTEX valide le Google access_token via `oauth2.googleapis.com/tokeninfo` — il ne vérifie pas que le Client ID correspond à son admin. Il utilise l'email retourné par Google.
- **Plan C fallback:** Si exchange échoue, bouton "Use access key" (email OTP) sur `/login`

### validate() — Une seule fois au callback (2026-05-22)
- **Décision:** Appeler `POST /api/vtexid/credential/validate` une seule fois dans le callback handler
- **Raison:** Éviter un round-trip réseau VTEX à chaque page load
- **Implémentation:** Résultat `{ user (email), id }` stocké dans cookie `vtex_user` httpOnly

### Package manager — npm (2026-05-22)
- **Décision:** npm (défaut create-next-app)

---

## VTEX API endpoints implemented

### Module 1 — Auth
| Endpoint | ID MCP | Méthode | Notes |
|---|---|---|---|
| `/api/vtexid/pub/authentication/start` | 3122 | GET | Query: `scope` (account name) |
| `/api/vtexid/audience/{account}/{env}/webstore/provider/oauth/exchange` | 3115 | POST | Body: `{ providerId, accessToken, duration: 120 }` → `{ authToken }` |
| `/api/vtexid/credential/validate` | 3116 | POST | Body: `{ token }` → `{ id, user, account, authStatus }` |

---

## Open questions / Blockers

- [x] ~~**AVANT MODULE 4:** Créer App Key/Token pour `franceretailer1388`~~ — fait, `VTEX_SELLER_APP_KEY` + `VTEX_SELLER_APP_TOKEN` dans `.env.local`
- [x] ~~**MODULE 4:** Confirmer API pour création produit seller~~ — utilise `catalog/pvt/product` (POST) + `catalog/pvt/stockkeepingunit` (POST)
- [x] ~~**AVANT TEST MODULE 1:** Créer Google OAuth Client ID~~ (non nécessaire — Access Key OTP utilisé)
- [x] ~~**AVANT TEST MODULE 1:** Confirmer providerId: "Google"~~ (Google exchange non utilisé)

### À implémenter sessions futures
- [ ] **Image upload local** (fichier) : `POST /api/catalog/pvt/stockkeepingunit/{id}/file` multipart — actuellement URL only
- [ ] **Pricing tab** dans `/catalog?tab=pricing` — tableau de tous les SKUs avec prix courant + edit inline
- [ ] **Shipping Policies create/edit** — `POST /api/logistics/pvt/configuration/carriers`
- [ ] **Product duplication** — clone product + SKU
- [ ] **SKU add/delete** dans product detail page

---

## Known gotchas (Next.js 16 specific)
- `middleware.ts` → renommé `proxy.ts` + export `proxy` (pas `middleware`) en Next.js 16
- shadcn v4 : composant `toast` déprécié → utiliser `sonner`
- `create-next-app` refuse les noms de dossiers avec espaces/majuscules → générer dans un dossier temp puis déplacer

## Known gotchas (VTEX)

- `VtexIdclientAutCookie` est scopé sur `*.vtexcommercestable.com.br` — ne JAMAIS essayer de lire ce cookie depuis une app sur domaine custom (Vercel)
- L'exchange endpoint prend `accessToken` = Google access_token (pas l'id_token)
- `POST /api/vtexid/credential/validate` retourne `user` = email (pas `email` directement)
- duration max de l'exchange = 120 min. Prévoir refresh ou ré-auth après expiration.
- Pagination VTEX : OMS/Catalog utilisent header `REST-Range`, Master Data utilise `_from`/`_to` query params — standardisé dans le wrapper

## VTEX Admin URLs utiles
- App Keys: `https://franceretail.myvtex.com/admin/license-manager/#/home`
- Auth settings: `https://franceretail.myvtex.com/admin/account-settings/authentication`
