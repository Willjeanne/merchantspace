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
- [ ] Module 7 — MCP server (`app/api/mcp`) : actions sur le compte Seller Portal depuis claude.ai
  - [x] Phase 1a — adressage seller-side + `start-handling` (43 outils)
  - [x] Phase 1b — `vtex_invoice_order` = dispatch (44 outils) · **validé en live**
        *(`cancel` / `tracking` écartés du scope)*
  - [~] Phase 2 — sellers / onboarding : lecture OK (46 outils), erreurs de permission
        rendues lisibles *(écritures Seller Register toujours bloquées)*
  - [x] Phase 3 — shipping policies read/create/update (49 outils) · validé en live
  - [x] Fix docks/warehouses : updates réparés + `freightTableIds` exposé (51 outils)
  - [x] Tables de fret + chaîne shipping complète (57 outils) · validé en live
  - [ ] Phase 4 — images SKU *(bloqué : permission `vtex.catalog-images`)*

## Build order
1. Module 0 → Module 1 (cette session)
2. Module 5 (Orders) — à montrer en premier en démo
3. Module 4 (Catalog)
4. Module 6 (Fulfillment)
5. Module 3 (Onboarding)
6. Module 2 (Dashboard)
7. Polish + seed data

## Session log

### Session 2026-09-03 (cont.) — tables de fret + chaîne shipping complète

**Objectif :** tout piloter depuis claude.ai, y compris la table de fret, et pouvoir
câbler warehouse → dock → shipping policy → trade policy.

**Pas besoin d'upload de fichier.** `POST /configuration/freights/{carrierId}/values/update`
prend un tableau JSON. Le `carrierId` **est l'id de la shipping policy**.

**Sémantique établie en live sur la policy `2` :**
| `operationType` | Effet |
|---|---|
| `1` | **UPSERT** sur la clé (plage CP + plage poids + pays). Réémettre une ligne identique ne duplique pas ; avec un prix différent, ça met à jour (5 → 9 observé) |
| `2` | update, idem |
| `3` | supprime cette ligne, laisse les autres |

Donc **les écritures n'ont jamais besoin de lire la table** — ce qui tombe bien, car
**la table n'est pas lisible en entier** : `/{carrierId}/values` renvoie 500, seul
`/{carrierId}/{codePostal}/values` répond. Un write est un upsert des lignes nommées,
pas un remplacement.

**Fait :**
- `lib/vtex/freight-rates.ts` : `listFreightTables()`, `getFreightRates()`,
  `setFreightRates()`, `deleteFreightRates()`. Entrée en euros et en jours ; conversions
  internes (complétion CP à 8 chiffres, prix en chaîne décimale, `timeCost` en
  `D.HH:MM:SS`). `assertNoOverlap()` refuse les plages qui se chevauchent **avant** tout
  appel. Lecture réduite aux champs porteurs (la brute renvoie une douzaine de `null`).
- `lib/vtex/shipping-setup.ts` : `listTradePolicies()` et `checkShippingSetup()`, qui
  parcourt la chaîne et dit ce qui manque. Sonde optionnelle par code postal.
- `lib/mcp/tools/shipping.ts` : **nouveau fichier** regroupant tout le shipping — les 4
  outils policy y ont été déplacés depuis `catalog.ts` (qui redescend à 564 lignes), plus
  `vtex_list_freight_tables`, `vtex_get_freight_rates`, `vtex_set_freight_rates`,
  `vtex_delete_freight_rates`, `vtex_list_trade_policies`, `vtex_check_shipping_setup`.
- `vtex_update_dock` expose désormais aussi **`salesChannels`** — le maillon trade policy.
- **57 outils.**

**Vérifié en live** : garde-fou de chevauchement → refus avec la plage fautive nommée,
rien envoyé ; table demandée posée sur la policy 2 (5 € `00000001`–`00031000` J+1, 6 €
`00031001`–`00099999` J+2) ; `vtex_check_shipping_setup` policy 2 + CP 75001 →
**`ready: true`**, dock `1`, trade policy `1`, warehouse `1_1`, cote 6 €.

### Session 2026-09-03 — 🔴 docks & warehouses : deux outils cassés depuis toujours

**Déclencheur :** une session claude.ai a créé la policy `2` avec
`vtex_create_shipping_policy`, puis a refusé de rattacher le dock, en expliquant que
`vtex_update_dock` n'expose que `dockId/name/warehouseIds` et que l'endpoint remplace
tout — donc que l'appeler effacerait `freightTableIds`. Ce raisonnement était juste sur
le fond et a évité une casse.

