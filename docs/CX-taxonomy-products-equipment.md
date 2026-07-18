# CX Marketplace taxonomy: Products/Materials + Equipment

**Status: DRAFT v2, awaiting Dean's sign-off. Nothing is built from this yet.**

## Decisions locked in

- **Two levels only:** Category -> Sub-category. No third level. Keeps filtering
  clean and the feed/search algorithm accurate.
- **Listing classification = Trade + one of {Product/Material, Equipment}:** every
  listing picks a **Trade** (always), then **either** one Product/Material category
  **OR** one Equipment category, never both. Single selection within whichever one
  it is, with an optional sub-category. The two are **mutually exclusive** because an
  item is either a material/product you sell OR a machine, not both. (DECIDED
  07/16/2026.)
- **Marketplace search filters:** Trade, plus a single **Category** filter that
  browses the Product/Material and Equipment trees. Since a listing is only ever one
  or the other, the two never combine on a listing; the sub-category is always
  optional (a top category alone is a valid tag).
- **Stable slugs:** every category and sub-category has a permanent kebab-case
  slug (shown in `code`). The slug never changes even if the display label does,
  so listings keep their tag through any future rename.

## Source ("the proper source")

Retailer-style at the top level (how a contractor actually shops), standards-backed
underneath (so the data maps to the codes buyers, suppliers and estimators use).

| Layer | Source |
| --- | --- |
| Product top level | Distributor/retailer pro catalogs: Home Depot Pro, Lowe's Pro, Ferguson, White Cap, Fastenal, Grainger |
| Product sub-categories | **CSI MasterFormat 2020** divisions 03-33 (the North American standard for construction work results + materials) |
| Cross-reference | **OmniClass Table 23** (MasterFormat-derived, ISO 12006-2 aligned) and **UNSPSC** segments 30/31 for e-commerce mapping |
| Equipment top level | **ARA** (American Rental Association) rental categories, cross-checked vs United Rentals, Sunbelt, Herc |
| Equipment class names | **ANSI A92** (MEWPs/aerial lifts) and **OSHA 29 CFR 1926** subparts CC (cranes), L (scaffolds), O (earthmoving) |

The MasterFormat division on each product category is the anchor: it lets a listing
carry a real industry code later (spec sheets, estimating exports, supplier feeds)
without re-tagging anything.

**Split rule:** Product/Material = consumed into the job, or a tool you BUY.
Equipment = a machine you rent, sell or hire out (with or without operator).

---

# A. Product / Material categories (17)

### 1. Lumber & Composites `lumber-composites` - MasterFormat Div 06
- Dimensional lumber `dimensional-lumber`
- Studs `studs`
- Timbers & posts `timbers-posts`
- Pressure-treated lumber `pressure-treated-lumber`
- Engineered lumber (LVL, LSL, glulam) `engineered-lumber`
- I-joists & trusses `i-joists-trusses`
- Plywood `plywood`
- OSB & sheathing `osb-sheathing`
- Wood decking `wood-decking`
- Composite & PVC decking `composite-pvc-decking`
- Trim & moulding `trim-moulding`

### 2. Concrete, Cement & Masonry `concrete-cement-masonry` - Div 03, 04
- Ready-mix concrete `ready-mix-concrete`
- Bagged concrete & cement `bagged-concrete-cement`
- Mortar & grout `mortar-grout`
- Rebar & wire mesh `rebar-wire-mesh`
- Concrete block (CMU) `concrete-block-cmu`
- Brick `brick`
- Pavers `pavers`
- Retaining wall block `retaining-wall-block`
- Natural & manufactured stone `natural-manufactured-stone`
- Admixtures `admixtures`
- Forms & form accessories `forms-accessories`
- Sealers & curing compounds `sealers-curing-compounds`

### 3. Drywall & Interior Finishes `drywall-interior-finishes` - Div 09
- Drywall panels `drywall-panels`
- Cement & tile backer board `backer-board`
- Joint compound & tape `joint-compound-tape`
- Corner bead `corner-bead`
- Metal studs & track `metal-studs-track`
- Plaster & stucco `plaster-stucco`
- Ceiling tile & grid `ceiling-tile-grid`
- Acoustic panels `acoustic-panels`

