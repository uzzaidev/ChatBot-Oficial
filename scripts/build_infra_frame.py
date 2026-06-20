import json, random, copy, string, os

MAIN = os.path.join(os.path.dirname(__file__), "..", "UzzApp-Arquitetura.excalidraw")
MAIN = os.path.abspath(MAIN)
LIBDIR = os.path.expanduser("~/Downloads/")


def load_lib(name):
    return json.load(open(os.path.join(LIBDIR, name + ".excalidrawlib"), encoding="utf-8"))


sd = load_lib("system-design")["library"]
cl = load_lib("cloud")["library"]
arch = load_lib("architecture-diagram-components")["libraryItems"]


def arch_item(n):
    return next(it["elements"] for it in arch if it["name"] == n)


main = json.load(open(MAIN, encoding="utf-8"))
elements = main["elements"]


def rid(n=20):
    return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(n))


def bbox(grp):
    xs = [e.get("x", 0) for e in grp]
    ys = [e.get("y", 0) for e in grp]
    x2 = [e.get("x", 0) + e.get("width", 0) for e in grp]
    y2 = [e.get("y", 0) + e.get("height", 0) for e in grp]
    return min(xs), min(ys), max(x2), max(y2)


FRAME_ID = "INFRA-" + rid(12)
new_elements = []


def place_icon(grp, cx, cy, target=80):
    minx, miny, maxx, maxy = bbox(grp)
    w = maxx - minx
    h = maxy - miny
    scale = target / max(w, h)
    idmap = {e["id"]: rid() for e in grp}
    gid = rid()
    sw, sh = w * scale, h * scale
    offx, offy = cx - sw / 2, cy - sh / 2
    anchor, anchor_area = None, -1
    placed = []
    for e in grp:
        ne = copy.deepcopy(e)
        ne["id"] = idmap[e["id"]]
        ne["x"] = (e.get("x", 0) - minx) * scale + offx
        ne["y"] = (e.get("y", 0) - miny) * scale + offy
        if "width" in ne:
            ne["width"] = e["width"] * scale
        if "height" in ne:
            ne["height"] = e["height"] * scale
        if ne.get("fontSize"):
            ne["fontSize"] = e["fontSize"] * scale
        if ne.get("points"):
            ne["points"] = [[p[0] * scale, p[1] * scale] for p in e["points"]]
        if ne.get("containerId"):
            ne["containerId"] = idmap.get(e["containerId"])
        if ne.get("boundElements"):
            nb = []
            for b in e["boundElements"]:
                if b.get("id") in idmap:
                    b = dict(b)
                    b["id"] = idmap[b["id"]]
                    nb.append(b)
            ne["boundElements"] = nb
        for bk in ("startBinding", "endBinding"):
            if ne.get(bk) and ne[bk].get("elementId") in idmap:
                ne[bk] = dict(ne[bk])
                ne[bk]["elementId"] = idmap[e[bk]["elementId"]]
            elif ne.get(bk):
                ne[bk] = None
        ne["groupIds"] = [gid]
        ne["frameId"] = FRAME_ID
        ne["seed"] = random.randint(1, 2 ** 31)
        ne["versionNonce"] = random.randint(1, 2 ** 31)
        ne["version"] = 1
        ne["updated"] = 1781948084484
        ne.setdefault("roundness", None)
        ne.setdefault("link", None)
        ne.setdefault("locked", False)
        ne.setdefault("angle", 0)
        ne.setdefault("isDeleted", False)
        new_elements.append(ne)
        placed.append(ne)
        if ne.get("type") in ("rectangle", "ellipse", "diamond"):
            a = ne.get("width", 0) * ne.get("height", 0)
            if a > anchor_area:
                anchor_area, anchor = a, ne["id"]
    if anchor is None:
        anchor = placed[0]["id"]
    return anchor