**Ce que la vérification a montré — les deux outils ne marchaient pas du tout :**
- `POST /api/logistics/pvt/configuration/docks/{dockId}` → *« The requested resource does
  not support http method 'POST' »*
- `PUT /api/logistics/pvt/configuration/warehouses/{id}` → même refus sur `PUT`

L'update **partage l'endpoint de création** : `POST` sur la collection, l'`id` dans le
corps (« Create or update dock/warehouse »). Donc `vtex_update_dock` et
`vtex_update_warehouse` échouaient à chaque appel depuis leur écriture. Rien n'a jamais
été détruit — mais rien n'a jamais fonctionné non plus.

**Le second bug, réel dès que le chemin est corrigé** : les deux envoyaient un corps codé
en dur. Sur le dock `1`, un simple renommage aurait effacé `freightTableIds: ["1"]`
(déliant Standard Delivery du calcul de frais), effacé `isActive`, remis `priority` de 1
à 0, et envoyé `salesChannels: [{id:"1"}]` là où VTEX utilise `["1"]`.

**Fait :**
- `lib/types/catalog.ts` : `VtexDock` corrigé (`salesChannels: string[]`, ajout de
  `freightTableIds`, `isActive`, `warehouseIds` **optionnel** — ce compte ne le renvoie
  pas) ; `VtexWarehouse` complété (`pickupPointIds`, `priority`, `isActive`, `sellerId`,
  `cost: number | string`).
- `lib/vtex/catalog.ts` : `getSellerDock()`, `getSellerWarehouse()`, et les deux updates
  réécrits en read-modify-write sur le bon endpoint. `readBackUntil()` ajouté — voir
  gotcha propagation asynchrone.
- `lib/mcp/tools/catalog.ts` : `vtex_get_dock`, `vtex_get_warehouse` ; `vtex_update_dock`
  expose enfin **`freightTableIds`** (le rattachement policy ↔ dock), `priority`,
  `isActive` ; `vtex_update_warehouse` expose `priority`, `isActive`, `pickupPointIds`.
  Tous les champs deviennent optionnels. **51 outils.**
- `components/fulfillment/DockCard.tsx` : garde sur `warehouseIds` désormais optionnel.

**Vérifié en live** : policy `2` rattachée au dock `1` → `freightTableIds: ["1","2"]`,
`priority` et `isActive` intacts ; renommage du dock → `freightTableIds` **préservé** ;
renommage du warehouse → docks, `priority`, `isActive`, `pickupPointIds` **préservés** ;
`vtex_list_shipping_policies` montre les deux policies liées au dock. Noms d'origine
restaurés.

### Session 2026-09-02 (cont.) — MCP Phase 3 : shipping policies

**Fait :** `lib/vtex/shipping-policies.ts` (nouveau fichier — `catalog.ts` est déjà à
1189 lignes, au-delà du max de 800 ; extraire sa moitié logistique reste à faire, séparément)
avec `listShippingPolicies()`, `getShippingPolicy()`, `createShippingPolicy()`,
`updateShippingPolicy()`. Outils MCP : `vtex_get_shipping_policy`,
`vtex_create_shipping_policy`, `vtex_update_shipping_policy`, et
`vtex_list_shipping_policies` **repointé** de `/configuration/carriers` vers
`/shipping-policies` pour que lecture et écriture MCP désignent le même objet.
**49 outils.** La page Fulfillment continue de lire `/configuration/carriers` via
`getShippingPolicies()` — divergence assumée, non touchée.

**Vérifié en live** : création de la policy `2` (défauts + champs exposés corrects) ;
update du nom seul → `numberOfItemsPerShipment`, flags week-end et dimensions **préservés** ;
update d'un seul flag → seul ce flag change.

La policy de test `2` créée pour valider a été **supprimée** (`DELETE
/api/logistics/pvt/shipping-policies/2` → 204). Le compte est revenu à sa seule policy
`1` « Standard Delivery ». `DELETE` fonctionne donc sur cette ressource, mais **n'est pas
exposé en outil MCP** — hors du scope demandé (création/modification).

### Session 2026-09-02 (cont.) — MCP Phase 2 : sellers / onboarding

**Fait :**
- `lib/vtex/client.ts` : `assertJsonResponse()` sur les deux fetchers — une permission
  manquante arrivait en HTTP 200 `text/html` et cassait au `JSON.parse`. Voir gotchas ;
  c'est la cause racine de **deux** outils cassés, pas un correctif cosmétique.
  `VtexUnauthorizedError` accepte désormais un message explicite (2e arg optionnel).