### 4. Paint, Coatings & Sundries `paint-coatings-sundries` - Div 09 90 00
- Interior paint `interior-paint`
- Exterior paint `exterior-paint`
- Primers & sealers `primers-sealers`
- Stains & wood finishes `stains-wood-finishes`
- Industrial & protective coatings `industrial-protective-coatings`
- Caulk & sealants `caulk-sealants`
- Adhesives `adhesives`
- Brushes, rollers & sprayer supplies `brushes-rollers-sprayers`
- Tape & masking `tape-masking`
- Drop cloths `drop-cloths`

### 5. Roofing & Siding `roofing-siding` - Div 07
- Asphalt shingles `asphalt-shingles`
- Metal roofing `metal-roofing`
- Tile & slate roofing `tile-slate-roofing`
- Low-slope membrane (TPO, EPDM, mod-bit) `low-slope-membrane`
- Underlayment `roofing-underlayment`
- Flashing & drip edge `flashing-drip-edge`
- Gutters & downspouts `gutters-downspouts`
- Soffit & fascia `soffit-fascia`
- Vinyl siding `vinyl-siding`
- Fiber cement siding `fiber-cement-siding`
- Wood & engineered siding `wood-engineered-siding`
- Stone veneer `stone-veneer`

### 6. Insulation & Weatherproofing `insulation-weatherproofing` - Div 07
- Batt insulation `batt-insulation`
- Blown-in & loose fill `blown-in-loose-fill`
- Rigid foam board `rigid-foam-board`
- Spray foam `spray-foam`
- Mineral wool `mineral-wool`
- Radiant barrier `radiant-barrier`
- House wrap & air barrier `house-wrap-air-barrier`
- Vapor barrier `vapor-barrier`
- Waterproofing membranes `waterproofing-membranes`
- Weatherstripping `weatherstripping`

### 7. Doors, Windows & Millwork `doors-windows-millwork` - Div 08
- Interior doors `interior-doors`
- Exterior doors `exterior-doors`
- Garage doors `garage-doors`
- Hollow metal & commercial doors `hollow-metal-doors`
- Windows `windows`
- Skylights `skylights`
- Door hardware & locksets `door-hardware-locksets`
- Frames & jambs `frames-jambs`
- Storefront & curtain wall `storefront-curtain-wall`
- Interior trim & casing `interior-trim-casing`

### 8. Cabinets, Countertops & Fixtures `cabinets-countertops-fixtures` - Div 12
- Kitchen cabinets `kitchen-cabinets`
- Bath vanities `bath-vanities`
- Countertops (quartz, granite, solid surface, laminate) `countertops`
- Closet & storage systems `closet-storage-systems`
- Shelving `shelving`
- Mirrors & bath accessories `mirrors-bath-accessories`
- Commercial casework `commercial-casework`

### 9. Electrical & Lighting `electrical-lighting` - Div 26, 27, 28
- Wire & cable `wire-cable`
- Conduit & fittings `conduit-fittings`
- Boxes & enclosures `boxes-enclosures`
- Panels & load centers `panels-load-centers`
- Breakers `breakers`
- Switches & receptacles `switches-receptacles`
- Wiring devices & plates `wiring-devices-plates`
- Interior lighting `interior-lighting`
- Exterior & site lighting `exterior-site-lighting`
- Temporary jobsite lighting `temporary-jobsite-lighting`
- Transfer switches `transfer-switches`
- Low voltage & data `low-voltage-data`
- Fire alarm & security `fire-alarm-security`
- Solar & EV charging `solar-ev-charging`

### 10. Plumbing `plumbing` - Div 22
- Pipe & tubing (PVC, CPVC, PEX, copper) `pipe-tubing`
- Fittings & valves `fittings-valves`
- Drainage & DWV `drainage-dwv`
- Water heaters (tank & tankless) `water-heaters`
- Sinks, toilets, tubs & showers `plumbing-fixtures`
- Faucets & trim `faucets-trim`
- Pumps (sump, well, booster) `plumbing-pumps`
- Water treatment `water-treatment`
- Backflow & meters `backflow-meters`
- Gas piping `gas-piping`
- Pipe insulation `pipe-insulation`

