# Editorial Composer Transition and Red Team

## Goal

This document defines:

1. how a page can move from `locked` mode to `composer` mode
2. what level of flexibility is allowed at each stage
3. what must be audited and validated
4. the main global risks for Studio, product UX, editorial governance, and business strategy

The intent is to let the team introduce flexibility without losing collection identity, QA traceability, or production throughput.

## Why Transition Exists

Locked pages are strong when:

- the topic fits the stable template
- throughput matters
- consistency matters more than nuance

Locked pages become weak when:

- the page is structurally sparse
- the page is structurally dense
- the narrative requires a different balance of visual, comparison, map, callout, traps, or verification

The transition exists so the team can refine a page instead of fighting the template.

## Core Rule

`locked` is never overwritten blindly.

A conversion to `composer` should create a new editable composition state while preserving the original locked page as a reference.

## Page State Model

```ts
type PageMode = "locked" | "composer";

type PageLifecycleState =
  | "draft"
  | "grounded"
  | "generated"
  | "qa_review"
  | "approved"
  | "exported";

type PageRevisionStrategy =
  | "locked_only"
  | "composer_minor"
  | "composer_structural"
  | "composer_full";
```

## Transition Levels

Not every page needs full composer freedom. Use levels.

### Level 0 — `locked_only`

Use when:

- the page fits the contract well
- only content refresh is needed
- no structural weakness is visible

Allowed changes:

- regenerate upper visual
- refresh grounded content
- re-run QA

Not allowed:

- move or replace blocks

### Level 1 — `composer_minor`

Use when:

- the page is mostly good
- only compact/expand behavior or small block tuning is needed

Allowed changes:

- compact or expand `exam_traps`
- compact or expand `autocheck`
- switch `guide_question` variant
- switch `context_deck` between `short` and `expanded`
- resize predefined vertical bands within safe limits

Not allowed:

- reorder technical core
- replace core block families

### Level 2 — `composer_structural`

Use when:

- the fixed layout is the problem
- the page needs a different technical storytelling path

Allowed changes:

- replace `comparison_panel` with `decision_tree`
- add or remove `exam_signal`
- replace `map_panel` with another technical core block
- rebalance top/body/bottom zones within composer rules

Not allowed:

- violate minimum required coverage

### Level 3 — `composer_full`

Use when:

- the page is strategically important
- the topic is highly irregular
- the page is an editorial benchmark or flagship

Allowed changes:

- full block composition inside the Composer grammar
- auto-compose or manual compose
- manual reorder and resize of compatible blocks

Still required:

- pass structural validation
- pass editorial validation
- preserve exam value

## Locked to Composer Conversion

### Conversion Output

When a locked page is converted, the system should create:

- original locked reference
- new composer composition draft
- transition audit record

### Base Mapping

The system should map the locked page into composer blocks like this:

```ts
[
  "hero_title",
  "context_deck",
  "guide_question",
  "upper_visual",
  "exam_traps",
  "autocheck"
]
```

If the page already contains clear internal technical modules, the system may also infer:

- `diagram_panel`
- `comparison_panel`
- `map_panel`
- `decision_tree`

from the current page payload or grounded seed.

### Conversion Requirements

The conversion flow must:

1. keep the original locked HTML/output as reference
2. create a `composerDraftId`
3. mark who initiated conversion
4. record why conversion was requested
5. record what flexibility level was chosen

## Audit Requirements

Every transition should generate a persistent event.

```ts
type ComposerTransitionEvent = {
  pageId: string;
  fromMode: "locked";
  toMode: "composer";
  level: "composer_minor" | "composer_structural" | "composer_full";
  requestedBy: string;
  requestedAt: string;
  reason: string;
  lockedReferenceVersion: string;
};
```

Every later composer edit should also be tracked:

- block added
- block removed
- block resized
- variant changed
- validation re-run
- approval blocked or restored

## Validation Rules After Transition

A page converted to composer should not inherit approval automatically.

After conversion:

- approval must be reset to review
- structural validation must run again
- editorial validation must run again
- page must show delta from locked reference

## Delta View Recommendation

Studio should eventually expose:

- locked reference preview
- composer draft preview
- changed blocks summary
- score delta

Example:

- `+ exam_signal.warning`
- `comparison_panel -> decision_tree`
- `exam_traps.standard -> compact`
- `readability +0.7`
- `useful_density +1.1`

## UX Recommendation for Transition

The Studio flow should be explicit, not hidden.

### Suggested Actions

- `Mantener en modo locked`
- `Pasar a Composer (ajustes menores)`
- `Pasar a Composer (cambios estructurales)`
- `Abrir Composer completo`

### Required Prompt

Before transition, ask for a reason:

- `huecos no informativos`
- `el rail inferior consume demasiado`
- `la narrativa tecnica pide otro bloque`
- `la pagina no alcanza el umbral premium`
- `otro motivo editorial`

This reason should be stored in audit.

## Global Red Team

This section captures product-wide and business-wide risk.

### 1. Product Positioning Risk

The product still risks looking like a hybrid of:

- internal demo
- production tool
- editorial experiment

If those layers are not clearly separated, users and operators lose confidence about what is truly ready.

### 2. Editorial Risk

Locked mode guarantees consistency, but can force structure over story.

Composer solves that only if it remains governed.

If not governed, the collection can drift into:

- inconsistent rhythm
- too much local cleverness
- weaker collection identity

### 3. UX Risk

Studio still has a tendency to explain system mechanics more clearly than editorial decisions.

The strongest UI should always answer:

- where am I
- what is blocking this page
- what changed
- what is the next best action

### 4. Governance Risk

Without strong audit and versioning, Composer can become a silent source of variability.

Required guardrails:

- transition audit
- edit audit
- validation history
- compare to locked reference

### 5. Technical Risk

Composer introduces another layer of complexity:

- content
- composition
- renderer
- validation
- output

If those layers are not kept separate, frontend/runtime regressions will multiply.

### 6. Operational Risk

If every difficult page becomes a custom layout, the team can lose throughput.

Composer should be used selectively:

- as a refinement path
- not as the default for all pages

### 7. Business Risk

Your market promise is premium accelerated learning.

The risk is not only bugs. The real risk is:

- inconsistent perceived quality
- unclear editorial standards
- outputs that feel half-system, half-manual
- pages that look “different” without feeling intentionally designed

### 8. Brand Risk

CloudBooks needs a recognizable editorial grammar.

Composer must support:

- variation inside a family
- not visual improvisation page by page

## Recommendation

Adopt a dual model:

- `locked` remains the default production path
- `composer` becomes the controlled exception path

Use composer when it improves the page enough to justify the extra editorial cost.

## Next Implementation Steps

1. define transition types and events in TypeScript
2. define `locked -> composer` conversion payload
3. store composer draft separately from locked output
4. add validation and audit hooks
5. build a compare view before building full drag-and-drop

## Final Principle

Composer should increase editorial intelligence, not just editing freedom.

If the team cannot explain:

- why a page left locked mode
- what changed
- why the new version is better

then the Composer transition has failed, even if the page looks more flexible.