- `lib/vtex/sellers.ts` : `catch { return [] }` retiré de `getSellerCommissions` ;
  ajout de `listSellers()` et `getSeller()` + type `VtexCatalogSeller` sur la surface
  Catalog System, qui marche avec la clé actuelle.
- `lib/mcp/tools/sellers.ts` : `vtex_list_sellers`, `vtex_get_seller`. **46 outils.**
  Description de `vtex_get_seller_commissions` amendée : dit explicitement que l'échec est
  une permission et qu'il ne faut pas le lire comme « aucune commission ».

**Vérifié en live** : 46 outils ; `vtex_list_sellers` → 11 sellers ; `vtex_get_seller`
→ `franceretailer1388` actif, `SellerType: 1` ; `vtex_get_seller_commissions` → erreur
*exploitable* (« missing the License Manager resource… a permission to grant, not a code
error ») au lieu de `Unexpected token '<'`. Non-régression vérifiée sur `vtex_list_products`,
`vtex_list_seller_orders`, `vtex_list_warehouses` — les deux fetchers passent.

**Reste bloqué sur permission :** `vtex_get_seller_commissions` (overrides par catégorie),
mapping sales-channel, et `vtex_create_or_update_seller` — dont l'échec est maintenant
lisible mais toujours un échec. `vtex_upsert_seller_commissions` n'a pas été testé (écriture
sur une surface dont les lectures échouent déjà).

### Session 2026-09-02 — MCP : actions sur les commandes (Phase 1)

**Contexte :** étendre le MCP pour que les users puissent *agir* sur le compte Seller Portal
depuis claude.ai, et pas seulement lire. Décision de scope : mono-compte
(`franceretailer1388`), le multi-compte plus tard. Pas de couche de résolution de
credentials ajoutée — les 8 lignes en tête de `lib/vtex/client.ts` centralisent déjà
toutes les lectures d'env, c'est le point d'isolation ; en créer un second n'aurait rien
apporté aujourd'hui.

**🔴 Découverte structurante — l'OMS du compte seller est une surface distincte**

Le compte seller fait tourner **son propre OMS**, qui contient la contrepartie
fulfillment de chaque commande marketplace, avec un **autre id** et un **autre
vocabulaire de statuts** :

| Surface | Exemple d'id | Statut |
|---|---|---|
| `franceretail` + `f_sellerNames` (`vtex_list_orders`) | `1636850500482-01` | `payment-approved` |
| `franceretailer1388` OMS propre (`vtex_list_seller_orders`) | `FRN-1636850500005-01` | `waiting-seller-handling` |

**Seuls les ids `FRN-...` sont acceptés par les endpoints d'action.** Un id marketplace
passé à `start-handling` renvoie 404. C'était le vrai trou : avant cette session le MCP
n'exposait que des ids non actionnables.

Le lien entre les deux est visible dans le payload seller : `origin: "Chain"`,
`marketplaceServicesEndpoint: "...?an=franceretail"`, `affiliateId: "FRN"`,
`sellerOrderId: "00-FRN-1636850500005-01"`. En revanche `marketplaceOrderId` est **vide**
sur ces commandes chaînées — ne pas compter dessus pour remonter à la commande marketplace.

**Fait :**
- `lib/types/orders.ts` : `VtexSellerOrderSummary`, `VtexSellerOrdersListResponse`,
  `VtexSellerOrderDetail`, `SellerOrderListParams`. Le `status` y est une `string` libre
  et non l'union `OrderStatus` — voir gotchas.
- `lib/vtex/orders.ts` : `listSellerOrders()`, `getSellerOrder()`,
  `startHandlingSellerOrder()` (POST puis relecture du détail).
- `lib/mcp/tools/orders.ts` : `vtex_list_seller_orders`, `vtex_get_seller_order`,
  `vtex_start_handling_order`, `vtex_invoice_order`. Descriptions des 3 outils marketplace
  amendées pour dire explicitement que leurs ids ne sont pas actionnables. **44 outils** au
  total (40 avant).