### 11. HVAC & Mechanical `hvac-mechanical` - Div 23
- Furnaces `furnaces`
- Air conditioners & heat pumps `ac-heat-pumps`
- Mini-splits `mini-splits`
- Boilers & radiant heat `boilers-radiant-heat`
- Rooftop units `rooftop-units`
- Air handlers & coils `air-handlers-coils`
- Ductwork & fittings `ductwork-fittings`
- Registers, grilles & diffusers `registers-grilles-diffusers`
- Ventilation & exhaust fans `ventilation-exhaust-fans`
- Thermostats & controls `thermostats-controls`
- Filters & indoor air quality `filters-iaq`
- Refrigerant & line sets `refrigerant-line-sets`

### 12. Fasteners, Hardware & Structural Connectors `fasteners-hardware-connectors` - Div 05, 06 05 23
- Nails `nails`
- Screws `screws`
- Bolts, nuts & washers `bolts-nuts-washers`
- Concrete & masonry anchors `anchors`
- Structural connectors (joist hangers, straps, hold-downs) `structural-connectors`
- Threaded rod `threaded-rod`
- Rivets `rivets`
- Chain, rope & rigging hardware `chain-rope-rigging`
- Hinges & brackets `hinges-brackets`

### 13. Metals & Steel `metals-steel` - Div 05
- Structural steel (beams, columns) `structural-steel`
- Angle, channel & flat bar `angle-channel-flat-bar`
- Metal decking `metal-decking`
- Sheet metal `sheet-metal`
- Aluminum extrusion `aluminum-extrusion`
- Handrail & guardrail `handrail-guardrail`
- Fixed stairs & ladders `stairs-ladders`
- Expanded & perforated metal `expanded-perforated-metal`
- Welding consumables `welding-consumables`

### 14. Flooring & Tile `flooring-tile` - Div 09 60 00
- Hardwood `hardwood`
- Engineered wood `engineered-wood`
- Laminate `laminate`
- Luxury vinyl (LVP/LVT) & sheet vinyl `vinyl-flooring`
- Carpet & carpet tile `carpet`
- Ceramic & porcelain tile `ceramic-porcelain-tile`
- Natural stone tile `natural-stone-tile`
- Underlayment & subfloor `underlayment-subfloor`
- Thinset, grout & setting materials `thinset-grout-setting`
- Epoxy & resinous flooring `epoxy-resinous-flooring`
- Polished & sealed concrete `polished-sealed-concrete`
- Transitions & trim `transitions-trim`

### 15. Sitework, Landscape & Hardscape `sitework-landscape-hardscape` - Div 31, 32
- Aggregate, sand & gravel `aggregate-sand-gravel`
- Topsoil & fill `topsoil-fill`
- Erosion control (silt fence, blankets) `erosion-control`
- Geotextile & geogrid `geotextile-geogrid`
- Drainage pipe & culvert `drainage-pipe-culvert`
- Asphalt & paving materials `asphalt-paving-materials`
- Sealcoat & striping `sealcoat-striping`
- Fencing & gates `fencing-gates`
- Retaining wall systems `retaining-wall-systems`
- Sod, seed & plantings `sod-seed-plantings`
- Irrigation `irrigation`
- Mulch & decorative stone `mulch-decorative-stone`

### 16. Safety, PPE & Jobsite Supplies `safety-ppe-jobsite` - Div 01 50 00
- Hard hats, eye & hearing protection `head-eye-hearing-protection`
- Gloves `gloves`
- Hi-vis & workwear `hi-vis-workwear`
- Fall protection (harnesses, lanyards, anchors) `fall-protection`
- Respiratory protection `respiratory-protection`
- Traffic control (cones, barricades, signs) `traffic-control`
- Caution & barricade tape `barricade-tape`
- First aid `first-aid`
- Fire extinguishers `fire-extinguishers`
- Temporary fencing & barriers `temporary-fencing-barriers`
- Jobsite cleanup supplies `jobsite-cleanup`

### 17. Tools & Tool Accessories (purchase) `tools-accessories` - Div 01 54 00
> Tools you BUY. Machines you rent or hire out live under Equipment.
- Hand tools `hand-tools`
- Cordless & corded power tools `power-tools`
- Pneumatic tools `pneumatic-tools`
- Blades, bits & abrasives `blades-bits-abrasives`
- Layout & measuring (levels, lasers, tape) `layout-measuring`
- Tool storage `tool-storage`
- Ladders & step stools `ladders-step-stools`
- Work lights `work-lights`
- Batteries & chargers `batteries-chargers`

---

# B. Equipment categories (15)

