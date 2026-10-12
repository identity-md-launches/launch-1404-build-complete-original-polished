# Submission path budget

The complete submission must remain below 8,388,608 bytes. Planned uncompressed path ceilings:

| Paths                                                   |      Budget |
| ------------------------------------------------------- | ----------: |
| `src/`, `scripts/`, configuration and lockfile          |   600,000 B |
| `public/` (original art and licenses)                   |   500,000 B |
| `dist/` (complete export, including bundled Three.js)   | 1,800,000 B |
| `artifacts/` (actual checks and compressed screenshots) | 3,500,000 B |
| root documentation                                      |   100,000 B |
| `.gitignore`                                            |       512 B |
| headroom                                                | 1,887,584 B |

The explicit `.gitignore` path budget is 512 bytes. It excludes dependency and tool caches at every nesting level, never the production export. This worker installs its build toolchain outside the repository. No dependency directories, dependency archives, registry mirrors, submodules or credentials belong in the submission. `test/scratch/` is disposable and removed by the assignment runner.
