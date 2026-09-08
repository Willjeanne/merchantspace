# Session log

A working journal of how this project was built, kept for the reasoning behind
decisions rather than as reference material. Entries are in French, as
originally written — retranslating them would risk distorting findings that were
established against a live account.

For reference material, read these instead:

- [vtex-gotchas.md](./vtex-gotchas.md) — the VTEX behaviour this project ran into
- [mcp-server.md](./mcp-server.md) — the MCP server and its tools

Newest entries first.

---

### Session 2026-09-08 (cont.) — audit des écritures : 3 outils morts de plus

Même méthode que pour les lectures, sur `franceretailer1388` : chaque création suivie de
sa suppression, chaque modification suivie du retour à la valeur d'origine.

**Ce qui marche** (vérifié aller-retour) : `set_sku_inventory` (708 → 42 → 708),
`set_sku_price` (3,09 → 9,99 → 3,09), `create_brand`, `update_brand`,
`create_warehouse` + `delete_warehouse`, `create_dock` + `delete_dock`,
`delete_sku_image`, `create_shipping_policy` (+ DELETE 204 par API),
`open_create_product_form`.

**Trois outils morts de plus, tous sur le Catalog classique :**
| Outil | Cause | Suite |
|---|---|---|
| `vtex_update_product` | PUT `/catalog/pvt/product/{id}` → 500 | **réparé** sur `/catalog-seller-portal/products/{id}` |
| `vtex_update_sku` | GET+PUT `/catalog/pvt/stockkeepingunit/{id}` → 500 | **réparé** via le produit Seller Portal |
| `vtex_delete_brand` | DELETE `/catalog/pvt/brand/{id}` → 500 | **retiré** |

**🔴 On ne supprime pas dans VTEX** — marques, catégories, produits se **désactivent**.
Toutes les routes DELETE testées répondent 405, la classique 500. J'ai perdu du temps à
le sonder au lieu de le savoir. `vtex_delete_brand` est donc retiré et
`vtex_update_brand` (`IsActive: false`) est la voie. En revanche `delete_warehouse`,
`delete_dock`, `delete_sku_image` et le DELETE des shipping policies **marchent
réellement** — ce sont des entités logistiques, pas catalogue.

**Autres constats :**
- `vtex_start_handling_order` sur `FRN-1636850500001-01` → `accepted-pending`, pas
  l'`OMS003` de l'autre commande. Deux commandes au même statut, deux réponses. La
  commande **n'a pas bougé** (`lastChange` inchangé) et le garde-fou l'a bien rapporté :
  il couvre les deux cas.
- `POST /seller-register/pvt/sellers` → **404**, pas une permission comme consigné avant.
  Le GET fait un 302 vers l'admin, le POST n'existe pas. Description corrigée.
- `upsert_seller_commissions` **déversait du HTML brut** dans le résultat : le garde-fou
  `assertJsonResponse` ne couvre que les réponses 2xx, et un 4xx/5xx en HTML passait par
  la branche d'erreur qui recopie le corps. `describeErrorBody()` ajouté.
- Incohérences d'arguments qui m'ont fait trébucher (et feront trébucher un modèle) :
  `skuId` est une **chaîne** dans price/inventory et un **entier** ailleurs ;
  `update_brand` prend ses champs à plat alors que `update_product`/`update_sku` les
  imbriquent sous `updates`. Signalé, non corrigé.

**55 outils.** Compte laissé propre : warehouse, dock, policy et images de test
supprimés, prix et stock remis à l'identique. **Un seul résidu** : la marque `8`
« AUDIT-TEMP-2 », inactive et invisible dans les listes, que VTEX ne permet pas de
supprimer.

### Session 2026-09-08 (cont.) — audit des 29 lectures, 3 outils morts trouvés

**Méthode :** appel des 29 outils de lecture contre la prod, un par un. Jamais fait
jusque-là — et c'est ce qui avait laissé passer `update_dock` et `update_warehouse`
pendant des mois.

**Résultat : 26/29.** Les trois échecs :
| Outil | Cause |
|---|---|
| `vtex_get_product` | 500 — Catalog classique mort sur ce compte |
| `vtex_get_product_skus` | 500 — idem |
| `vtex_get_seller_commissions` | permission, **échec voulu** et désormais lisible |

*(Deux autres échecs étaient une erreur de test de ma part : `skuId` est une **chaîne**
dans `vtex_get_sku_price` et `vtex_get_sku_inventory`, j'avais passé un nombre. Les
outils marchent. À noter : `productId` est un entier ailleurs — incohérence de typage qui
fait trébucher, non corrigée.)*

**Et une quatrième trouvaille en vérifiant les survivants : `vtex_update_product`
échouait aussi.** Il faisait son PUT sur `/api/catalog/pvt/product/{id}`. La lecture avait
un fallback SKU, **le PUT n'en avait aucun**. Donc l'outil MCP *et* le formulaire
d'édition produit de l'app (`updateProductAction`) étaient cassés depuis le début.

**Fait :**
- `vtex_get_product` et `vtex_get_product_skus` **retirés** (56 outils), avec leurs deux
  fonctions lib devenues orphelines. Ils ne peuvent structurellement pas marcher sur un
  compte Seller Portal, et un modèle risquait de les choisir au lieu de
  `vtex_get_product_full` qui fonctionne. Description de ce dernier durcie pour dire qu'il
  est *la* voie de lecture d'un produit.
