# Editorial Composer Spec

## Purpose

CloudBooks currently supports a locked `Visual Atlas` page model with a deterministic HTML contract and a generated upper visual. That model is reproducible and good for batch production, but it struggles when a page's editorial density does not fit the fixed structure.

The `Editorial Composer` adds a second page mode:

- `locked`: current contract-first page assembly
- `composer`: page built from validated editorial blocks

The goal is not unlimited layout freedom. The goal is controlled flexibility inside a shared editorial grammar.

## Product Intent

The Composer should let the editorial team:

- assemble a page from reusable blocks
- auto-compose a first proposal from grounded content
- refine the page manually when needed
- validate that the final page still covers all required topics and exam signals

This avoids forcing every page into the same structure while preserving collection consistency.

## Page Modes

### Locked

Use when:

- the topic fits the stable `Visual Atlas` contract
- batch throughput matters more than local nuance
- the collection needs maximum reproducibility

Characteristics:

- fixed hero, guide, upper visual, traps, autocheck
- deterministic renderer
- narrow visual variance

### Composer

Use when:

- the topic is structurally awkward for the locked grid
- the page is too sparse or too dense for the fixed layout
- premium editorial composition matters more than one-template uniformity
- the page needs a different balance of diagram, comparison, map, callout, traps, and validation

Characteristics:

- block-based composition
- validation before approval
- optional human refinement

## Core Principles

1. Freedom must live inside editorial rules.
2. Every page must preserve exam utility, not only visual appeal.
3. A page is valid only if it satisfies coverage and composition constraints.
4. Composer should support both auto-layout and manual refinement.
5. The system must be able to explain why a page is incomplete.

## Block Catalog v1

Start small. The first version should ship with 10 block types.

### Opening Blocks

- `hero_title`
- `context_deck`
- `guide_question`

### Technical Core Blocks

- `diagram_panel`
- `comparison_panel`
- `decision_tree`
- `map_panel`

### Exam Layer Blocks

- `exam_traps`
- `autocheck`
- `exam_signal`

## Block Contract

Each block should follow the same base shape:

```ts
type EditorialBlock = {
  id: string;
  type: BlockType;
  variant: string;
  required: boolean;
  minHeight: number;
  maxHeight: number;
  priority: number;
  dependsOn?: string[];
  scoreWeight?: number;
  content: Record<string, unknown>;
};
```

## Recommended Variants

### `hero_title`

- `full`
- `compact`

### `context_deck`

- `short`
- `expanded`

### `guide_question`

- `inline_badge`
- `editorial_bar`

### `diagram_panel`

- `single_focus`
- `two_column`
- `multi_step`

### `comparison_panel`

- `sku_matrix`
- `pros_cons`
- `feature_split`

### `decision_tree`

- `binary_path`
- `multi_branch`

### `map_panel`

- `region_distribution`
- `network_boundary`
- `replication_path`

### `exam_traps`

- `compact`
- `standard`

### `autocheck`

- `short`
- `full`

### `exam_signal`

- `rule`
- `warning`
- `memory_hook`

## Minimum Coverage Rules

Every `composer` page must pass these minimums:

- at least 1 opening block
- exactly 1 guide block
- 2 to 4 technical core blocks
- at least 1 exam block (`exam_traps` or `exam_signal`)
- exactly 1 validation block (`autocheck`)

If a page does not satisfy these, it cannot pass structural QA.

## Density Rules

The Composer must adapt to content strength.

### Sparse Page

When grounding is short or visually narrow:

- prefer `context_deck.expanded`
- prefer `exam_traps.compact`
- prefer `autocheck.short`
- allow one more technical explanatory block

### Dense Page

When grounding is rich:

- prefer `context_deck.short`
- allow `autocheck.full`
- allow `comparison_panel` + `decision_tree`
- keep traps concise to protect scanability

### Design Rule

The bottom exam rail should never expand just to occupy space.

Unused vertical space should return to the technical core or context layer.

## Validation Model

Composer pages need two validation layers.

### Structural Validation

Checks whether the page contains the required block types and relationships.

```ts
type StructuralValidation = {
  passed: boolean;
  missing: string[];
  warnings: string[];
};
```

