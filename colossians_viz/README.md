# NT → OT Cross-References

Interactive arc visualization of the New Testament's quotations of and allusions to the Old Testament.

## Files

```
nt_ot_arcs.html       ← main visualization
data/
  citations.json      ← 320 direct NT quotations of OT
  allusions.json      ← ~2,000 verbal parallels (allusions)
```

## Viewing

### GitHub Pages (recommended)
1. Go to **Settings → Pages** in this repo
2. Set Source to **Deploy from a branch**, branch `main`, folder `/`
3. Visit `https://philmthompson.github.io/Colossians/nt_ot_arcs.html`

### Local
Because the page loads JSON via `fetch()`, you need a local web server — simply opening the HTML file directly won't work.

```bash
# From the repo root:
python -m http.server 8000
# Then open: http://localhost:8000/nt_ot_arcs.html
```

## Features

- **Arc diagram** — each arc connects an OT source (left side) to its NT quotation/allusion (right side)
- **Color** — arc hue reflects OT book position: gold (Torah) → purple (Prophets)
- **Filter** — click a book label to show only connections to that book; click again to clear
- **Mode buttons** — toggle between All / Citations only / Allusions only
- **Hover** — see NT and OT references, LXX flag, and chapter citation counts
- **Click** (citations only) — opens both passages in ESV.org

## Data Sources

- Citations derived from the OT and NT sheets of `CrossRef_1_1_2.xlsx`
- Allusions derived from the Allusions sheet of the same file
