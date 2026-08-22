"""ADEUK v3 — laag 1 + 2: gedeelde voorraad, web tegen punt.

Laag 1 (rekensom): 36 tegels, zij wint bij 12 doorgegeven, hij bij 28
opgehouden. 12+28=40>36 dus ze kunnen niet allebei; het bord raakt
gegarandeerd op.

Laag 2 (bord): zij verzamelt via een draad (reiken/vatten/doorgeven),
hij verzwelgt via een bewegend punt. Elke tegel die hij opneemt voedt
haar met 1 substantie.
"""
import random
from collections import defaultdict, deque, Counter
import statistics as st

DIRS = [(1,-1),(1,0),(0,1),(-1,1),(-1,0),(0,-1)]

def ring(n):
    if n == 0: return [(0,0)]
    out = []; c = (DIRS[4][0]*n, DIRS[4][1]*n)
    for i in range(6):
        for _ in range(n):
            out.append(c); c = (c[0]+DIRS[i][0], c[1]+DIRS[i][1])
    return out

def dd(a,b): return max(abs(a[0]-b[0]), abs(a[1]-b[1]), abs(a[0]+a[1]-b[0]-b[1]))
def nb(c): return [(c[0]+d[0], c[1]+d[1]) for d in DIRS]

ALL = [(0,0)] + ring(1) + ring(2) + ring(3)
ALLSET = set(ALL)
MID = set(ring(2))
YIELD = {'bewoond':2, 'planeet':1, 'komeet':1, 'gat':1, 'stil':0}