### 1. Earthmoving & Excavation `earthmoving-excavation`
- Excavators (mini & standard) `excavators`
- Backhoe loaders `backhoe-loaders`
- Dozers `dozers`
- Skid steers & compact track loaders `skid-steers-ctl`
- Wheel loaders `wheel-loaders`
- Motor graders `motor-graders`
- Trenchers `trenchers`
- Scrapers `scrapers`
- Attachments (buckets, breakers, augers, grapples) `earthmoving-attachments`

### 2. Compaction & Paving `compaction-paving`
- Plate compactors `plate-compactors`
- Rammers (jumping jacks) `rammers`
- Walk-behind rollers `walk-behind-rollers`
- Ride-on rollers `ride-on-rollers`
- Asphalt pavers `asphalt-pavers`
- Milling machines `milling-machines`
- Asphalt distributors `asphalt-distributors`
- Concrete & asphalt saws `concrete-asphalt-saws`
- Sealcoating & line striping equipment `sealcoating-striping`

### 3. Aerial Lifts & Access `aerial-lifts-access` - ANSI A92
- Scissor lifts (electric & rough terrain) `scissor-lifts`
- Articulating boom lifts `articulating-boom-lifts`
- Telescopic boom lifts `telescopic-boom-lifts`
- Towable boom lifts `towable-boom-lifts`
- Personnel & vertical mast lifts `mast-lifts`
- Telehandlers `telehandlers`
- Material lifts & hoists `material-lifts-hoists`

### 4. Cranes, Hoists & Rigging `cranes-hoists-rigging` - OSHA 1926 subpart CC
- Mobile & truck cranes `mobile-truck-cranes`
- Rough-terrain cranes `rough-terrain-cranes`
- Tower cranes `tower-cranes`
- Carry-deck cranes `carry-deck-cranes`
- Boom trucks `boom-trucks`
- Hoists & winches `hoists-winches`
- Gantry cranes `gantry-cranes`
- Rigging, slings & spreader bars `rigging-slings`

### 5. Concrete & Masonry Equipment `concrete-masonry-equipment`
- Concrete mixers `concrete-mixers`
- Concrete pumps & placing booms `concrete-pumps`
- Power trowels `power-trowels`
- Screeds `screeds`
- Concrete vibrators `concrete-vibrators`
- Core drills `core-drills`
- Concrete grinders & polishers `grinders-polishers`
- Scarifiers & shot blasters `scarifiers-shot-blasters`
- Masonry saws `masonry-saws`
- Mortar mixers `mortar-mixers`
- Concrete buggies `concrete-buggies`

### 6. Power, Air & Welding `power-air-welding`
- Portable air compressors `portable-air-compressors`
- Towable air compressors `towable-air-compressors`
- Portable generators `portable-generators`
- Towable & standby generators `towable-standby-generators`
- Light towers `light-towers`
- Engine-driven welders `engine-driven-welders`
- Welding machines `welding-machines`
- Power distribution & spider boxes `power-distribution`
- Cable & cords `cable-cords`
- Battery energy storage `battery-energy-storage`

### 7. Material Handling & Forklifts `material-handling-forklifts`
- Warehouse forklifts `warehouse-forklifts`
- Rough-terrain forklifts `rough-terrain-forklifts`
- Pallet jacks `pallet-jacks`
- Conveyors `conveyors`
- Dollies, carts & wheelbarrows `dollies-carts-wheelbarrows`
- Drum & cylinder handling `drum-cylinder-handling`
- Cable pullers `cable-pullers`

### 8. Trucks & Trailers `trucks-trailers`
- Dump trucks `dump-trucks`
- Flatbed & stake trucks `flatbed-stake-trucks`
- Service & mechanic trucks `service-mechanic-trucks`
- Water trucks `water-trucks`
- Bucket & boom trucks `bucket-boom-trucks`
- Vacuum & sweeper trucks `vacuum-sweeper-trucks`
- Utility trailers `utility-trailers`
- Equipment & lowboy trailers `equipment-lowboy-trailers`
- Dump trailers `dump-trailers`

### 9. Pumps, Water & Dewatering `pumps-water-dewatering`
- Trash pumps `trash-pumps`
- Submersible pumps `submersible-pumps`
- Diaphragm pumps `diaphragm-pumps`
- Wellpoint & dewatering systems `wellpoint-dewatering`
- Hoses & fittings `hoses-fittings`
- Water tanks `water-tanks`
- Pressure washers `pressure-washers`

