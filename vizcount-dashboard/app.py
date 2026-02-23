import streamlit as st

st.set_page_config(
    page_title="VizCount Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("VizCount Dashboard")
st.markdown("Welcome to the VizCount Analytics Dashboard!")

# A simple beautiful layout
st.markdown("### Key Metrics")
col1, col2, col3 = st.columns(3)

with col1:
    st.metric(label="Total Scans", value="1,204", delta="12%")

with col2:
    st.metric(label="Active Users", value="89", delta="5%")

with col3:
    st.metric(label="System Health", value="99.9%", delta="0.1%")

st.divider()

st.subheader("Recent Activity")
st.info("System initialized successfully. Awaiting data connection...")
