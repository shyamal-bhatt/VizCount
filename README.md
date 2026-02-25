# VizCount 🥩

**VizCount** is a full-stack inventory intelligence system for meat department operations. Staff scan cooler stock with a mobile app, data is synced to Snowflake via a cloud function, and managers review live KPIs on a web dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | Expo / React Native, Vision Camera v4, WatermelonDB |
| OCR + CV | `react-native-vision-camera-ocr-plus`, `react-native-fast-opencv` |
| Backend Sync | GCP Cloud Functions (Python), Firebase App Check |
| Data Warehouse | Snowflake (`VIZCOUNT_DB`) |
| Dashboard | Streamlit (Python), Snowflake connector |

---

## Project Structure

```
VizCount/
├── vizcount-app/          # Expo React Native mobile app
│   ├── app/(tabs)/        # Screens: Scanner, Manual, Compare, Expiry
│   ├── components/        # Shared UI components
│   ├── db/                # WatermelonDB schema, models, seed
│   └── services/          # API / sync service
├── vizcount-dashboard/    # Streamlit analytics dashboard
│   ├── components/        # Metrics, charts, alerts, sidebar, table
│   ├── data/              # Snowflake data loader
│   └── config/            # Page settings
└── backend/
    └── sync-stream/       # GCP Cloud Function: WatermelonDB → Snowflake
```

---

## Diagram 1 — System Architecture

> End-to-end data flow from the device camera through to the management dashboard.

```mermaid
graph TD
    classDef jsThread  fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef uiThread  fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef store     fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,rx:5,ry:5
    classDef db        fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,rx:5,ry:5
    classDef backend   fill:#e0f7fa,stroke:#006064,stroke-width:2px,rx:5,ry:5
    classDef worklet   fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,stroke-dasharray:5 5
    classDef startPoint fill:#00c853,stroke:#000,stroke-width:3px,color:#fff
    classDef checkpoint fill:#ffd600,stroke:#000,stroke-width:2px

    subgraph Legend
        L1["  JS Thread  "]:::jsThread
        L2["  UI Thread  "]:::uiThread
        L3["  Worklet  "]:::worklet
        L4["  Database  "]:::db
        L5["  Backend  "]:::backend
    end

    subgraph Mobile ["📱 vizcount-app  (Expo / React Native)"]
        START(["▶ App Launch"]):::startPoint
        AppCheck["<b>Firebase App Check</b><hr/>func: initializeAppCheck()<br/>func: newReactNativeFirebaseAppCheckProvider()"]:::jsThread
        Seed["<b>DB Seed</b><hr/>func: seedDefinedProducts()"]:::jsThread
        WDB[("WatermelonDB<hr/>scanned_items<br/>sales_floor<br/>defined_products")]:::db

        subgraph Scanner ["📷 Scanner Tab"]
            Cam["<b>VisionCamera</b><hr/>State: device<br/>func: useFrameProcessor()"]:::uiThread
            OCR["<b>OCR Worklet</b><hr/>func: scanOCR()<br/>func: filterByROI()<br/>func: validateFrames()"]:::worklet
            OpenCV["<b>OpenCV CV</b><hr/>func: Laplacian()<br/>func: meanStdDev()"]:::worklet
        end

        ScannerScreen["<b>ScannerScreen</b><hr/>State: scannedData<br/>func: handleSave()<br/>func: triggerHaptic()"]:::jsThread
        ManualScreen["<b>ManualScreen</b><hr/>State: formData<br/>func: handleSubmit()"]:::jsThread
        CompareScreen["<b>CompareScreen</b><hr/>State: selectedProduct<br/>func: loadDiff()"]:::jsThread
        SyncService["<b>SyncService</b><hr/>func: syncToCloud()<br/>func: buildPayload()"]:::jsThread
    end

    subgraph Backend ["☁️ GCP Cloud Function  (sync-stream)"]
        CF["<b>stream_to_snowflake()</b><hr/>func: verify App Check token<br/>func: parse JSON payload<br/>func: ms_to_timestamp()"]:::backend
    end

    subgraph DW ["❄️ Snowflake  (VIZCOUNT_DB)"]
        SF_SI[("SCANNED_ITEMS<hr/>PID · SN · NAME<br/>BEST_BEFORE_DATE<br/>PACKED_ON_DATE · NET_KG<br/>ITEM_COUNT")]:::db
        SF_SF[("SALES_FLOOR<hr/>PID · NAME<br/>CURRENT_COUNT<br/>TOTAL_WEIGHT · LATEST_EXPIRY")]:::db
    end

    subgraph Dashboard ["📊 vizcount-dashboard  (Streamlit)"]
        Loader["<b>load_category_data()</b><hr/>Snowflake connector<br/>Query SCANNED_ITEMS<br/>Query SALES_FLOOR"]:::backend
        UI_Dash["<b>Dashboard UI</b><hr/>render_kpi_row()<br/>render_alerts()<br/>render_charts_row()<br/>render_inventory_table()"]:::uiThread
    end

    START --> AppCheck
    AppCheck --> Seed
    Seed --> WDB
    Cam --> OCR
    OCR --> OpenCV
    OpenCV --> OCR
    OCR -- "validated PID+SN+Weight" --> ScannerScreen
    ScannerScreen -- "INSERT" --> WDB
    ManualScreen -- "INSERT" --> WDB
    WDB --> CompareScreen
    WDB --> SyncService
    SyncService -- "HTTP POST + AppCheck token" --> CF
    CF -- "INSERT" --> SF_SI
    CF -- "MERGE" --> SF_SF
    SF_SI --> Loader
    SF_SF --> Loader
    Loader --> UI_Dash
```