### Editorial Validation

Checks whether the page behaves like a premium learning artifact.

```ts
type EditorialValidation = {
  coverageScore: number;
  readabilityScore: number;
  usefulDensityScore: number;
  examUtilityScore: number;
  consistencyScore: number;
  total: number;
};
```

## Coverage Model

The Composer should explain missing coverage in editorial terms, not just layout terms.

```ts
type CoverageResult = {
  technicalCore: boolean;
  examSignals: boolean;
  validationPresent: boolean;
  weakAreas: string[];
};
```

Example messages:

- `Falta una señal de examen`
- `La página tiene comparación, pero no decisión operativa`
- `La validación existe, pero no conecta con el concepto principal`
- `Hay demasiada narrativa y poca visualización técnica`

## Operating Modes

Composer should support three levels of control.

### Auto

The system chooses the full composition from the available grounded content.

Use when:

- batch speed matters
- the page is straightforward

### Assisted

The system proposes a composition and the editor can:

- replace block variants
- expand or compress specific blocks
- lock preferred blocks

Use when:

- a page needs a premium pass
- the first proposal is close but not fully convincing

### Manual

The editor chooses all blocks, but the system still validates.

Use when:

- the page is strategically important
- the topic is structurally unusual

## Suggested Studio Experience

The first UI does not need drag-and-drop.

### Phase 1 UI

- center: page preview
- left rail: available blocks / variants
- right rail: validation / coverage / required missing elements
- top actions:
  - `Auto-componer`
  - `Validar página`
  - `Cambiar a modo locked`

This keeps complexity lower while validating the model.

### Phase 2 UI

Add direct manipulation:

- reorder blocks
- resize height bands
- replace one block with another compatible variant

### Phase 3 UI

Optional canvas-like editing:

- drag-drop placement
- snapping to editorial zones
- guardrails against broken composition

## Data Model Draft

```ts
type ComposerPage = {
  pageId: string;
  mode: "composer";
  blocks: EditorialBlock[];
  coverage: CoverageResult;
  structuralValidation: StructuralValidation;
  editorialValidation: EditorialValidation;
};
```

## Example Compositions

### Example A — ACR Architecture and Tiers

Good for a balanced page with comparison + architecture + geo replication:

```ts
[
  "hero_title",
  "context_deck.short",
  "guide_question.editorial_bar",
  "comparison_panel.sku_matrix",
  "diagram_panel.two_column",
  "map_panel.region_distribution",
  "exam_traps.compact",
  "autocheck.short"
]
```

### Example B — Identity, Tokens, and Roles

Good for a decision-heavy page:

```ts
[
  "hero_title",
  "context_deck.short",
  "guide_question.inline_badge",
  "decision_tree.multi_branch",
  "diagram_panel.single_focus",
  "exam_signal.rule",
  "exam_traps.compact",
  "autocheck.full"
]
```

### Example C — Networking and Private Endpoints

Good for a page where spatial reasoning matters:

```ts
[
  "hero_title",
  "context_deck.expanded",
  "guide_question.editorial_bar",
  "map_panel.network_boundary",
  "diagram_panel.multi_step",
  "exam_signal.warning",
  "autocheck.short"
]
```

## Relationship With Locked Mode

Composer is not a replacement for locked mode.

Recommended strategy:

- keep `locked` as the default for scalable production
- use `composer` for pages that fail the editorial fit of the fixed contract
- keep the same QA dimensions across both modes

This creates a dual operating model:

- scale where standardization is enough
- flexibility where premium composition matters

## Implementation Phases

### Phase 1

- define block catalog
- define JSON composition schema
- define validation engine
- render block compositions into HTML

### Phase 2

- add assisted editing in Studio
- add variant switching
- add composer validation panel

### Phase 3

- add drag/drop and vertical resizing
- persist manual editorial choices
- integrate composer runs into QA and audit

## Recommendation

Build Composer first as a **structured composition engine**, not as a visual canvas.

That means:

- JSON first
- validation first
- renderer first
- drag/drop later

This keeps the product grounded in editorial logic instead of jumping too early into interface complexity.