- `invoiceSellerOrder()` — **l'action de dispatch**, celle qui fait réellement avancer une
  commande sur ce compte. Tout est dérivé de la commande : `items` (prix UNITAIRE en
  centimes, l'OMS multiplie par la quantité), `invoiceValue` ← `order.value`,
  `issuanceDate`, `invoiceNumber` généré (`INV-<sequence>-<ISO compact>`). Pas de tracking
  envoyé avec la facture — il vient plus tard, quand un transporteur a une vraie donnée.
  Refuse d'emblée si `invoicedDate` est déjà posé (une re-notification ne fait que
  régénérer le `receipt`). Deux formes d'échec distinctes et volontaires : une précondition
  refusée **throw** (rien n'a été tenté), `ok: false` veut dire que VTEX a été appelé et
  que la commande n'a pas bougé.
  `invoiceValue` est envoyé en **number** alors que l'OpenAPI le type en `string` :
  **accepté par l'OMS**, vérifié en live.
- `readOrderAfterAction()` — relecture avec relances (2s, 3s, 5s ≈ 10s) au lieu d'une
  relecture immédiate. Ajouté après un **faux négatif** : voir gotcha « transitions
  asynchrones ». Le résultat porte désormais `outcome: "applied" | "accepted-pending"` en
  plus de `ok`, pour ne plus confondre « ça n'a pas marché » et « pas encore visible ».
- `SellerOrderActionResult` : toute action commande relit la commande avant/après et
  renvoie `ok: false` + `message` si le statut n'a pas bougé — protection contre un 2xx
  sans effet, que la doc VTEX annonce explicitement. Coût : un GET de plus par action.
- **Vérifié de bout en bout via la route MCP locale** : `tools/list` → 43 outils ;
  `vtex_list_seller_orders` → 3 commandes ; `vtex_get_seller_order` →
  `allowCancellation: true`, `allowEdition: false` ; `vtex_start_handling_order` →
  **erreur remontée correctement** : `OMS003 — Order status should be ready-for-handling`
  (HTTP 400), message VTEX intact jusqu'à l'appelant. Auth MCP validée sur les deux
  chemins (header `Bearer` et `?token=`). `vtex_invoice_order` : enregistré (44 outils) et
  test négatif OK — un orderId inexistant échoue à la relecture *avant* tout POST
  (`Resource not found`). **POST de facture exécuté en live sur `FRN-1636850500005-01`** →
  `invoiced` / « Faturado », `invoicedDate: 2026-09-02T10:35:42`, package attaché portant
  notre `INV-500005-20260902T103536` et `invoiceValue: 11996`. Garde-fou anti-double
  facturation vérifié ensuite : second appel refusé avant tout POST.
  **Non vérifié :** le chemin de relance de `readOrderAfterAction` face à une vraie
  transition asynchrone — il faudra une prochaine facture pour l'exercer (attendu
  `outcome: "applied"`).
  **État des commandes de démo : 1 des 3 consommée** (`FRN-1636850500005-01` est
  définitivement `invoiced`). Restent `FRN-1636850500003-01` et `FRN-1636850500001-01`.

**⚠️ Conséquence de plan :** sur ce compte, le verbe qui fait avancer une commande depuis
`waiting-seller-handling` est la **facture** (dispatch), pas `start-handling` — VTEX le dit
lui-même via `OMS003`. La facture n'est donc pas cosmétique comme supposé au départ : c'est
l'action porteuse de la Phase 1.

**Scope commandes refermé** (décision du 2026-09-02) : le besoin est « connaître le statut
côté seller » + « dire qu'on expédie ». Les deux sont couverts. `vtex_cancel_order` et
`vtex_send_order_tracking` sont **volontairement écartés** — non demandés, et hors de ce
besoin. À rouvrir seulement si la démo l'exige.

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

### Phase 1 MCP — actions commandes (compte seller)
| Endpoint | ID MCP | Méthode | Notes |
|---|---|---|---|
| `/api/oms/pvt/orders` | 4399 | GET | Sur le **compte seller**. Pas de `f_sellerNames`. Passe par l'index → retarde |
| `/api/oms/pvt/orders/{orderId}` | 4398 | GET | Ids `FRN-...`. Expose `allowCancellation` / `allowEdition`. Pas d'index |
| `/api/oms/pvt/orders/{orderId}/start-handling` | 3966 | POST | Pas de body. **204** attendu, 409 si transition interdite |
| `/api/oms/pvt/orders/{orderId}/cancel` | 3967 | POST | *à implémenter* — vérifier `allowCancellation` avant |
| `/api/oms/pvt/orders/{orderId}/invoice` | 3889 | POST | *à implémenter* — `invoiceValue` en **centimes** |
| `/api/oms/pvt/orders/{orderId}/invoice/{invoiceNumber}` | 3968 | PATCH | *à implémenter* — tracking, après la facture |
| `/api/vtexid/apptoken/login` | 3796 | POST | App Key/Token → `VtexIdclientAutCookie`. Pas de header d'auth (creds dans le body) |
| `/api/logistics/pvt/shipping-policies` | 3685/3686/3683/3684 | GET/POST/PUT/DELETE | Phase 3. Testé 200 côté seller. ≠ `/configuration/carriers` que l'app lit aujourd'hui |
| `/api/catalog_system/pvt/seller/list` | 3297 | GET | Phase 2. **Testé 200**, sans permission supplémentaire. Porte les taux au niveau compte |
| `/api/catalog_system/pvt/seller/{sellerId}` | 3298 | GET | Phase 2. **Testé 200**. `/sellers/{id}` (3301) marche aussi |
| `/seller-register/pvt/sellers/{id}/commissions` | 4292 | GET | **Bloqué** : 4 redirections → `/admin/login/` en 200 HTML. Permission Seller Register |