---

## Diagram 2 — App Working Flow

> Runtime execution flow through threads — from launch to scan-save and cloud sync.

```mermaid
graph TD
    classDef jsThread  fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef uiThread  fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef store     fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,rx:5,ry:5
    classDef db        fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,rx:5,ry:5
    classDef backend   fill:#e0f7fa,stroke:#006064,stroke-width:2px,rx:5,ry:5
    classDef worklet   fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,stroke-dasharray:5 5
    classDef startPoint fill:#00c853,stroke:#000,stroke-width:3px,color:#fff
    classDef checkpoint fill:#ffd600,stroke:#000,stroke-width:2px

    subgraph Legend
        L1["  JS Thread  "]:::jsThread
        L2["  UI Thread  "]:::uiThread
        L3["  Worklet  "]:::worklet
        L4["  Database  "]:::db
        L5["  Cloud  "]:::backend
    end

    A(["▶ App Launched"]):::startPoint
    B["<b>RootLayout</b><hr/>func: initializeAppCheck()<br/>func: useFonts()"]:::jsThread
    C{"Fonts Loaded?"}:::checkpoint
    D["<b>SeedDB</b><hr/>func: seedDefinedProducts()<br/>Insert defined_products if empty"]:::jsThread
    E["<b>DatabaseProvider</b><hr/>WatermelonDB injected<br/>into React tree"]:::jsThread
    F["<b>Tab Navigator</b><hr/>Scanner | Manual | Compare | Expiry"]:::uiThread

    subgraph ScanFlow ["📷 Scan Path (Camera Tab)"]
        G["User opens Scanner Tab"]:::uiThread
        H["<b>VisionCamera</b><hr/>State: isActive=true<br/>useFrameProcessor() registered"]:::uiThread
        I["<b>Frame arrives — Worklet Thread</b><hr/>func: runOpenCV() - blur/reflection check<br/>func: scanOCR() - text extraction<br/>func: filterByROI() - crop to scan zone<br/>func: validateFrames() - 3-frame consensus"]:::worklet
        J{"PID + Weight valid<br/>≥ 3 frames?"}:::checkpoint
        K["<b>JS Thread auto-save</b><hr/>func: handleSave()<br/>INSERT into scanned_items<br/>expo-haptics feedback"]:::jsThread
    end

    subgraph ManualFlow ["✏️ Manual Path"]
        M["User opens Manual Tab"]:::uiThread
        N["<b>ManualScreen</b><hr/>State: pid, sn, name, netKg<br/>ProductPickerModal<br/>DatePickerModal"]:::uiThread
        O["<b>handleSubmit()</b><hr/>Validate form fields<br/>INSERT into sales_floor"]:::jsThread
    end

    subgraph CompareFlow ["📊 Compare Path"]
        P["User opens Compare Tab"]:::uiThread
        Q["<b>CompareScreen</b><hr/>Product dropdown → defined_products<br/>Cooler card ← scanned_items<br/>Floor card ← sales_floor<br/>Diff = Cooler count − Floor count"]:::jsThread
    end

    subgraph SyncFlow ["☁️ Sync to Cloud"]
        R["<b>SyncService</b><hr/>func: syncToCloud()<br/>Collect all local rows<br/>Build JSON payload"]:::jsThread
        S{"App Check<br/>Token valid?"}:::checkpoint
        T["HTTP POST → GCP Cloud Function"]:::backend
        U["<b>stream_to_snowflake()</b><hr/>INSERT scanned_items → Snowflake<br/>MERGE sales_floor → Snowflake"]:::backend
    end

    A --> B --> C
    C -- "No" --> C
    C -- "Yes" --> D --> E --> F
    F --> G --> H --> I --> J
    J -- "No" --> I
    J -- "Yes" --> K
    K --> R
    F --> M --> N --> O --> R
    F --> P --> Q
    R --> S
    S -- "Fail" --> R
    S -- "Pass" --> T --> U
```