class Game:
    def __init__(self, seed, cfg=None):
        c = dict(start=8, total=30, need_l=12, need_n=28, nexus_moves=2,
                 feed=True, claim_cost=2, claim_back=0, harvest=True, engines=2, acts=2)
        if cfg: c.update(cfg)
        self.cfg = c
        self.rng = random.Random(seed)

        deck = (['planeet']*12 + ['bewoond']*6 + ['komeet']*6 +
                ['gat']*6 + ['stil']*6)
        self.rng.shuffle(deck)
        self.tile = dict(zip(ALL, deck))
        self.alive = set(ALL)
        self.open = set(MID)

        covered = [x for x in ALL if x not in MID]
        self.seat = self.rng.choice(covered)
        self.open.add(self.seat); self.tile[self.seat] = 'seat'
        pool = [x for x in ALL if x != self.seat and dd(x, self.seat) >= 5]
        self.npos = self.rng.choice(pool or [x for x in ALL if x != self.seat])

        self.stock = c['start']; self.box = c['total'] - c['start']
        self.lost = 0
        self.w = defaultdict(int)
        self.pile_l = 0        # staande sporen
        self.marks = set()
        self.pile_n = 0        # opgehouden (aantal tegels)
        self.turn = 0; self.done = None
        self.hist = []

    def gain(self, n):
        n = min(n, self.box); self.box -= n; self.stock += n

    def conn(self):
        seen, stk = set(), [self.seat]
        while stk:
            c = stk.pop()
            if c in seen or c not in self.alive: continue
            seen.add(c)
            for x in nb(c):
                if (self.w[x] > 0 or x in self.marks) and x not in seen \
                   and x in self.alive:
                    stk.append(x)
        return seen

    def path(self, dst):
        self.cost = {self.seat: 0}
        prev, q = {self.seat: None}, deque([self.seat])
        while q:
            c = q.popleft()
            if c == dst:
                p = []
                while c is not None: p.append(c); c = prev[c]
                return list(reversed(p))
            for i, x in enumerate(nb(c)):
                if x in self.alive and x not in prev and x != self.npos:
                    prev[x] = c; self.cost[x] = 1; q.append(x)
                elif x not in self.alive:
                    d = DIRS[i]; y = x; gaps = 0
                    while y not in self.alive and gaps < 4:
                        y = (y[0]+d[0], y[1]+d[1]); gaps += 1
                        if abs(y[0]) > 4 or abs(y[1]) > 4: break
                    if y in self.alive and y not in prev and y != self.npos:
                        prev[y] = c; self.cost[y] = gaps + 2; q.append(y)
        return None

    # ---------- de Laatste ----------
    def harvest(self):
        if not self.cfg['harvest']: return
        got = 0
        for c in self.conn():
            if c == self.seat or self.w[c] < 2 or c in self.marks: continue
            got += YIELD.get(self.tile.get(c), 0)
        self.gain(got)

    def push(self, p):
        need = [0 if x in self.marks else 1 for x in p]
        need[-1] = 2; need[0] = 0
        for i in range(len(p)-1):
            if self.w[p[i+1]] >= need[i+1]: continue
            cost = getattr(self, 'cost', {}).get(p[i+1], 1)
            if self.stock < cost: return False
            self.stock -= cost
            if cost > 1: self.box += cost - 1   # sprongverlies keert ook terug
            self.w[p[i+1]] += 1; self.open.add(p[i+1])
            return True
        return False

    def claim(self, c):
        """tegel met vat doorgeven: van het bord, naar haar stapel"""
        # markeren: tegel blijft liggen, stenen keren terug, spoor erop
        self.pile_l += 1
        self.stock += self.w[c]
        self.w[c] = 0
        self.marks.add(c)

    def claimable(self):
        """alleen claims die de draad heel laten"""
        out = []
        stones = {x for x in self.alive if self.w[x] > 0}
        for c in self.conn():
            if c == self.seat or self.w[c] < 2 or c not in self.alive: continue
            if c in self.marks: continue
            if YIELD.get(self.tile.get(c), 0) <= 0: continue
            out.append((c, 0))
        return out

    def laatste_turn(self):
        self.harvest()
        for _ in range(self.cfg.get('acts', 2)):
            did = False
            # terugtrekken als we klem zitten: steen terug uit nutteloze tegel
            if self.stock <= 1:
                useless = [c for c in self.alive if self.w[c] >= 1
                           and c != self.seat
                           and (c in self.marks or
                                YIELD.get(self.tile.get(c), 0) == 0
                                and c in self.open)]
                if useless:
                    c = max(useless, key=lambda x: self.w[x])
                    self.w[c] -= 1; self.stock += 1
                    continue
            cl = self.claimable()
            if cl:
                K = self.cfg.get('engines', 2)
                endgame = self.pile_l >= self.cfg['need_l'] - 4
                # motoren: hoogste opbrengst NIET claimen (tenzij eindspel of bedreigd)
                keep = set()
                if not endgame:
                    for c, occ in cl:
                        if YIELD.get(self.tile.get(c), 0) >= 2 and len(keep) < K:
                            keep.add(c)
                bank = [(c, occ) for c, occ in cl if c not in keep]
                # claim eerst bladeren (occ<=1), dan de rest
                bank.sort(key=lambda t: (t[1] > 1,
                          -YIELD.get(self.tile.get(t[0]), 0)))
                if bank:
                    self.claim(bank[0][0])
                    if self.pile_l >= self.cfg['need_l']:
                        self.done = 'laatste'; return
                    did = True
            if did: continue
            # doelvastheid: houd één doel tot het vat heeft
            # zuinig: bij lage voorraad eerst bestaande ijle tegels afmaken
            if self.stock <= 3:
                half = [x for x in self.alive if self.w[x] == 1 and x != self.seat
                        and YIELD.get(self.tile.get(x), 0) > 0 and self.path(x)]
                if half:
                    self.goal = min(half, key=lambda x: len(self.path(x)))
            g = getattr(self, 'goal', None)
            if g is not None and g in self.open \
               and YIELD.get(self.tile.get(g), 0) <= 0:
                g = None; self.goal = None   # bleek stil veld: laat los
            if g is None or g not in self.alive or self.w[g] >= 2 \
               or g == self.npos or not self.path(g):
                best, bs = None, -99
                for x in self.alive:
                    if x == self.seat or self.w[x] >= 2 or x == self.npos: continue
                    p = self.path(x)
                    if not p: continue
                    cost = sum(getattr(self, 'cost', {}).get(y, 1)
                               for y in p[1:] if self.w[y] == 0) + (2 - self.w[x])
                    if cost > max(self.stock, 1): continue
                    v = YIELD.get(self.tile.get(x), 0) if x in self.open else 1.1
                    s2 = v * 2.2 - cost * 1.4 + self.rng.random() * .3
                    if s2 > bs: bs, best = s2, x
                self.goal = best
            if self.goal is not None:
                p = self.path(self.goal)
                if p and self.push(p): continue
            break

    # ---------- de Nexus ----------
    def nexus_turn(self):
        moved = 0
        for _ in range(self.cfg['nexus_moves']):
            opts = [x for x in nb(self.npos)
                    if x in self.alive and self.w[x] < 2]
            if not opts: break
            def sc(x):
                s = 0
                s += sum(1 for y in nb(x) if self.w[y] > 0) * 1.2
                if self.w[x] == 1: s += 2
                if x in self.marks: s += 3.5   # haar spoor wegvreten
                v = YIELD.get(self.tile.get(x), 0)
                s += v * 0.6
                return s + self.rng.random()
            t = max(opts, key=sc)
            old = self.npos; self.npos = t; self.consume(old); moved += 1
            if self.pile_n >= self.cfg['need_n']:
                self.done = 'nexus'; return
        if moved == 0:
            cand = [x for x in self.alive
                    if x not in (self.seat, self.npos) and self.w[x] < 2]
            if cand:
                self.consume(min(cand, key=lambda x: dd(x, self.npos)))
                if self.pile_n >= self.cfg['need_n']:
                    self.done = 'nexus'

    def consume(self, c):
        if c not in self.alive or c == self.seat: return
        self.alive.discard(c); self.pile_n += 1
        if c in self.marks:
            self.marks.discard(c); self.pile_l -= 1   # hij vreet haar spoor weg
        self.box += self.w[c]; self.w[c] = 0
        if self.cfg['feed']: self.gain(1)

    def play(self, maxturns=80):
        while self.turn < maxturns and not self.done:
            self.turn += 1
            self.laatste_turn()
            if self.done: break
            self.nexus_turn()
            if self.done: break
            self.hist.append((self.pile_l, self.pile_n))
            if len(self.alive) <= 1:
                self.done = 'niets'   # bord op, niemand haalde het
        return self.done or 'timeout'


