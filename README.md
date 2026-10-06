# AgentDeck

**English** | [繁體中文](README.zh-TW.md)

A web slide framework written by an LLM and fine-tuned live by a human. A deck is plain-text HTML/CSS/JS: the LLM writes the storyboard `story.js` and pulls in components as needed; during playback a human edits text, positions, and visibility directly, saved to `edits.js`.

Double-click `templates/blank/index.html` to preview — no install, build, or network needed.

**Start here: [`docs/getting-started.md`](docs/getting-started.md)** (full workflow, CLI, and how to use it in other projects).

**See it in action: [the project site](https://echoslayer.github.io/AgentDeck/)** (itself an AgentDeck deck) and [components and interactive examples](examples/index.html). Ready-made components are used after reading their API; interactive examples are rewritten inside your theme after reading their notes. Pages set the order of explanation, and one page can hold a complete interactive experiment.

Design decisions are in [`docs/adr/`](docs/adr/README.md); the rules for making decks are in [`AGENTDECK.md`](AGENTDECK.md) (shared upstream and downstream); upstream maintenance rules are in [`AGENTS.md`](AGENTS.md); writing advice is in [`docs/guides/`](docs/guides/).

> Detailed docs (ADRs, guides, `AGENTDECK.md`) are currently in Traditional Chinese.

## Layout

```text
AgentDeck/
├── AGENTDECK.md             Rules for making decks (copied into downstream workspaces on init)
├── AGENTS.md                Upstream maintenance rules
├── package.json             CLI package (not published to npm; run via npx github:, see docs/adr/0016)
├── cli/                     AgentDeck CLI: init, status, catalog, docs, add, diff, update, new, join, vendor, pack, export (check.mjs is the regression test; full help: node cli/agentdeck.mjs --help)
├── assets/
│   ├── story-reader/        Reader (maintained here, includes zoomed playback, see docs/adr/0006)
│   │   ├── reader.css
│   │   └── reader.js
│   ├── deck/
│       ├── deck.css         Shell: default tokens, header, page numbers, cover/end layout, editor styles
│       ├── deck-core.js     Core: cover/end page types, component registry and contract checks, special-component lifecycle (see docs/adr/0009, 0013)
│       ├── deck-editor.js   Editor: editable text/dragging, save as edits.js
│       ├── components/      Opt-in components in basic/special tiers (CATALOG.md is the index, index.html the showcase)
│       │   └── <name>/      <name>.js, <name>.css, README.md
│   └── theme/               Brand theme: change only this to rebrand (see docs/adr/0010)
│       ├── theme.css        Token overrides, header logo, cover/end backgrounds and layout
│       ├── theme.js         deck.theme({ cover, end }): cover/end logos
│       ├── README.md        Brand rules
│       └── img/             Hand-drawn SVGs by default (CC0)
├── templates/blank/         Blank skeleton (cover, one content page, end); shows the contract only, no writing style
│   ├── index.html
│   ├── story.js
│   ├── edits.js             Human edits (empty by default)
│   ├── story.css
│   └── plan.md              Plan template (fill in before building; not packed)
├── docs/
│   ├── getting-started.md   Entry point: workflow and use in other projects (see docs/adr/0014)
│   ├── adr/                 Architecture decision records
│   ├── studies/             Experiment reports, measurements, and limitations
│   ├── migrations/          Contract-version migration notes (<n>-to-<m>.md)
│   └── guides/              Writing guides (advice, not mandatory), e.g. visual-story.md
├── playground/              Local research; trial decks are each init'd as standalone units (not in git)
├── site/                    Project website: an AgentDeck deck (English; Chinese in lang/zh/), deployed to GitHub Pages by .github/workflows/pages.yml
├── examples/                Interactive examples (in git, stay upstream, read with cli docs --code; reference for rewriting, not a runtime dependency)
│   ├── index.html           Showcase of components and interactive examples
│   └── <name>/              One folder per example; list in examples/README.md or cli catalog
├── vendor.json              Third-party package manifest (version, URL, SHA-256; see docs/adr/0011)
├── vendor/                  Package files, downloaded by cli vendor (not in git)
├── skills/                  agentdeck builds decks, agentdeck-upgrade updates existing ones (install with tools\install-skill.cmd)
├── tools/                   install-skill.cmd installs the skills (downloading, packing, and workspaces use the cli)
└── dist/                    Packed zip output (not in git)
```

Load order is fixed; see the last item of "分鏡資料契約" (storyboard data contract) in [`AGENTDECK.md`](AGENTDECK.md#分鏡資料契約).

## Editable and locked layers

Content falls into two kinds of resources:

| Kind | Source | Content | How to change |
| --- | --- | --- | --- |
| Human-editable | `edits.js` | Text marked `data-edit`, positions marked `data-move`, header topic name, each page's `section`/`title`/`lead`/`point`/`detail`, component show/hide, per-page comments | Press "✎ 編輯" (Edit) in the header during playback; comments are in the right-hand "註解" tab |
| Locked (rewrite needed) | `story.js`, `assets/` | Logos, backgrounds, component content and structure, questions, `mount` interactions | Change the code |

- Playback, editing, shortcuts, and saving: [`getting-started.md` "播放與現場編輯"](docs/getting-started.md#播放與現場編輯).
- `data-key`/`data-edit`/`data-move`/`data-hide`/`data-canvas` for custom components: [`AGENTDECK.md` "標記規範"](AGENTDECK.md#標記規範自製元件) ([ADR 0005](docs/adr/0005-data-key-attribute-model.md)). Legacy `data-edit="x"`/`data-move="x"` values are still treated as keys.
- Read-aloud scripts, narration-synced presenter actions, and PPT export are advanced steps after content is approved: [`getting-started.md` "內容確認後的下一輪"](docs/getting-started.md#內容確認後的下一輪).

## Creating a new deck

With the AgentDeck skill installed, tell your coding agent: “Create an AgentDeck from `D:\my-project` for a progress report to my boss. Use the data in `D:\reports`; use local resources only.” Without the skill, ask it to read this repository's `AGENTDECK.md` first.

The agent first reads the supplied material, then groups essential questions about purpose, use, and resources into one round with suggested answers. If the direction is already clear, or you say “you decide,” it proceeds within the agreed resource limits. It chooses suitable components, customizes where needed, and assesses whether parallel work is worthwhile. Reuse saves repeated implementation without forcing the project into a template. Paid services, uploads, and publishing require authorization covering those actions.

Workflow, CLI, and use in other projects are in [`docs/getting-started.md`](docs/getting-started.md). Inside upstream, trial units can only be created with `node cli/agentdeck.mjs init playground/<topic>` (the project site in `site/` is the one committed exception, [ADR 0032](docs/adr/0032-pages-site-unit.md)); real decks are created in the target project with `npx -y github:Echoslayer/AgentDeck init <location>/<topic>` ([ADR 0016](docs/adr/0016-registry-copy-and-contract-version.md), [0017](docs/adr/0017-presentation-entry-layout.md)).

## Storyboard data contract

`story.js` defines a global `story` (`title`, `label`, `pages`: `id`, `section`, `title`, `lead`, `art`, `point`, `detail`, optional `question`, `mount`, `previewArt`); the reader validates it on load and throws if it doesn't match. Full fields, rules, and load order are in [`AGENTDECK.md`](AGENTDECK.md#分鏡資料契約); it is covered by the contract version, which the core exposes as `deck.contract` ([ADR 0016](docs/adr/0016-registry-copy-and-contract-version.md)). Plugin layers (such as the editor) access reader state only through `window.storyReader` and the `story:render` event ([ADR 0008](docs/adr/0008-decouple-editor-reader.md)).

## Layout mapping

| Layout | Web approach |
| --- | --- |
| Cover (logo + title + author, date) | Write `deck.cover({ title, meta })` on the page |
| Gradient title bar + top-right logo on content pages | Applied automatically by the `header`; not written in the story |
| Lists ● / – / 1. / 1) | `deck.list(key, items)` (requires the list component); items are strings or `{ text, items }`, up to four levels |
| Page-number circle | Applied automatically by the bottom navigation |
| Thank You ending | Write `deck.end()` on the page |

Cover and end pages automatically hide the reader's section, title, lead, and point; `title` is still used for the index and thumbnails.

## Components (`assets/deck/components/`)

Components work like extensions: the template preloads none, you include them when needed. The list and when to use each are in [`CATALOG.md`](assets/deck/components/CATALOG.md); each component's API is in its `README.md`. Double-click [`assets/deck/components/index.html`](assets/deck/components/index.html) to preview all of them, and press "✎ 編輯" in the header to try editing.

| Tier | Components | Traits |
| --- | --- | --- |
| Basic | Text and structure: list, cards, focus, compare, matrix<br>Order and flow: steps, flow, sequence, timeline<br>Quantities and values: metrics, table, bars, split, range, trend, figure | Static HTML/SVG/CSS, zero dependencies, usable in any deck |
| Special | Explanatory interaction: stepper, predict, slider, evolution, physics (matter-js), celebrate (canvas-confetti)<br>Content: code (highlight.js), math (KaTeX), terminal (asciinema-player), lottie (lottie-web)<br>Relations and proportions: sankey, treemap (d3), network (cytoscape)<br>Hand-drawn and emphasis: mark (rough-notation), sketch (rough.js)<br>3D and animation: surface, stack3d, globe (three.js), cube (CSS 3D), model (zdog), backdrop (vanta + three.js) | Dynamic content or depend on `vendor/` packages; have a static fallback, use only on key pages |

Calls are always `deck.<name>(key, …)`, where the first argument is the `data-key`; `deck-core.js` checks the key format, single root element, and root key on every call. Calling a component that isn't included throws with a path hint; including the js but missing the css logs an error to the console. The core starts special components' dynamic content when the page appears and releases it on page change, so themes don't write `mount` ([ADR 0013](docs/adr/0013-component-tiers.md)). Adding a shared component requires human approval ([ADR 0009](docs/adr/0009-components-as-extensions.md)).

## Brand theme (`assets/theme/`)

Color tokens: `--deck-primary` (titles, emphasized text), `--deck-accent` (arrows, bars, page numbers), `--deck-highlight` (highlighted items), `--deck-gradient` (header and cover/end). The reader's `--accent` maps to `--deck-primary`. Defaults live in `deck.css`; brands override them in `assets/theme/theme.css`; components use only these tokens.

Cover/end logos come from `assets/theme/theme.js` via `deck.theme({ cover: img => html, end: img => html })`. Each decoration needs a `data-key` so it can be hidden individually live. Default images are hand-drawn SVGs (CC0, see `assets/theme/img/README.md`).

To reuse a given template, `init --theme <theme folder>` replaces the default theme with that folder. PPT templates are first converted into a theme folder following [`docs/guides/theme-from-pptx.md`](docs/guides/theme-from-pptx.md); by default only the logo and background are taken, and conversion covers only the theme layer without adding page types ([ADR 0019](docs/adr/0019-theme-templates.md)).

## Branded versions (downstream projects)

AgentDeck is the upstream framework; each deck creates its own downstream unit with `npx -y github:Echoslayer/AgentDeck init <location>/<topic>`. Downstream framework copies all live in the unit's `agentdeck/` (upstream paths prefixed with `agentdeck/`). `agentdeck/assets/theme/` and `resources/` belong to the downstream; the core and components are diffable copies, kept in sync with `diff` and `update core` ([ADR 0010](docs/adr/0010-theme-layer-and-downstream.md), [ADR 0016](docs/adr/0016-registry-copy-and-contract-version.md), [ADR 0017](docs/adr/0017-presentation-entry-layout.md)). An existing brand can be copied into each unit; don't make playback depend on other folders.

## Third-party packages and delivery

Third-party packages (e.g. three.js for special components) are **not in git**: `vendor.json` records version, URL, and SHA-256, and files download to `vendor/<name>/`; downstream units use `agentdeck/vendor.json` and `agentdeck/vendor/<name>/` ([ADR 0011](docs/adr/0011-vendor-manifest-and-packing.md)).

- **Set up**: after cloning, run `node cli/agentdeck.mjs vendor` (`agentdeck vendor` in downstream workspaces) to download and verify hashes; reruns skip ready files. Add `--check` to only check. Without downloads, components that need packages show their static fallback.
- **Referencing**: the downstream root `index.html` uses relative paths, e.g. `<script src="agentdeck/vendor/three/three.min.js"></script>`; related entries use `../../agentdeck/vendor/`. Only files loadable via `<script>` under `file://` are accepted (UMD/IIFE, css, fonts, images) — no CDN.
- **Adding a package**: with human approval, add an entry to `vendor.json`; leave `sha256` empty, run `agentdeck vendor` to print the actual hash, verify the source, then fill it in.
- **Delivering to others**: run `agentdeck pack` inside the unit. It includes the root `index.html`, unit resources, related entries, the framework in `agentdeck/`, and the components and packages the entries reference (with license files), downloading missing packages first; it excludes unreferenced components, authoring notes (`*.md`), authoring skeletons, plans, CLI records, and previous pack outputs. After unzipping, the top level holds only `index.html`, `resources/`, `agentdeck/` (and related groups); the root page plays directly, with no redirects or `<base>`. `pack <entry folder>` can choose a related entry as the delivery home page; usually pack the whole unit.
  - To keep a forwarded zip from being opened by others: `pack` doesn't encrypt; wrap it with AES-encrypted compression instead, e.g. `7z a -p -mhe=on deck.7z dist/<file>.zip` (`-mhe=on` also encrypts file names), and send the password through another channel. Avoid `zip -e` (ZipCrypto is breakable). Unzipped content is plaintext; to revoke access, host it on a server that requires login.
- **PPT export (optional, advanced)**: only after content is approved, use `agentdeck export` to write `dist/<name>.pptx`; requires Chrome/Edge, and recording also needs ffmpeg. Details in [`getting-started.md` "內容確認後的下一輪"](docs/getting-started.md#內容確認後的下一輪) ([ADR 0021](docs/adr/0021-pptx-export.md), [0025](docs/adr/0025-native-pptx-annotations.md)).

## Updating the reader

The reader is maintained independently in this project ([ADR 0006](docs/adr/0006-fork-story-reader.md)) and not synced with external projects; with human approval, edit `assets/story-reader/` directly. All styling lives in `deck.css` and `assets/theme/` and is unaffected. Changes must keep the public interface `window.storyReader` and the `story:render` event, which are all the editor depends on ([ADR 0008](docs/adr/0008-decouple-editor-reader.md)).

Each page's navigation bar shows a small "以 AgentDeck 製作" (Made with AgentDeck) line at the bottom right, linking to this project on GitHub; it sits inside the bar's padding, takes no layout space, and remains visible in zoomed playback. It is injected by `reader.js`, so existing decks get it after `update core`; brands can hide it by adding `.made-with{display:none}` to `theme.css`.

## License

The framework (CLI, `assets/`, `templates/`, `examples/`, docs) is licensed under [MIT](LICENSE): free to use, modify, fork, and use commercially, provided copies keep the copyright and license notice in `LICENSE`. `init`/`update core` copy it to downstream `agentdeck/LICENSE`, and `pack` includes it with the framework in deliveries.

- **Deck content is not covered by this license**: downstream `index.html`, `resources/`, and assets belong to their authors, who choose their own license.
- **Modifying or forking the framework**: your own changes may use any license (including private), but original files must keep their MIT notice.
- **Third-party packages** follow their own licenses (see `license` in `vendor.json`); license files are downloaded and packed with them.