- `updateSellerProduct()` réécrit sur `/api/catalog-seller-portal/products/{id}` en
  read-modify-write (5e endpoint de cette API à se révéler être un remplacement complet).
  L'entrée reste en PascalCase comme `createSellerProduct`, mais **seuls les champs que
  cette surface sait stocker sont acceptés** : `Title`, `IsVisible`,
  `MetaTagDescription` et `DepartmentId` n'ont pas d'équivalent et disparaissent de la
  signature plutôt que d'être ignorés en silence. `lib/actions/catalog.ts` ajusté.

**Vérifié en live** : renommage du produit 7 → statut, marque, catégorie, image et SKU
**préservés** ; nom d'origine restauré. Poids de la liste d'outils mesuré : **39,5 Ko ≈
9 900 tokens** envoyés à chaque session.

### Session 2026-09-08 (cont.) — images SKU : ce qui marche et ce qui attend un droit

**Deux capacités distinctes, à ne plus confondre :**

| Besoin | État |
|---|---|
| Attacher une image **déjà hébergée** sur `{account}.vtexassets.com` | ✅ **marche, aucune permission** — `vtex_add_product_image` |
| **Uploader** de nouveaux octets (URL externe ou fichier) | ⛔ 403, permission `vtex.catalog-images` |

**Toutes les voies d'upload ont été testées et échouent :**
- app IO `vtex.catalog-images` → 403, rôle de la clé sans la ressource
- `POST /api/catalog/pvt/stockkeepingunit/{id}/file` → 500 (Catalog classique mort ici)
- `PUT {account}.vtexassets.com/arquivos/{name}` → 403 CloudFront
- `PUT /api/portal/pvt/sites/default/files/{name}` → **passe l'auth** (l'erreur devient une
  désérialisation `CustomFileExchange`) puis **403 « Autorização negada »** avec un JSON valide

Conclusion : **aucun chemin App Key/Token ne dépose un fichier sur ce CDN sans un droit
accordé.** Ce n'est pas un problème de code.

**Fait :**
- `lib/vtex/catalog.ts` : `getServerSessionToken()` échange l'App Key contre un
  `VtexIdclientAutCookie` via `apptoken/login`, mis en cache 1 h. `vtexAuthToken` devient
  **optionnel** partout — la page produit continue de passer son cookie, le MCP n'a plus
  besoin de session. Le code d'upload est donc **complet et prêt** ; il marchera le jour du
  droit accordé, sans nouvelle ligne.
- Le message d'erreur ne mentait plus : il disait *« Ensure your VTEX session is active »*
  alors que le serveur s'authentifie très bien. Il nomme maintenant la ressource
  manquante, dit que c'est une permission et pointe vers la voie qui marche.
- Descriptions des 3 outils images amendées pour dire laquelle marche aujourd'hui.

**Vérifié en live** : image attachée aux produits `7` et `6` depuis une URL vtexassets
existante, SKU pointant dessus, reste du produit intact ; upload sans `vtexAuthToken` →
403 avec le message exploitable.

### Session 2026-09-08 — simulation d'expédition + plafond de poids corrigé

**Déclencheur :** les tests en live depuis claude.ai ont réussi, mais la session a émis
deux affirmations fausses faute de pouvoir vérifier — d'où l'outil de simulation.

**Ce qu'elle a dit de faux :**
1. « `numberOfItemsPerShipment` n'est pas modifiable par ces outils » → **faux**, il est
   exposé dans `vtex_update_shipping_policy` (vérifié dans le schéma déployé). Elle
   conseillait de recréer la policy pour rien.
2. « avec 1 article par expédition, le port sera facturé plusieurs fois » → **non
   reproductible ici** : simulation à 1, 2 et 5 articles, le port reste fixe.

**Le vrai problème, que personne n'avait vu :** `weightEnd: 500` sur la table de la
policy 1, avec un SKU à 300 g → **Standard Delivery disparaissait du checkout dès 2
articles**, sans erreur ni message. C'est ce qui casse une démo.
Corrigé : lignes élargies à `0–1000000`, vérifié jusqu'à 20 articles.

**🔴 L'unité de poids est le GRAMME — établi**, pas déduit : 3 × 300 g = 900 sortait de la
plage `0–500` et faisait tomber l'option ; à 1 article elle apparaissait.

**Fait :**
- `lib/vtex/shipping-setup.ts` : `simulateShipping()` → `POST
  /api/checkout/pub/orderForms/simulation` sur le compte seller. Renvoie les options que
  verrait un client, avec prix et délai. Distingue « SKU introuvable » (problème
  catalogue) de « aucune option » (problème shipping), et pointe vers la piste des plages
  de poids.
- `lib/mcp/tools/shipping.ts` : `vtex_simulate_shipping`. **58 outils.**

**Vérifié en live** : 3 options à x1 et à x20 ; CP `00001` → Standard Delivery absente
(sa plage démarre à 10000), les deux autres présentes ; SKU inexistant → `itemFound:
false` avec la note qui oriente vers le catalogue.

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
