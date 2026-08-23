"""Genereert de golden traces waar tests/parity.test.ts de TS-engine tegen legt.

Twee lagen:
  - `traces`: volledige toestand na elke beurt voor een handvol seeds. Wijkt de
    port af, dan wijst de test de beurt en het veld aan.
  - `hashes`: één hash per partij over veel seeds. Breed net, geen groot bestand.
"""
import hashlib, importlib.util, json, os, sys

spec = importlib.util.spec_from_file_location("v5_ref", os.path.join(os.path.dirname(__file__), "v5_ref.py"))
ref = importlib.util.module_from_spec(spec); spec.loader.exec_module(ref)

ALL = ref.ALL
IDX = {c: i for i, c in enumerate(ALL)}

def mask(cells):
    v = 0
    for c in cells:
        if c in IDX: v |= 1 << IDX[c]
    return format(v, 'x')

def digest(g):
    return {
        "t": g.turn, "s": g.stock, "b": g.box, "l": g.pile_l, "n": g.pile_n,
        "a": mask(g.alive), "m": mask(g.marks),
        "w": "".join(str(g.w[c]) for c in ALL),
        "p": IDX[g.npos], "d": g.done or "",
    }

def run(seed, cfg, maxturns=80):
    g = ref.Game(seed, dict(cfg))
    rows = []
    setup = {
        "seat": IDX[g.seat], "npos": IDX[g.npos],
        "tiles": [g.tile.get(c) for c in ALL],
        "stock": g.stock, "box": g.box,
    }
    while g.turn < maxturns and not g.done:
        g.turn += 1
        g.laatste_turn()
        if g.done:
            rows.append(digest(g)); break
        g.nexus_turn()
        if g.done:
            rows.append(digest(g)); break
        g.hist.append((g.pile_l, g.pile_n))
        if len(g.alive) <= 1:
            g.done = 'niets'
        rows.append(digest(g))
    return setup, rows, (g.done or "timeout"), g.turn

CONFIGS = [
    ("basis", {}),
    ("drempels-10-26", dict(need_l=10, need_n=26)),
    ("drempels-14-30", dict(need_l=14, need_n=30)),
    ("drie-handelingen", dict(acts=3)),
    ("een-stap", dict(nexus_moves=1)),
    ("geen-voeding", dict(feed=False)),
    ("geen-oogst", dict(harvest=False)),
    ("motoren-0", dict(engines=0)),
    ("ruim-lichaam", dict(start=12, total=40)),
]

TRACE_SEEDS = list(range(8))
HASH_SEEDS = list(range(200))

out = {"configs": [], "generator": "tools/v5_ref.py"}
for name, cfg in CONFIGS:
    entry = {"name": name, "cfg": cfg, "traces": [], "hashes": []}
    for s in TRACE_SEEDS:
        setup, rows, res, turns = run(s, cfg)
        entry["traces"].append({"seed": s, "setup": setup, "rows": rows,
                                "uitslag": res, "turns": turns})
    for s in HASH_SEEDS:
        setup, rows, res, turns = run(s, cfg)
        blob = json.dumps([setup, rows, res, turns], sort_keys=True, separators=(',', ':'))
        entry["hashes"].append(hashlib.sha256(blob.encode()).hexdigest()[:16])
    out["configs"].append(entry)
    print(f"  {name:20s} {len(entry['traces'])} traces, {len(entry['hashes'])} hashes", file=sys.stderr)

dst = os.path.join(os.path.dirname(__file__), "..", "tests", "golden", "v5.json")
with open(dst, "w") as f:
    json.dump(out, f, separators=(',', ':'))
print(f"geschreven: {os.path.relpath(dst)} ({os.path.getsize(dst)/1024:.0f} kB)", file=sys.stderr)
