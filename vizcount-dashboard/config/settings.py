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
PRODUCTS: dict[str, list[str]] = {
    "Beef": [
        "Ribeye Steak", "Ground Beef 80/20", "Chuck Roast",
        "Sirloin Tip", "Beef Tenderloin", "Short Rib",
        "T-Bone Steak", "Beef Brisket",
    ],
    "Pork": [
        "Pork Shoulder", "Pork Belly", "Baby Back Ribs",
        "Pork Tenderloin", "Ham Hock", "Pork Chops",
    ],
    "Chicken": [
        "Whole Chicken", "Chicken Breast", "Chicken Thighs",
        "Chicken Wings", "Chicken Drumsticks", "Ground Chicken",
    ],
    "Seafood": [
        "Atlantic Salmon", "Shrimp (16/20)", "Tilapia Fillet",
        "Cod Fillet", "Sea Bass", "Scallops",
    ],
    "Halal": [
        "MINA Halal Chicken Leg", "MINA Halal Whole Chicken", "MINA Halal Drumstick",
        "MINA Halal Ground Chicken", "MINA Halal Breast (Bone-in)", "MINA Halal BSB VP",
        "MINA Halal Chicken Breast", "MINA Halal Thigh",
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