def run(n=400, **cfg):
    C = Counter(); T = []; L = []; N = []; flips = []
    for s in range(n):
        g = Game(s, cfg); r = g.play()
        C[r] += 1; T.append(g.turn); L.append(g.pile_l); N.append(g.pile_n)
        # leiderswissels
        f = 0; lead = None
        for pl, pn in g.hist:
            cur = 'L' if pl/g.cfg['need_l'] > pn/g.cfg['need_n'] else 'N'
            if lead and cur != lead: f += 1
            lead = cur
        flips.append(f)
    return C, T, L, N, flips


if __name__ == '__main__':
    print("LAAG 1+2 — gedeelde voorraad, web tegen punt\n")
    for lbl, cfg in [
        ('basis 12/28', {}),
        ('10/26', dict(need_l=10, need_n=26)),
        ('14/30', dict(need_l=14, need_n=30)),
        ('claim geeft 1 terug', dict(claim_back=1)),
    ]:
        C, T, L, N, F = run(400, **cfg)
        tot = sum(C.values())
        d = {k: round(100*v/tot) for k, v in C.items()}
        print(f"{lbl:20s} mediaan {st.median(T):3.0f}b ({min(T)}-{max(T)}) | "
              f"<6b: {sum(1 for t in T if t<6):3d} | {d} | "
              f"wissels {st.mean(F):.1f}")