---

## Open questions / Blockers

- [x] ~~**AVANT MODULE 4:** Créer App Key/Token pour `franceretailer1388`~~ — fait, `VTEX_SELLER_APP_KEY` + `VTEX_SELLER_APP_TOKEN` dans `.env.local`
- [x] ~~**MODULE 4:** Confirmer API pour création produit seller~~ — utilise `catalog/pvt/product` (POST) + `catalog/pvt/stockkeepingunit` (POST)
- [x] ~~**AVANT TEST MODULE 1:** Créer Google OAuth Client ID~~ (non nécessaire — Access Key OTP utilisé)
- [x] ~~**AVANT TEST MODULE 1:** Confirmer providerId: "Google"~~ (Google exchange non utilisé)

### 🔴 Permissions App Key à accorder (bloquent des phases entières)
- [ ] **Clé seller** `vtexappkey-franceretailer1388-WXXYMH` → ressource `vtex.catalog-images`.
      Débloque l'upload d'images SKU depuis le MCP (Phase 4). Symptôme actuel : 403
      `cannot perform action POST on resource vrn:vtex.catalog-images:.../_v/image-upload`
- [ ] **Clé marketplace** → ressources Seller Register / Marketplace. Débloque
      `vtex_get_seller`, le mapping sales-channel, et répare `vtex_get_seller_commissions`
      + `vtex_create_or_update_seller`. Symptôme actuel : 302 vers `Admin/Site/Login.aspx`

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

- **L'OMS du compte seller ≠ l'OMS du marketplace.** Deux ids, deux vocabulaires de
  statuts, non interchangeables. Les endpoints d'action (`start-handling`, `cancel`,
  `invoice`) ne travaillent que sur l'OMS du compte propriétaire de la commande — donc le
  compte seller, avec les ids `FRN-...`. Détail dans le log de session 2026-09-02.
- **🔴 `start-handling` exige le statut `ready-for-handling` — établi.** Sur
  `FRN-1636850500005-01` (`waiting-seller-handling`), VTEX répond **HTTP 400** avec
  `{"error":{"code":"OMS003","message":"Order status should be ready-for-handling to
  perform this action"}}`. Reproduit à l'identique via la route MCP et en `curl` direct.
  Le verbe est donc inapplicable à une commande chaînée déjà autorisée
  (`authorizedDate` posé, `statusDescription: "Aguardando despacho do seller"`) : elle
  attend un **dispatch (facture)**, pas une prise en charge.
  Conséquence pratique : sur ce compte, aucune commande seller ne semble passer par un
  vrai `ready-for-handling` (la *liste* l'affiche, le *détail* dit
  `waiting-seller-handling` — c'est l'index qui ment, voir gotcha suivant). Garder l'outil,
  mais ne pas compter dessus pour la démo.
- **Le wrapper gère correctement les 4xx — hypothèse abandonnée.** On avait soupçonné
  `vtexSellerFetch` de prendre tout 2xx pour un succès et de masquer un échec. Faux :
  le 400 lève bien un `VtexApiError`, `safe()` le remonte en `isError`, et le message VTEX
  arrive intact jusqu'à l'appelant. Aucun correctif à faire dans le wrapper.
  Reste **une observation isolée jamais reproduite** : un premier appel avait renvoyé le
  détail de la commande sans erreur. Piste la plus plausible (non prouvée) : le contrôle
  de workflow côté VTEX avait lu le statut *indexé* (`ready-for-handling`) et non le vrai.
  Ne pas bâtir sur cette hypothèse.
