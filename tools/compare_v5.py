"""Meet of de normalisatie in v5_ref.py de uitkomsten verschuift t.o.v. v5.py.

Zo niet, dan is v5_ref.py een geldige referentie voor de TypeScript-port.
"""
import importlib.util, statistics as st, sys
from collections import Counter

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

orig = load('v5', 'docs/v5.py')
ref  = load('v5_ref', 'tools/v5_ref.py')

N = int(sys.argv[1]) if len(sys.argv) > 1 else 400

def stats(mod, n, cfg):
    C = Counter(); T = []; L = []; NN = []
    for s in range(n):
        g = mod.Game(s, dict(cfg)); r = g.play()
        C[r] += 1; T.append(g.turn); L.append(g.pile_l); NN.append(g.pile_n)
    return C, T, L, NN

CFGS = [('basis 12/28', {}), ('10/26', dict(need_l=10, need_n=26)),
        ('14/30', dict(need_l=14, need_n=30))]

print(f"{N} seeds per configuratie\n")
print(f"{'configuratie':16s} {'bron':8s} {'med.b':>6s} {'sporen':>7s} {'verzw.':>7s}  verdeling")
for lbl, cfg in CFGS:
    for name, mod in (('v5.py', orig), ('v5_ref', ref)):
        C, T, L, NN = stats(mod, N, cfg)
        tot = sum(C.values())
        d = {k: round(100*v/tot) for k, v in sorted(C.items())}
        print(f"{lbl:16s} {name:8s} {st.median(T):6.0f} {st.mean(L):7.2f} "
              f"{st.mean(NN):7.2f}  {d}")
    print()
