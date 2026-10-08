# Graph Report - onward  (2026-10-08)

## Corpus Check
- Corpus is ~25,592 words - fits in a single context window. You may not need a graph.

## Summary
- 455 nodes · 577 edges · 79 communities (30 shown, 49 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dashboard Components
- Worker Data Layer
- Next.js App Setup
- Dashboard Package Setup
- Board Ingestion Models
- Dashboard Scan State
- App TypeScript Config
- Dashboard TypeScript Config
- Worker Package Setup
- Worker TypeScript Config
- Scoring Design Concepts
- Product Scan Concepts
- Opening And State Routes
- Board Ingestion Pipeline
- Background Scan Architecture
- Vector Scoring API
- Ranking And Reason API
- Queued Scan Lifecycle
- Scan Pipeline Stages
- Hard Filter Logic
- Text Embedding API
- Scheduled Scan Orchestration
- Scoring Service Routes
- Agent Issue Guidance
- Interactive Lesson Rendering
- Opening Vector Contract
- Worker API Contracts
- Worker Health Middleware
- Database Row Adapter
- Scoring Domain Concepts
- Scan Trigger Handlers
- Next.js Environment Types
- CSS Build Configuration
- Profile Filter Fixture
- Board Registry Route
- Opening Read Adapters
- Embedding Vector Concepts
- Profile Filter Concepts
- Opening Ingestion Concepts
- Ingest And State Routes
- Application Domain
- Board Domain
- Board Registry Domain
- Embedding Domain
- Hard Filter Domain
- Opening Domain
- Recall Domain
- Resume Domain
- Scan Domain
- Scan Job Domain
- Similarity Domain
- State Domain
- Survivor Domain
- Dashboard App Shell
- Domain Documentation Policy
- Issue Tracking Map
- System Architecture
- Cloudflare Worker Bindings
- Territory Lesson
- Scheduled Cron Trigger
- Lesson Catalog
- Course Visual Identity
- Interactive Quiz Design
- Lesson Route Sequence
- Binding Reference
- Board Reference
- D1 Reference
- Hono Reference
- Queue Reference
- Reason Reference
- Vectorize Reference
- Worker Reference
- Workers AI Reference
- Job Matching Pipeline
- State Route Reference
- HTTP Route Reference
- Technical Reference Guide
- Pattern Synthesis Gap
- Visual Docs Update

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `runScan()` - 12 edges
4. `Dashboard()` - 9 edges
5. `hardFilter()` - 9 edges
6. `compilerOptions` - 9 edges
7. `Env` - 8 edges
8. `ingestBoards()` - 7 edges
9. `normalizeBoard()` - 6 edges
10. `compLabel()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Background Scan Pipeline` --semantically_similar_to--> `Embed–Filter–Score–Rank Pipeline`  [INFERRED] [semantically similar]
  docs/architecture.html → MISSION.md
- `Job-Matching Pipeline` --semantically_similar_to--> `Embed–Filter–Score–Rank Pipeline`  [INFERRED] [semantically similar]
  lessons/0001-the-territory.html → MISSION.md
- `Cloudflare Provisioning and Deployment` --references--> `Two-Database Schema`  [INFERRED]
  PROVISIONING.md → docs/contract.md
- `Repository Agent Skills` --references--> `GitHub Issue Workflow`  [EXTRACTED]
  AGENTS.md → docs/agents/issue-tracker.md
- `Repository Agent Skills` --references--> `Canonical Triage Roles`  [EXTRACTED]
  AGENTS.md → docs/agents/triage-labels.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **runScan composes the scan pipeline** — lessons_0005_ingest_ingestboards, lessons_0006_hard_filter_hardfilter, lessons_0007_embed_embedtexts, lessons_0008_score_score_survivors, lessons_0009_reason_rank_generate_reason, lessons_0010_scan_queue_runscan [EXTRACTED 1.00]
- **Manual and scheduled triggers share queued orchestration** — lessons_0012_scheduled_scheduled_handler, lessons_0012_scheduled_scan_queue, lessons_0012_scheduled_runscan [EXTRACTED 1.00]
- **Stages form the job-matching pipeline** — reference_pipeline_ingest_stage, reference_pipeline_filter_stage, reference_pipeline_embed_stage, reference_pipeline_score_stage, reference_pipeline_rank_stage [EXTRACTED 1.00]
- **Onward job-matching pipeline concepts** — context_resume, context_hard_filter, context_survivor, context_embedding, context_fit, context_scan [EXTRACTED 1.00]
- **Cloudflare services supporting the scan pipeline** — mission_cloudflare_bindings, docs_contract_two_database_schema, docs_contract_vectorize_index, docs_architecture_html_background_scan_pipeline [INFERRED 0.95]

## Communities (79 total, 49 thin omitted)

### Community 0 - "Dashboard Components"
Cohesion: 0.06
Nodes (35): CommandInput(), MagneticButton(), Sidebar(), PHRASES, useTypewriter(), App(), ScanStatus, CommandInput() (+27 more)

### Community 1 - "Worker Data Layer"
Cohesion: 0.11
Nodes (32): embedSurvivors(), embedTexts(), getVector(), storeVector(), UPSERT_VECTOR, Env, app, queue() (+24 more)

### Community 2 - "Next.js App Setup"
Cohesion: 0.05
Nodes (34): nextConfig, dependencies, framer-motion, next, @phosphor-icons/react, react, react-dom, devDependencies (+26 more)

### Community 3 - "Dashboard Package Setup"
Cohesion: 0.06
Nodes (32): dependencies, framer-motion, @phosphor-icons/react, react, react-dom, devDependencies, tailwindcss, @tailwindcss/vite (+24 more)

### Community 4 - "Board Ingestion Models"
Cohesion: 0.10
Nodes (26): ref_node_assert, ref_node_fs, ref_node_sqlite, ref_node_test, profile, raw, raw, SELECT_VECTOR (+18 more)

### Community 5 - "Dashboard Scan State"
Cohesion: 0.15
Nodes (22): Dashboard(), runScan(), setState(), ScanStatus, JobRow(), EMPTY_COPY, EmptyFiltered(), EmptyIdle() (+14 more)

### Community 6 - "App TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 7 - "Dashboard TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 8 - "Worker Package Setup"
Cohesion: 0.11
Nodes (18): @cloudflare/workers-types, hono, wrangler, dependencies, hono, devDependencies, @cloudflare/workers-types, typescript (+10 more)

### Community 9 - "Worker TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 10 - "Scoring Design Concepts"
Cohesion: 0.29
Nodes (7): Single-Context Domain Documentation, Profile, Jev Hybrid Scoring, Top-N LLM Explanation Layer, Cosine Similarity Fit, Vector Similarity Scoring, Workers AI Embeddings

### Community 11 - "Product Scan Concepts"
Cohesion: 0.33
Nodes (6): Background Scan Job, Hard Filter Policy, Manual Application Handoff, Onward Product Aim, Semantic Fit Scoring, User Opening State

### Community 12 - "Opening And State Routes"
Cohesion: 0.33
Nodes (6): GET /openings, GET /openings/ranked, Actionable ranked openings, PUT /state and GET /state, upsertState, Per-user opening state

### Community 13 - "Board Ingestion Pipeline"
Cohesion: 0.33
Nodes (6): fetchBoard, ingestBoards, normalizeBoard, normalizeJob, Opening, Per-board failure isolation

### Community 14 - "Background Scan Architecture"
Cohesion: 0.40
Nodes (5): Background Scan Pipeline, Job-Matching Pipeline, Five Cloudflare Bindings, Embed–Filter–Score–Rank Pipeline, Job-Matching Design Learning Mission

### Community 15 - "Vector Scoring API"
Cohesion: 0.50
Nodes (5): APP_DB vectors, fit score, POST /score, scoreSurvivors, Vectorize

### Community 16 - "Ranking And Reason API"
Cohesion: 0.50
Nodes (5): fit score, generateReason, POST /rank, Match reason, POST /reason

### Community 17 - "Queued Scan Lifecycle"
Cohesion: 0.40
Nodes (5): Queue consumer, runScan, POST /scan, GET /scan/:id, Scan status lifecycle

### Community 18 - "Scan Pipeline Stages"
Cohesion: 0.40
Nodes (5): Embed stage, Filter stage, Ingest stage, Rank stage, Score stage

### Community 19 - "Hard Filter Logic"
Cohesion: 0.50
Nodes (4): Exclude-term flagging, Hard exclusion, hardFilter, Semantic similarity

### Community 20 - "Text Embedding API"
Cohesion: 0.50
Nodes (4): POST /embed, Embedding, embedTexts, Workers AI bge-base-en-v1.5

### Community 21 - "Scheduled Scan Orchestration"
Cohesion: 0.67
Nodes (4): runScan, SCAN_QUEUE, scheduled handler, Shared orchestration seam

### Community 22 - "Scoring Service Routes"
Cohesion: 0.50
Nodes (4): POST /embed, POST /rank, POST /reason, POST /score

### Community 23 - "Agent Issue Guidance"
Cohesion: 0.67
Nodes (3): Repository Agent Skills, GitHub Issue Workflow, Canonical Triage Roles

### Community 25 - "Opening Vector Contract"
Cohesion: 0.67
Nodes (3): Fit, Opening Type Contract, Vectorize Openings Index

### Community 26 - "Worker API Contracts"
Cohesion: 0.67
Nodes (3): Worker API Routes Contract, Two-Database Schema, Cloudflare Provisioning and Deployment

### Community 27 - "Worker Health Middleware"
Cohesion: 0.67
Nodes (3): CORS Middleware, GET /health Route, Hono Request Context

### Community 28 - "Database Row Adapter"
Cohesion: 0.67
Nodes (3): fromRow boundary adapter, Opening, OpeningRow

### Community 29 - "Scoring Domain Concepts"
Cohesion: 0.67
Nodes (3): Cosine similarity, fit, state

### Community 30 - "Scan Trigger Handlers"
Cohesion: 0.67
Nodes (3): POST /scan, queue(batch) consumer, scheduled() handler

## Knowledge Gaps
- **234 isolated node(s):** `nextConfig`, `name`, `private`, `version`, `dev` (+229 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 264 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hono` connect `Worker Package Setup` to `Worker Data Layer`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `private` to the rest of the system?**
  _234 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05764145954521417 - nodes in this community are weakly interconnected._
- **Should `Worker Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.10782241014799154 - nodes in this community are weakly interconnected._
- **Should `Next.js App Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Dashboard Package Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.062388591800356503 - nodes in this community are weakly interconnected._
- **Should `Board Ingestion Models` be split into smaller, more focused modules?**
  _Cohesion score 0.1028225806451613 - nodes in this community are weakly interconnected._