- **🔴 Les transitions de workflow OMS sont ASYNCHRONES — ne jamais vérifier par une seule
  relecture immédiate.** Mesuré : facture notifiée à `10:35:36`, appliquée à la commande à
  `10:35:42` — **6 secondes**. Une relecture immédiate a rapporté `ok: false` sur une action
  qui avait parfaitement réussi. Le danger n'est pas cosmétique : sur une action
  irréversible, un faux échec invite à réessayer, et pendant ces 6 secondes `invoicedDate`
  était encore vide donc le garde-fou anti-doublon laissait passer une double facturation.
  Correctif : `readOrderAfterAction()` relit avec relances (2s/3s/5s) et le résultat
  distingue `applied` de `accepted-pending`. Sur `accepted-pending` la consigne à
  l'appelant est **relire, jamais réessayer**.
- **🔴 `PUT /api/logistics/pvt/shipping-policies/{id}` : la spec OpenAPI est fausse sur
  deux points, et l'endpoint est un REMPLACEMENT complet.** Établi sur
  `franceretailer1388` :
  1. La spec exige `deliveryOnWeekends` (un booléen). Ce champ est **inerte** : un PUT avec
     `deliveryOnWeekends: true` renvoie 200 et laisse `weekendAndHolidays` à tout-faux. Le
     champ qui marche est **`weekendAndHolidays`** — le même objet qu'en GET et en POST —
     que la spec ne liste pourtant pas pour le PUT.
  2. Tout champ écrivable **omis est réinitialisé**, pas préservé. Omettre
     `numberOfItemsPerShipment` l'a fait passer de `5` à `null` ; omettre
     `weekendAndHolidays` a effacé les flags.
  Donc : lire le record, fusionner, tout réémettre. Un PUT partiel détruit silencieusement
  le reste de la politique. C'est `updateShippingPolicy()` qui s'en charge.
- **🔴 Les codes postaux des tables de fret sont stockés sur 8 chiffres, complétés à
  gauche.** `10000` → `"00010000"`. Une saisie humaine à 5 chiffres non complétée désigne
  une plage totalement différente. `padPostalCode()` s'en charge.
- **La table de fret n'est pas lisible en entier.** `/freights/{id}/values` → 500. Seul
  `/freights/{id}/{codePostal}/values` répond, et ne renvoie que les lignes couvrant *ce*
  code postal. Donc pas de read-modify-write possible, et pas de « montre-moi ma table ».
  L'upsert par `operationType: 1` rend ça sans conséquence pour les écritures.
- **`GET /configuration/freights` est la surface de diagnostic des tables.** Elle porte
  `freightTableValueError` — une table vide s'annonce elle-même
  (*« No files to proccess… »*) — et l'erreur **s'effface** après une écriture par API,
  pas seulement après un upload de fichier (vérifié).
- **La chaîne shipping complète, et où vit chaque maillon :**
  `warehouse.warehouseDocks[].dockId` → dock ; `dock.freightTableIds` → policy ;
  `dock.salesChannels` → trade policy ; puis les lignes de la table de fret. **Aucun de
  ces liens n'est visible depuis la policy**, d'où `vtex_check_shipping_setup`.