def add_text(x, y, text, size=15, w=240, color="#1e1e1e", align="center"):
    e = {"id": rid(), "type": "text", "x": x, "y": y, "width": w,
         "height": size * 1.25 * (text.count("\n") + 1), "angle": 0, "strokeColor": color,
         "backgroundColor": "transparent", "fillStyle": "solid", "strokeWidth": 2,
         "strokeStyle": "solid", "roughness": 1, "opacity": 100, "groupIds": [],
         "frameId": FRAME_ID, "roundness": None, "seed": random.randint(1, 2 ** 31),
         "version": 1, "versionNonce": random.randint(1, 2 ** 31), "isDeleted": False,
         "boundElements": [], "updated": 1781948084484, "link": None, "locked": False,
         "fontSize": size, "fontFamily": 2, "text": text, "textAlign": align,
         "verticalAlign": "top", "containerId": None, "originalText": text,
         "lineHeight": 1.25, "baseline": int(size * 0.8), "autoResize": False}
    new_elements.append(e)
    return e["id"]


def add_label(cx, top_y, text, size=14, color="#1e1e1e"):
    add_text(cx - 130, top_y, text, size=size, w=260, color=color)


def add_zone(x, y, w, h, label, color, bg):
    e = {"id": rid(), "type": "rectangle", "x": x, "y": y, "width": w, "height": h,
         "angle": 0, "strokeColor": color, "backgroundColor": bg, "fillStyle": "solid",
         "strokeWidth": 2, "strokeStyle": "dashed", "roughness": 0, "opacity": 100,
         "groupIds": [], "frameId": FRAME_ID, "roundness": {"type": 3},
         "seed": random.randint(1, 2 ** 31), "version": 1,
         "versionNonce": random.randint(1, 2 ** 31), "isDeleted": False,
         "boundElements": [], "updated": 1781948084484, "link": None, "locked": False}
    new_elements.append(e)
    add_text(x + 12, y + 8, label, size=15, w=w - 24, color=color, align="left")
    return e["id"]


def add_arrow(a, b, color="#495057", dashed=False):
    e = {"id": rid(), "type": "arrow", "x": 0, "y": 0, "width": 10, "height": 10,
         "angle": 0, "strokeColor": color, "backgroundColor": "transparent",
         "fillStyle": "solid", "strokeWidth": 2,
         "strokeStyle": "dashed" if dashed else "solid", "roughness": 1, "opacity": 100,
         "groupIds": [], "frameId": FRAME_ID, "roundness": {"type": 2},
         "seed": random.randint(1, 2 ** 31), "version": 1,
         "versionNonce": random.randint(1, 2 ** 31), "isDeleted": False,
         "boundElements": [], "updated": 1781948084484, "link": None, "locked": False,
         "points": [[0, 0], [10, 10]], "lastCommittedPoint": None,
         "startBinding": {"elementId": a, "focus": 0, "gap": 6},
         "endBinding": {"elementId": b, "focus": 0, "gap": 6},
         "startArrowhead": None, "endArrowhead": "arrow"}
    new_elements.append(e)
    return e["id"]


# ---------------- LAYOUT ----------------
FX, FY = 2180, -220
C1, C2, C3, C4 = 2380, 2700, 3020, 3320

add_text(FX + 40, FY + 25, "Arquitetura de Infraestrutura & Deploy", size=28, w=900, align="left")
add_text(FX + 40, FY + 65,
         "Front-end · Back-end serverless · Banco de dados · Nuvem · Serviços externos",
         size=15, w=900, align="left", color="#868e96")

# Row 1: clients
r1 = FY + 150
dev_a = place_icon(arch_item("Device"), C1, r1, 70)
add_label(C1, r1 + 55, "Cliente (WhatsApp)")
usr_a = place_icon(arch_item("Users"), C2, r1, 70)
add_label(C2, r1 + 55, "Leads (Meta Ads)")

# Row 2: Meta API
r2 = FY + 320
api_a = place_icon(cl[17], C1, r2, 78)
add_label(C1, r2 + 55, "Meta WhatsApp\nCloud API v18")

