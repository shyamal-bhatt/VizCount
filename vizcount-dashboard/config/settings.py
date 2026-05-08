"""
config/settings.py
──────────────────
Central configuration: page setup, product catalogue, chart theme.
"""

PAGE_CONFIG = dict(
    page_title="VizCount · Meat Department",
    page_icon="🗃️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Product catalogue ─────────────────────────────────────────────────────────
# Keys must exactly match the `type` column in Snowflake's defined_products table.
PRODUCTS: dict[str, list[str]] = {
    "Beef": [
        "AA STRIPLOIN STEAK", "AA TRI TIP", "AA BLADE STEAK",
        "BF TRI TIP SIRLOIN", "BFSTK SRLN TIP C11YF", "BFSTK INSD RND C05YF",
        "BFRST INSD BLD C09YF", "BFSTK INS ROUND HL", "BFRST SRLN TIP C10YF",
        "BFGRD XLEAN C14YF", "BFGRD MEDIUM C14YF", "BFGRD MEDIUM 454YF",
        "BFGRD LEAN 454YF", "BFGRD LEAN C14YF", "BF MEATBALL",
        "BFGRD XLEAN 454YF", "BFGRD REGULAR TB1YF", "BFGRD LEAN TB1YF",
    ],
    "Pork": [
        "PKSSG BR MAPLE 900ML", "PKSSG BR MAPLE 375JV", "PKSSG BR ORIG 375JV",
        "PKSSG BR RND 250JV", "PKSSG BR ORIG 900ML", "PKSSG BR ORIG 375ML",
        "PKSSG BR MAPLE 375ML", "JVL BWN SUG HON", "PKSSG DN MLDIT 500JV",
        "PKSSG DN HOTIT 500JV", "PKSSG DN BRAT 500JV", "PKSSG GR MLDIT 454JV",
        "PKRIB BACK C10ML", "PKRIB SIDE C18ML", "PKRIB SWEETNSR C18ML",
        "PORK SIDE RIBS", "PKGRD LEAN 454ML", "PKGRD LEAN 454MR",
        "PKGRD LEAN 1.36ML", "PK MEATBALL 375YF", "PK BELLY BL C09MR",
        "PKRIB SWEETNSR C18MR", "PKCHP FST FRY COBMR", "PKCHP CTR RIB C14ML",
        "PKCHP BL CC RB C08ML", "PKCHP COMBO C15ML", "PKCHP BL CC RB C08MR",
        "PKCHP CTRB BI C08ML", "PKCHP CTRB BI C08MR", "PK HALF LOIN",
        "PK TNDRLN C12FL", "PKRST BLD BL C13ML",
    ],
    "Organic Chicken": [
        "PRIME ORG WB", "PRIME ORG SPLT WNG", "PRIME RWA THIN SLICD",
        "PRIME RWA BSB", "PRIME RWA BSB VP", "PRIME ORG BSB",
        "PR RWA DICED CHK", "PRIME RWA BST",
    ],
    "Maple Leaf Chicken": [
        "ML WHOLE WING", "ML CKN BSB VP", "ML CKN BRST BNLSKNLS",
        "ML CHKN DRUMS VP", "ML CHKN THIGHS VP",
    ],
    "Halal": [
        "MINA HALAL CHN LG QT", "MINA HALAL CHN WHOLE", "MINA HALAL CHKN DRUM",
        "MINA HALAL CHN GRNDS", "MINA HALAL CHN BSB", "MINA HALAL BSB VP",
        "MINA HALAL CHN BST", "MINA HALAL CHN THIGH", "GOAT CUBES BONE IN",
    ],
    "Seafood": [
        "COHO 2PC PORTIONS", "YFM BASA FILLET", "AQMR SURIMI FLAKE1KG",
        "AQMR SURIMI FLAKE340", "AQMR SURIMI STICK340", "YFM SLMN ATL PTN 2PC",
        "YFM SWT SMKY COHO", "YFM ATL SLMN W/BUTR", "YFM LMN HRB COHO",
        "YFM SLMN COHO FILLET", "YFM RAINBW TROUT FLT", "YFM TILAPIA FILLET",
        "YFM SLMN ATLANTIC PTN",
    ],
}

# ── Expiry buckets ────────────────────────────────────────────────────────────
EXPIRY_OFFSETS = [-2, -1, 0, 1, 1, 2, 2, 3, 5, 5, 7]

BUCKET_ORDER = ["Expired", "Today", "1 Day", "2 Days", "5+ Days"]

BUCKET_COLORS: dict[str, str] = {
    "Expired": "#ef4444",
    "Today":   "#f59e0b",
    "1 Day":   "#f59e0b",
    "2 Days":  "#3b82f6",
    "5+ Days": "#22c55e",
}

# ── Shared Plotly layout ──────────────────────────────────────────────────────
CHART_LAYOUT = dict(
    paper_bgcolor="white",
    plot_bgcolor="#f8f9fb",
    font=dict(family="Inter, sans-serif", color="#0f172a"),
    margin=dict(l=10, r=10, t=40, b=70),
    height=320,
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    xaxis=dict(showgrid=False, linecolor="#e2e8f0", tickfont=dict(size=11)),
    yaxis=dict(showgrid=True, gridcolor="#e8ecf1", zeroline=False, tickfont=dict(size=11)),
    hoverlabel=dict(bgcolor="white", font_size=12),
)