---

## Diagram 3 — Database Model

> WatermelonDB (on-device SQLite) schema and its mirror in Snowflake.

```mermaid
graph TD
    classDef jsThread  fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef uiThread  fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef db        fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,rx:5,ry:5
    classDef backend   fill:#e0f7fa,stroke:#006064,stroke-width:2px,rx:5,ry:5
    classDef startPoint fill:#00c853,stroke:#000,stroke-width:3px,color:#fff
    classDef checkpoint fill:#ffd600,stroke:#000,stroke-width:2px

    subgraph Local ["📱 WatermelonDB  (on-device SQLite)"]
        DP["<b>defined_products</b><hr/>id: string PK<br/>pid: number [indexed]<br/>name: string<br/>pack: number<br/>type: string<br/>created_at: number (ms)<br/>updated_at: number (ms)"]:::db

        SI["<b>scanned_items</b><hr/>id: string PK<br/>pid: number [indexed]<br/>sn: number [indexed]<br/>name: string<br/>best_before_date: number? (ms)<br/>packed_on_date: number? (ms)<br/>net_kg: number?<br/>count: number?<br/>created_at: number (ms)<br/>updated_at: number (ms)"]:::db

        SF["<b>sales_floor</b><hr/>id: string PK<br/>pid: number [indexed]<br/>name: string<br/>count: number?<br/>weight: number?<br/>expiry_date: number? (ms)<br/>created_at: number (ms)<br/>updated_at: number (ms)"]:::db
    end

    subgraph Cloud ["❄️ Snowflake  (VIZCOUNT_DB.PUBLIC)"]
        SN_SI["<b>SCANNED_ITEMS</b><hr/>PID: NUMBER<br/>SN: NUMBER<br/>NAME: VARCHAR<br/>BEST_BEFORE_DATE: TIMESTAMP_NTZ<br/>PACKED_ON_DATE: TIMESTAMP_NTZ<br/>NET_KG: FLOAT<br/>ITEM_COUNT: NUMBER"]:::backend

        SN_SF["<b>SALES_FLOOR</b><hr/>PID: NUMBER  (merge key)<br/>NAME: VARCHAR<br/>CURRENT_COUNT: NUMBER<br/>TOTAL_WEIGHT: FLOAT<br/>LATEST_EXPIRY: TIMESTAMP_NTZ<br/>UPDATED_AT: TIMESTAMP_NTZ"]:::backend
    end

    subgraph Seed ["🌱 Seed Data"]
        SEED["<b>seedDefinedProducts()</b><hr/>Runs at app launch<br/>Populates defined_products<br/>if table is empty"]:::jsThread
    end

    SEED -- "INSERT on empty" --> DP
    DP -- "pid filter" --> SI
    DP -- "pid filter" --> SF
    SI -- "INSERT (append)" --> SN_SI
    SF -- "MERGE on PID" --> SN_SF
```

---

## Getting Started

### Mobile App

```bash
cd vizcount-app
npm install
npx expo run:android --device   # or run:ios
```

### Dashboard

```bash
cd vizcount-dashboard
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# copy .streamlit/secrets.toml.example → .streamlit/secrets.toml and fill in credentials
streamlit run app.py
```

### Backend (GCP Cloud Function)

```bash
cd backend/sync-stream
pip install -r requirements.txt
# Deploy with gcloud or Cloud Console
# Set env vars: SNOWFLAKE_USER, SNOWFLAKE_ACCOUNT, SNOWFLAKE_PASS_SECRET
```

---

## Environment Variables

| Var | Used In | Description |
|---|---|---|
| `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN` | vizcount-app | Firebase App Check debug token |
| `SNOWFLAKE_USER` | sync-stream (GCP) | Snowflake service account username |
| `SNOWFLAKE_ACCOUNT` | sync-stream (GCP) | Snowflake account identifier |
| `SNOWFLAKE_PASS_SECRET` | sync-stream (GCP) | Snowflake password (injected as env var) |
| Streamlit `secrets.toml` | vizcount-dashboard | Snowflake connection credentials |

---

## License

MIT