# Vercel zone
vz_y, vz_h = FY + 440, 210
add_zone(FX + 40, vz_y, 980, vz_h, "▲  Vercel — Hosting Serverless (Next.js 14)", "#1e1e1e", "#f1f3f5")
vr = vz_y + 95
edge_a = place_icon(sd[19], C1, vr, 78)
add_label(C1, vr + 50, "Edge Network / CDN")
srv_a = place_icon(arch_item("Server"), C2, vr, 78)
add_label(C2, vr + 50, "Serverless /api\n(back-end · webhook)")
app_a = place_icon(sd[1], C3, vr, 78)
add_label(C3, vr + 50, "Front-end\n(Dashboard React)")

# Supabase zone
sb_y, sb_h = FY + 730, 210
add_zone(FX + 40, sb_y, 660, sb_h, "\U0001f5c4  Supabase (Postgres + Vault + pgvector)", "#2f9e44", "#ebfbee")
sr = sb_y + 95
db_a = place_icon(sd[6], C1, sr, 84)
add_label(C1, sr + 52, "Postgres\nmulti-tenant + RLS")
st_a = place_icon(sd[7], C2, sr, 84)
add_label(C2, sr + 52, "Storage (mídia)\n+ pgvector (RAG)")

# Redis zone
add_zone(FX + 740, sb_y, 280, sb_h, "⚡ Cache", "#e8590c", "#fff4e6")
rc_a = place_icon(sd[13], C3 + 40, sr, 84)
add_label(C3 + 40, sr + 52, "Redis (Upstash)\nbatch · dedup")

# External services
ex_y, ex_h = FY + 1010, 210
add_zone(FX + 40, ex_y, 1280, ex_h, "Serviços externos & IA", "#6741d9", "#f3f0ff")
er = ex_y + 95
oai_a = place_icon(sd[19], C1, er, 74)
add_label(C1, er + 48, "OpenAI\nWhisper·Vision·Embed")
grq_a = place_icon(sd[19], C2, er, 74)
add_label(C2, er + 48, "Groq\n(LLM principal)")
gm_a = place_icon(arch_item("Email"), C3, er, 70)
add_label(C3, er + 48, "Gmail (handoff)")
gh_a = place_icon(arch_item("GitHub"), C4, er, 74)
add_label(C4, er + 48, "GitHub → CI/CD")

# arrows
add_arrow(dev_a, api_a)
add_arrow(usr_a, api_a)
add_arrow(api_a, srv_a)
add_arrow(edge_a, srv_a)
add_arrow(srv_a, app_a)
add_arrow(srv_a, db_a, color="#2f9e44", dashed=True)
add_arrow(srv_a, st_a, color="#2f9e44", dashed=True)
add_arrow(srv_a, rc_a, color="#e8590c", dashed=True)
add_arrow(srv_a, oai_a, color="#6741d9", dashed=True)
add_arrow(srv_a, grq_a, color="#6741d9", dashed=True)
add_arrow(srv_a, gm_a, color="#6741d9", dashed=True)
add_arrow(gh_a, app_a, color="#868e96", dashed=True)
add_arrow(app_a, db_a, color="#2f9e44", dashed=True)

frame = {"id": FRAME_ID, "type": "frame", "x": FX, "y": FY, "width": 1380, "height": 1480,
         "angle": 0, "strokeColor": "#bbb", "backgroundColor": "transparent",
         "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid", "roughness": 0,
         "opacity": 100, "groupIds": [], "frameId": None, "roundness": None,
         "seed": random.randint(1, 2 ** 31), "version": 1,
         "versionNonce": random.randint(1, 2 ** 31), "isDeleted": False,
         "boundElements": None, "updated": 1781948096806, "link": None, "locked": False,
         "name": "Infraestrutura & Deploy"}

n = 0
for e in [frame] + new_elements:
    e["index"] = "c%04d" % n
    n += 1

elements.append(frame)
elements.extend(new_elements)
json.dump(main, open(MAIN, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("Added frame", FRAME_ID, "with", len(new_elements), "elements")
