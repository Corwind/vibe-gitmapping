# vibe-gitmapping — Gource as a Web App

## Vision

Recreate [Gource](https://gource.io/) as a performant, interactive web application. The visualization renders a git repository's history as an animated 3D tree: the root is the center, directories are branches, files are leaves, and contributors move through the tree as they make changes over time.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Build | **Vite** | Fast HMR, native ESM, excellent TS support |
| UI | **React 19 + TypeScript** | Component model, ecosystem, type safety |
| 3D Rendering | **React Three Fiber (R3F)** + **Three.js** | Best React/Three.js integration, large ecosystem |
| File Nodes | **InstancedMesh** (native, not Drei `<Instances>`) | Single draw call for thousands of files — critical for perf |
| Tree Layout | **Custom radial tree** | Gource uses a radial directory tree, not force-directed |
| Parsing | **Web Worker** | Off-main-thread git log parsing to keep UI at 60fps |
| State | **Zustand** | Lightweight, works well with R3F's render loop |
| Helpers | **@react-three/drei** (selective) | Camera controls, text, billboard sprites |

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   React UI                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Controls │  │ Timeline │  │  Info Panel    │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
├─────────────────────────────────────────────────┤
│              R3F Canvas (Three.js)               │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │InstancedMesh│ │  Edges     │ │ Avatars     │  │
│  │ (files)    │ │ (lines)    │ │ (sprites)   │  │
│  └────────────┘ └────────────┘ └─────────────┘  │
├─────────────────────────────────────────────────┤
│                  Zustand Store                   │
│  tree state · animation state · camera state     │
├─────────────────────────────────────────────────┤
│              Web Worker (off-thread)              │
│  git log parser · commit iterator · layout calc  │
└─────────────────────────────────────────────────┘
```

## Hard Requirements

- **Stable 60 FPS** regardless of repository size. Linux kernel scale (~70k files, ~1M commits) must be smooth.
- **All main Gource features**: laser beams from contributors to files, bloom post-processing, auto-tracking camera, browseable contribution timeline.
- **Repository input**: open a local git repo OR clone a public repo from an HTTP URL.
- **Drag-and-drop** git log file input (nice-to-have).

## Performance Strategy

1. **InstancedMesh** — Render all file nodes (thousands) in a single draw call. Use `.count` to only render visible nodes. Reuse a single dummy `Object3D` for matrix updates.
2. **Web Workers** — Parse git logs and compute layout off the main thread.
3. **Frustum culling** — Skip rendering nodes outside the camera viewport.
4. **LOD (Level of Detail)** — Reduce detail for distant nodes. Collapse deep directories when zoomed out.
5. **Temporal batching** — Process commits in time-window batches, not one-by-one.
6. **Object pooling** — Reuse geometries, materials, and sprite textures.
7. **Throttled state updates** — Decouple animation loop (60fps) from React re-renders.
8. **Spatial indexing** — Use an octree/grid for fast nearest-neighbor lookups and collision avoidance.
9. **Streaming parsing** — Parse git logs in chunks, never load entire history into memory at once.

## Data Model

### Git Log Format (Gource custom format)
```
timestamp|username|action|filepath|color
1234567890|Alice|A|src/main.ts|4488FF
1234567890|Alice|M|README.md|
```

Actions: `A` (add), `M` (modify), `D` (delete)

### Internal Models

```typescript
interface FileNode {
  id: string;           // full path
  name: string;         // filename
  parent: string;       // parent directory path
  extension: string;
  color: number;        // hex color derived from extension
  position: [number, number, number];
  lastModified: number; // timestamp
  lastAuthor: string;
  alive: boolean;       // false if deleted
}

interface DirNode {
  id: string;           // full directory path
  name: string;
  parent: string | null;
  children: string[];   // child node IDs (files + subdirs)
  position: [number, number, number];
  angle: number;        // radial angle from parent
  depth: number;
}

interface Contributor {
  name: string;
  avatar?: string;      // gravatar URL
  color: number;
  position: [number, number, number];
  targetFile: string | null; // file being modified
  active: boolean;
}

interface Commit {
  timestamp: number;
  author: string;
  files: { action: 'A' | 'M' | 'D'; path: string; color?: number }[];
}
```

## Phases

### Phase 1: Project Scaffolding
- Initialize Vite + React + TypeScript project
- Install dependencies (R3F, drei, zustand, three)
- Set up project structure (src/components, src/workers, src/store, src/types, src/utils)
- Configure ESLint + Prettier
- Create basic R3F Canvas with orbit controls
- Set up a `.gitignore` with standard ignores

### Phase 2: Git Log Parser
- Define the Gource custom log format types
- Build a parser that reads the pipe-delimited format
- Build a converter: `git log` raw output -> Gource format
- Run parser in a Web Worker
- Write unit tests for the parser
- Support loading from: file upload, pasted text, or CLI-generated input

### Phase 3: Tree Data Structure & Layout Engine
- Build an incremental tree structure (add/remove files over time)
- Implement radial tree layout algorithm:
  - Root at center (0,0,0)
  - Directories spread radially from parent
  - Files positioned at leaf ends
  - Dynamic rebalancing as nodes are added/removed
- Animate layout transitions (smooth position interpolation)
- Depth-based spacing to avoid overlap

### Phase 4: 3D File Node Rendering
- Render file nodes using a single `InstancedMesh`
- Color files by extension (language-based color map)
- Glow/pulse effect on recently modified files
- Fade-out animation for deleted files
- Scale nodes based on activity or file size
- Implement frustum culling (skip offscreen instances)

### Phase 5: Directory Edges & Structure
- Render tree edges (directory connections) using `LineSegments` with `BufferGeometry`
- Animate edge growth as new directories appear
- Fade edges when directories are removed
- Optional: curved edges using `CatmullRomCurve3`

### Phase 6: Contributor Avatars
- Render contributors as billboard sprites
- Animate contributor movement toward target file
- Beam/laser effect from contributor to file being modified
- Show contributor name labels
- Idle contributors drift to the edge and fade out
- Support Gravatar or custom avatar images

### Phase 7: Animation Timeline & Playback
- Build a timeline scrubber UI component
- Play/pause/speed controls (seconds-per-day)
- Commit-by-commit stepping (forward/backward)
- Time display showing current date
- Keyboard shortcuts (Space, arrow keys, N for next)
- Smooth time interpolation between commits

### Phase 8: Camera & Interactivity
- Orbit controls (rotate, zoom, pan)
- Auto-tracking camera that follows activity
- Click on file node to show info (author, last modified, path)
- Hover highlights
- Search/filter by filename or author
- Toggle camera modes (overview vs. tracking)

### Phase 9: UI Controls & Configuration Panel
- Sidebar/overlay with settings:
  - Playback speed
  - Toggle file labels, directory names, edges
  - Color scheme selector
  - File/directory filter (regex)
  - Author filter
- File upload area for git log input
- Export: screenshot, video recording (MediaRecorder API)
- Responsive layout

### Phase 10: Performance Optimization & Polish
- Profile with Chrome DevTools & `r3f-perf`
- Implement LOD for deep trees
- Directory collapsing for zoomed-out views
- Benchmark with large repos (Linux kernel, Chromium)
- WebGPU renderer as optional upgrade path
- Bloom post-processing effect (optional, toggle-able)
- Loading states and progress indicators

## File Structure

```
vibe-gitmapping/
├── public/
│   └── sample-logs/          # Example git log files
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── Scene.tsx           # Main R3F scene
│   │   │   ├── FileNodes.tsx       # InstancedMesh file rendering
│   │   │   ├── DirectoryEdges.tsx  # Tree edge lines
│   │   │   ├── Contributors.tsx    # Avatar sprites
│   │   │   └── Effects.tsx         # Post-processing
│   │   ├── ui/
│   │   │   ├── Timeline.tsx        # Playback scrubber
│   │   │   ├── Controls.tsx        # Settings panel
│   │   │   ├── FileUpload.tsx      # Log file input
│   │   │   └── InfoPanel.tsx       # Node details
│   │   └── App.tsx
│   ├── workers/
│   │   ├── logParser.worker.ts     # Git log parsing
│   │   └── layoutEngine.worker.ts  # Tree layout computation
│   ├── store/
│   │   ├── useTreeStore.ts         # Tree state
│   │   ├── useAnimationStore.ts    # Playback state
│   │   └── useCameraStore.ts       # Camera state
│   ├── types/
│   │   └── index.ts                # Shared type definitions
│   ├── utils/
│   │   ├── colors.ts               # Extension -> color mapping
│   │   ├── layout.ts               # Radial tree layout math
│   │   └── constants.ts            # Config constants
│   └── main.tsx
├── tests/
│   ├── parser.test.ts
│   ├── layout.test.ts
│   └── tree.test.ts
├── PLAN.md
├── PROGRESS.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## References

- [Gource GitHub](https://github.com/acaudwell/Gource)
- [Gource website](https://gource.io/)
- [React Three Fiber docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh)
- [R3F scaling performance](https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance)
- [3d-force-graph](https://github.com/vasturiano/3d-force-graph) (reference for 3D graph perf)