- **🔴 Les updates dock et warehouse passent par l'endpoint de CRÉATION.** `POST
  /configuration/docks/{dockId}` et `PUT /configuration/warehouses/{id}` sont tous deux
  refusés (*« does not support http method »*). Il faut `POST` sur la **collection** avec
  l'`id` dans le corps. Deux outils MCP ont échoué silencieusement des mois pour ça.
- **🔴 Le lien policy ↔ dock vit dans `dock.freightTableIds`, pas dans la policy.** Une
  shipping policy ne peut pas déclarer ses docks. Une policy sans dock **n'apparaît jamais
  en simulation**, même active. `vtex_update_dock` prend la liste complète voulue
  (`["1","2"]`), pas un ajout incrémental.
- **🔴 Dock et warehouse sont aussi des REMPLACEMENTS complets.** Tout champ omis est
  perdu : `freightTableIds`, `isActive`, `priority`, `pickupPointIds`, `sellerId`. Comme
  pour les shipping policies : lire, fusionner, tout réémettre.
- **Les écritures Logistics se propagent de façon asynchrone.** Une relecture immédiate
  après un `POST` réussi peut renvoyer l'enregistrement d'avant — observé sur le dock `1`,
  où un renommage et un changement de `freightTableIds` étaient tous deux invisibles à la
  première relecture, corrects une seconde après. `readBackUntil()` relit jusqu'à ce que
  l'enregistrement reflète l'écriture (500ms/1,5s/3s). Même piège que l'OMS.
- **`carrierInfo.linkedDocks` n'est peuplé que par la LISTE.** Même politique, deux
  réponses : `GET /shipping-policies` renvoie le dock lié, `GET /shipping-policies/{id}`
  renvoie `[]`. Lire les docks liés depuis la liste, jamais depuis le get par id.
- **Ne jamais déduire le succès d'une action OMS de son code HTTP.** La doc VTEX exige de
  valider un **204 exact** et prévient que `start-handling` « can also respond with status
  500 ». `SellerOrderActionResult` relit donc la commande et compare le statut avant/après
  (`ok: false` + `message` si rien n'a bougé). Coût : un GET supplémentaire par action.
  Assumé — c'est la seule protection contre un 2xx sans effet.
- **Les commandes de démo sont seedées, pas issues d'un vrai flux.** La contrepartie de
  `FRN-1636850500005-01` est `1636850500482-01` côté marketplace (identifiée par le montant,
  11996) — mais `GET /api/oms/pvt/orders/order-group/FRN-1636850500005` renvoie `[]` et le
  marketplace est en `payment-approved` alors que le seller a déjà `authorizedDate`. Les
  deux surfaces ne sont pas cohérentes entre elles : ne pas s'en servir pour raisonner sur
  le flux réel.
- **`GET /api/oms/pvt/orders` et `GET .../orders/{id}` ne renvoient pas le même statut
  pour la même commande.** Observé sur `FRN-1636850500005-01` : la liste dit
  `ready-for-handling`, le détail dit `waiting-seller-handling`. La liste passe par
  l'index de commandes, qui retarde ; le détail non. **Après toute action, relire le
  détail, jamais la liste** — sinon on rapporte un échec sur un succès.
- **Ne jamais fermer l'énumération des statuts côté seller.** `waiting-seller-handling`
  est absent de l'union `OrderStatus` (vocabulaire marketplace). Un enum zod fermé sur un
  outil MCP seller rejette des filtres valides. VTEX documente explicitement qu'il faut
  tolérer les statuts inconnus plutôt que les rejeter.
- **L'API Catalog classique est morte sur ce compte (CatalogV2 pur).**
  `GET /api/catalog/pvt/stockkeepingunit/7` et `.../7/file` → **500**, alors que
  `/api/catalog-seller-portal/products/7` → 200. Conséquence : `POST
  /api/catalog/pvt/stockkeepingunit/{skuId}/file`, que la doc VTEX présente comme le moyen
  d'attacher une image par URL avec App Key/Token, **n'est pas utilisable ici**. Ne pas
  planifier dessus.
- **Les images produit doivent être hébergées sur `{account}.vtexassets.com/assets/...`.**
  `PUT /api/catalog-seller-portal/products/{id}` rejette toute autre URL. L'upload passe
  par l'app IO `vtex.catalog-images`, qui **n'accepte pas** App Key/Token en header.
  Contournement trouvé : `POST /api/vtexid/apptoken/login` échange l'App Key/Token contre
  un vrai `VtexIdclientAutCookie` (testé OK, token ~572 car.). Reste un **403** ensuite —
  la clé n'a pas la ressource `vtex.catalog-images`. C'est une permission à accorder, pas
  un problème de code.
- **🔴 Une permission manquante se présente en HTML, pas en 401.** Sur `franceretail`, tous
  les `GET /seller-register/pvt/*` partent en **4 redirections** et finissent sur
  `/admin/login/?portal=true` en **HTTP 200 `text/html`** — pas sur le
  `/Admin/Site/Login.aspx` que le premier 302 annonce. `fetch` suit la chaîne, donc
  l'appelant reçoit un 200 et `JSON.parse` casse sur `Unexpected token '<'` : un problème
  de droit déguisé en bug de parsing.
  Détection : `assertJsonResponse()` dans `lib/vtex/client.ts` rejette tout `content-type:
  text/html` sur les deux fetchers (tous nos appels envoient `Accept: application/json` et
  passent par `parseVtexBody`, donc du HTML est toujours une erreur). **Ne pas détecter sur
  l'URL** — la première tentative matchait `/Admin/Site/Login` et ne déclenchait jamais.
  Message obtenu : « the App Key is missing the License Manager resource this endpoint
  requires. This is a permission to grant, not a code error. »
- **`getSellerCommissions` ne ment plus** : le `catch { return [] }` est retiré (2026-09-02).
  Il n'était appelé que par le MCP, aucune page ne dépendait du `[]`. Contournement pour
  les taux au niveau compte : `/api/catalog_system/pvt/seller/*` (voir gotcha suivant).
- **Les endpoints Catalog System `seller` marchent, eux.** `GET
  /api/catalog_system/pvt/seller/list` (11 sellers) et
  `GET /api/catalog_system/pvt/seller/{sellerId}` répondent **200 avec la clé marketplace
  actuelle**, et portent déjà `ProductCommissionPercentage` /
  `FreightCommissionPercentage`. C'est la surface historique, moins riche que Seller
  Register (pas d'override par catégorie) mais disponible sans nouvelle permission.
- **🔴 claude.ai met la liste d'outils MCP en cache, indexée sur l'URL du connecteur.**
  Après un déploiement ajoutant des outils, le connecteur continue d'annoncer l'ancienne
  liste — et supprimer puis recréer le connecteur avec **la même URL** ne change rien, la
  clé de cache est identique. Symptôme trompeur : la session répond honnêtement « cet
  outil n'existe pas », et l'ancien *titre* d'un outil renommé reste visible.
  Contournement : ajouter un paramètre inerte à l'URL, `&v=2`, puis `&v=3`… La route ne lit
  que `token` (`app/api/mcp/route.ts`), tout autre paramètre est ignoré. Vérifier le
  serveur avant de suspecter le code :
  `curl -s -X POST '<url>' -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
- **`MCP_SERVER_TOKEN` manquait dans `.env.local`.** Sans lui la route `/api/mcp` renvoie
  500 « not configured » en local (fail-closed voulu). Ajouté le 2026-09-02 dans le
  `.env.local` (gitignoré), avec **la même valeur que sur Vercel** — décision assumée :
  tester en local avec le credential exact du connecteur claude.ai plutôt qu'un token
  local divergent. Si ce token est un jour rotaté, le faire aux deux endroits.
- `VtexIdclientAutCookie` est scopé sur `*.vtexcommercestable.com.br` — ne JAMAIS essayer de lire ce cookie depuis une app sur domaine custom (Vercel)
- L'exchange endpoint prend `accessToken` = Google access_token (pas l'id_token)
- `POST /api/vtexid/credential/validate` retourne `user` = email (pas `email` directement)
- duration max de l'exchange = 120 min. Prévoir refresh ou ré-auth après expiration.
- Pagination VTEX : OMS/Catalog utilisent header `REST-Range`, Master Data utilise `_from`/`_to` query params — standardisé dans le wrapper

## Divergences skills vendorées ↔ réalité de ce compte

Les skills `~/.claude/skills/marketplace-*` sont écrites pour l'**External Seller
Protocol** — un seller non-VTEX qui pousse dans le marketplace d'un tiers. Ce projet a
acté l'**Option A** (APIs VTEX natives, compte seller VTEX). Deux de leurs contraintes
« hard » ne s'appliquent donc pas ici, et les appliquer par réflexe ferait perdre du temps :

- **« Use SKU Integration API, Not Direct Catalog API »** (`marketplace-catalog-sync`) —
  annonce un 403 sur les écritures catalogue directes d'un seller, et impose
  `changenotification` + suggestions. Non applicable : `franceretailer1388` possède **son
  propre** catalogue. Preuve : `GET /api/catalog-seller-portal/products/7` → 200 avec
  `origin: "franceretailer1388"`. On n'écrit pas dans le catalogue du marketplace.
- **« Marketplace order ID in OMS paths »** (`marketplace-fulfillment`) — interdit
  d'utiliser un id de réservation dans `/api/oms/pvt/orders/{id}/...`. Non applicable :
  `FRN-...` n'est pas un id maison, c'est un vrai id OMS **dans le compte seller**.
  Appel same-account, cohérent.

Ce qui, en revanche, **s'applique et a été intégré** :
- Une commande `invoiced` ne s'annule plus sans facture de retour (`type: "Input"`) — d'où
  la lecture de `allowCancellation` avant tout POST cancel, plutôt qu'un flag `confirm`
  que le modèle cocherait systématiquement.
- `GET /api/oms/pvt/orders` dépend de l'index → relire le détail après action.
- Tolérer les statuts inconnus, jamais d'énumération fermée.
- Backoff sur 429 : **non-objectif assumé**. `vtexFetch` lève un `VtexRateLimitError` typé
  sans réessayer. Aucun de ces outils ne boucle (un humain les déclenche un par un). Le
  jour où un outil de traitement en lot est ajouté, le backoff devient un prérequis.

> Ne jamais ouvrir de PR sur un repo de skill vendorée. La connaissance corrigée vit ici.

## VTEX Admin URLs utiles
- App Keys: `https://franceretail.myvtex.com/admin/license-manager/#/home`
- Auth settings: `https://franceretail.myvtex.com/admin/account-settings/authentication`