### 10. Climate Control & Air Quality `climate-control-air-quality`
- Indirect & direct-fired heaters `heaters`
- Portable AC & spot coolers `portable-ac-spot-coolers`
- Dehumidifiers `dehumidifiers`
- Air movers & blowers `air-movers-blowers`
- Air scrubbers & negative air machines `air-scrubbers`
- Ventilation fans `ventilation-fans`
- Containment & abatement equipment `containment-abatement`

### 11. Demolition & Specialty Trade Equipment `demolition-specialty`
- Demolition hammers & breakers `demolition-hammers-breakers`
- Rotary & core drills `rotary-core-drills`
- Concrete, wall & wire saws `concrete-wall-wire-saws`
- Chain saws `chain-saws`
- Drain cleaning & jetting `drain-cleaning-jetting`
- Pipe threading & fusion `pipe-threading-fusion`
- HVAC service & recovery tools `hvac-service-recovery`
- Insulation blowers `insulation-blowers`
- Floor prep & surface removal `floor-prep-surface-removal`
- Sanders & dust extraction `sanders-dust-extraction`

### 12. Surveying, Detection & Inspection `surveying-detection-inspection`
- Total stations & GPS rovers `total-stations-gps`
- Laser & rotary levels `laser-rotary-levels`
- Machine control `machine-control`
- Utility & cable locators `utility-cable-locators`
- Sewer & pipe inspection cameras `pipe-inspection-cameras`
- Concrete scanners (GPR) `concrete-scanners-gpr`
- Thermal imaging `thermal-imaging`
- Moisture meters `moisture-meters`
- Gas detection & confined-space monitors `gas-detection-monitors`

### 13. Landscaping & Grounds Equipment `landscaping-grounds`
- Stump grinders `stump-grinders`
- Chippers `chippers`
- Chainsaws & pole saws `chainsaws-pole-saws`
- Mowers & brush cutters `mowers-brush-cutters`
- Tillers & augers `tillers-augers`
- Sod cutters `sod-cutters`
- Aerators & seeders `aerators-seeders`
- Blowers `landscape-blowers`
- Log splitters `log-splitters`

### 14. Scaffolding, Shoring & Site Support `scaffolding-shoring-site-support` - OSHA 1926 subpart L
- Frame & system scaffolding `frame-system-scaffolding`
- Mobile scaffold towers `mobile-scaffold-towers`
- Shoring & jacks `shoring-jacks`
- Trench boxes & shoring `trench-boxes`
- Job boxes & storage containers `job-boxes-containers`
- Portable offices & trailers `portable-offices-trailers`
- Portable toilets & wash stations `portable-toilets-wash`
- Temporary fencing `temporary-fencing`
- Barricades `barricades`

### 15. Cleaning & Waste Equipment `cleaning-waste-equipment`
- Floor scrubbers & sweepers `floor-scrubbers-sweepers`
- HEPA & wet/dry vacuums `hepa-wet-dry-vacuums`
- Dumpsters & roll-offs `dumpsters-roll-offs`
- Compactors & balers `compactors-balers`
- Spill containment `spill-containment`
- Sweeper attachments `sweeper-attachments`

---

## What gets built once this is signed off

1. `src/lib/taxonomy.ts` - the two trees as typed constants: each category has a
   stable `slug`, display `label`, MasterFormat `code` (products only), and a
   `subcategories[]` of `{ slug, label }`. Slugs are permanent.
2. Prisma on `Listing`: an `itemKind` ("product" | "equipment" | null) plus
   `categorySlug` + `subcategorySlug` (nullable, holding slugs), indexed for
   filtering. The XOR rule is enforced by `itemKind` (a listing is one or the
   other), so we do NOT carry two separate category pairs.
3. Listing form: after Trade, a Product/Material vs Equipment choice, then ONE
   searchable category picker (same `SearchSelect` as Trade) that reveals its
   sub-category picker. Choosing one side disables the other.
4. Marketplace search: Trade + Product + Equipment filters, with the applied-filter
   chips pattern already used in the Admin Users module.

## Open questions for sign-off

- Any category or sub-category to **ADD, RENAME or DROP** in either list?
- Confirm the two anchors are right: **single-select** per dimension and **two
  levels** (both assumed above).
