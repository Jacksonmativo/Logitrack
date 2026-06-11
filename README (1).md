# LogiTrack — Fleet Management System

> A purpose-built, web-based logistics truck management platform providing real-time GPS tracking, fuel monitoring, driver accountability, and full trip lifecycle management.

**Developed by:** Jackson Mativo (Backend) · Sharon Kosgei (Frontend)  
**Client:** Logistics Operations Division  
**Version:** 1.0 · Delivery Plan Date: 28 May 2026  
**Timeline:** 16 Weeks · 4 Phases

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [File Structure](#4-file-structure)
5. [Getting Started](#5-getting-started)
6. [Environment Variables](#6-environment-variables)
7. [Mock Data & Test Scripts](#7-mock-data--test-scripts)
8. [API Reference](#8-api-reference)
9. [GPS Tracker Integration](#9-gps-tracker-integration)
10. [Alert Engine](#10-alert-engine)
11. [Database Schema Overview](#11-database-schema-overview)
12. [Development Phases](#12-development-phases)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment](#14-deployment)
15. [Contributing & Git Workflow](#15-contributing--git-workflow)

---

## 1. Project Overview

LogiTrack solves the core operational failures that plague undigitised logistics fleets:

| Problem | LogiTrack Solution |
|---|---|
| No real-time visibility | Live GPS map updated every 10–30 seconds during trips |
| Fuel theft & wastage | Continuous fuel sensor readings with anomaly alerts |
| No driver accountability | Mobile check-in/check-out cross-verified against engine ignition |
| Unauthorised truck use | Engine-on with no active check-in triggers instant SMS alert |
| Trip manipulation | All driver app actions validated against hardware-recorded GPS data |
| No route compliance | Route deviation detection with configurable tolerance distance |
| Manual/paper records | Fully digital trip records — exportable as PDF and Excel |

### Core Modules

- **GPS & GPRS Real-Time Tracking** — 3-mode intelligent ping (active trip, engine-on-idle, parked heartbeat)
- **Fuel Consumption Monitoring** — per-trip fuel reports, theft detection, excessive idle logging
- **Driver Check-In / Check-Out** — session-based driver assignment with 5-point cross-verification
- **Trip Management** — full lifecycle from departure to arrival including stops, deviations, and reroutes
- **Alerts & Notifications Engine** — SMS (Africa's Talking), push notifications, and in-dashboard flags

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT DEVICES                               │
│        Manager Browser (Dashboard)    Driver Smartphone (App)       │
└──────────────────────┬──────────────────────┬───────────────────────┘
                       │ HTTPS / WebSocket     │ HTTPS
                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLOUD BACKEND (AWS / DigitalOcean)              │
│                                                                     │
│  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  Node.js / Express│  │  Socket.io Server│   │  Alert Engine   │  │
│  │  REST API        │  │  (Real-time push) │   │  (Rule processor│  │
│  └────────┬────────┘   └──────────────────┘   └────────┬────────┘  │
│           │                                            │            │
│  ┌────────▼────────────────────────────────────────────▼────────┐  │
│  │                   PostgreSQL Database                         │  │
│  │  trips · gps_points · drivers · trucks · fuel_readings · ...  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│           ▲                                                         │
│  ┌────────┴────────┐                                               │
│  │   MQTT Broker   │  (Mosquitto / EMQX)                          │
│  └────────▲────────┘                                               │
└───────────┼─────────────────────────────────────────────────────── ┘
            │ MQTT over 4G/GPRS
┌───────────┴──────────────────────────────────────────────────────┐
│               FIELD HARDWARE (Per Truck)                         │
│   GPS/GPRS Tracker (4G LTE)  +  Fuel Level Sensor               │
│   Safaricom / Airtel M2M SIM                                     │
└──────────────────────────────────────────────────────────────────┘
```

### GPS Tracking Modes

| Mode | Trigger | Ping Frequency | Purpose |
|---|---|---|---|
| Active Trip | Driver taps "Start Trip" | Every 10–30 seconds | Full precision route recording |
| Engine On — No Trip | Engine starts with no check-in | Every 2–5 minutes | Detect unauthorised use |
| Parked Heartbeat | Engine off, truck stationary | Every 30–60 minutes | Theft detection, verify parking |
| Offline Buffer | No cellular signal | Stored locally | Uploads when signal returns |

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Manager Dashboard | React.js + Tailwind CSS | Live map, trips, reports, alert centre |
| Driver App | React (mobile-optimised) | Check-in/out, start/end trip |
| Backend API | Node.js + Express | Business logic, GPS processing, alerts |
| Database | PostgreSQL | Trips, GPS history, fuel logs, audit trail |
| Real-time | Socket.io (WebSockets) | Live truck positions pushed to dashboard |
| Map Engine | Leaflet.js + OpenStreetMap | Free mapping — no Google Maps API fees |
| MQTT Broker | Mosquitto / EMQX | Receives tracker data over GPRS/4G |
| SMS Gateway | Africa's Talking API | Kenyan SMS delivery for critical alerts |
| Cloud Hosting | AWS / DigitalOcean | Backend, database, and dashboard hosting |
| Tracker Protocol | MQTT over GPRS/4G | Lightweight data streaming from GPS units |
| Auth | JWT (JSON Web Tokens) | Secure API authentication |
| Process Manager | PM2 | Node.js production process management |
| Containerisation | Docker + Docker Compose | Local development and deployment |

---

## 4. File Structure

```
logitrack/
│
├── README.md                          # This file
├── .env.example                       # Environment variable template
├── .gitignore
├── docker-compose.yml                 # Full stack local development
├── docker-compose.test.yml            # Isolated test environment
│
├── /backend                           # Node.js + Express API
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js                      # Entry point — HTTP + MQTT + Socket.io
│   │
│   ├── /config
│   │   ├── database.js                # PostgreSQL connection pool (pg)
│   │   ├── mqtt.js                    # MQTT broker client configuration
│   │   ├── socket.js                  # Socket.io server setup
│   │   └── africastalking.js          # Africa's Talking SMS client setup
│   │
│   ├── /routes
│   │   ├── auth.routes.js             # POST /login, POST /logout, POST /refresh
│   │   ├── trucks.routes.js           # CRUD for truck management
│   │   ├── drivers.routes.js          # CRUD for driver management
│   │   ├── trips.routes.js            # Trip lifecycle endpoints
│   │   ├── checkin.routes.js          # Driver check-in / check-out
│   │   ├── fuel.routes.js             # Fuel readings and reports
│   │   ├── alerts.routes.js           # Alert history and acknowledgement
│   │   ├── gps.routes.js              # GPS history and live positions
│   │   └── reports.routes.js          # PDF / Excel export endpoints
│   │
│   ├── /controllers
│   │   ├── auth.controller.js
│   │   ├── trucks.controller.js
│   │   ├── drivers.controller.js
│   │   ├── trips.controller.js
│   │   ├── checkin.controller.js
│   │   ├── fuel.controller.js
│   │   ├── alerts.controller.js
│   │   ├── gps.controller.js
│   │   └── reports.controller.js
│   │
│   ├── /services
│   │   ├── mqtt.service.js            # Subscribes to tracker topics, parses payloads
│   │   ├── gps.service.js             # Processes raw GPS points, stores to DB
│   │   ├── fuel.service.js            # Fuel anomaly logic and persistence
│   │   ├── alert.service.js           # Evaluates alert rules, fires notifications
│   │   ├── sms.service.js             # Africa's Talking SMS wrapper
│   │   ├── crossverify.service.js     # Engine ignition vs app action validator
│   │   ├── deviation.service.js       # Route deviation and stop detection
│   │   ├── geofence.service.js        # Geofence breach detection
│   │   ├── report.service.js          # PDF (pdfkit) and Excel (exceljs) generation
│   │   └── socket.service.js          # Emits live position updates to dashboard
│   │
│   ├── /models
│   │   ├── truck.model.js             # Truck DB queries
│   │   ├── driver.model.js            # Driver DB queries
│   │   ├── trip.model.js              # Trip DB queries
│   │   ├── gpsPoint.model.js          # GPS point insert / query
│   │   ├── fuelReading.model.js       # Fuel reading insert / query
│   │   ├── checkin.model.js           # Driver session queries
│   │   └── alert.model.js             # Alert insert / query
│   │
│   ├── /middleware
│   │   ├── auth.middleware.js         # JWT verification for protected routes
│   │   ├── role.middleware.js         # Role-based access (manager vs driver)
│   │   ├── validate.middleware.js     # Request body validation (Joi)
│   │   └── errorHandler.middleware.js # Global error handler
│   │
│   ├── /db
│   │   ├── /migrations                # Ordered SQL migration files
│   │   │   ├── 001_create_trucks.sql
│   │   │   ├── 002_create_drivers.sql
│   │   │   ├── 003_create_trips.sql
│   │   │   ├── 004_create_gps_points.sql
│   │   │   ├── 005_create_fuel_readings.sql
│   │   │   ├── 006_create_checkins.sql
│   │   │   ├── 007_create_alerts.sql
│   │   │   └── 008_create_geofences.sql
│   │   ├── migrate.js                 # Migration runner script
│   │   └── seed.js                    # Runs all seed files (dev only)
│   │
│   └── /utils
│       ├── haversine.js               # Distance calculation between GPS coordinates
│       ├── timeHelpers.js             # Date formatting and time comparison utilities
│       ├── logger.js                  # Winston logger configuration
│       └── constants.js               # System-wide constants (alert thresholds, modes)
│
│
├── /frontend                          # React.js + Tailwind CSS
│   ├── package.json
│   ├── package-lock.json
│   ├── tailwind.config.js
│   ├── vite.config.js                 # Or CRA config if using Create React App
│   │
│   ├── /public
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   └── /src
│       ├── main.jsx                   # React entry point
│       ├── App.jsx                    # Root component with routing
│       │
│       ├── /pages
│       │   ├── LoginPage.jsx          # Manager login
│       │   ├── DashboardPage.jsx      # Main overview with live map
│       │   ├── TrucksPage.jsx         # Fleet list and individual truck detail
│       │   ├── DriversPage.jsx        # Driver list and profiles
│       │   ├── TripsPage.jsx          # Trip history, trip detail view, route playback
│       │   ├── FuelReportsPage.jsx    # Per-truck and per-driver fuel summaries
│       │   ├── AlertsPage.jsx         # Alert log, acknowledgement, filtering
│       │   ├── GeofencePage.jsx       # Draw and manage operating zones
│       │   └── DriverApp.jsx          # Mobile-optimised driver check-in/out page
│       │
│       ├── /components
│       │   ├── /map
│       │   │   ├── LiveMap.jsx        # Leaflet map with real-time truck markers
│       │   │   ├── TruckMarker.jsx    # Colour-coded truck icon component
│       │   │   ├── RoutePolyline.jsx  # Draws planned vs actual route on map
│       │   │   ├── GeofenceLayer.jsx  # Renders geofence polygons on map
│       │   │   └── RoutePlayback.jsx  # Animates completed trip replay
│       │   │
│       │   ├── /alerts
│       │   │   ├── AlertBadge.jsx     # Notification count badge for nav
│       │   │   ├── AlertCard.jsx      # Individual alert display card
│       │   │   └── AlertFilter.jsx    # Alert type / severity filter controls
│       │   │
│       │   ├── /trips
│       │   │   ├── TripCard.jsx       # Trip summary card for list view
│       │   │   ├── TripTimeline.jsx   # Visual timeline of trip events and stops
│       │   │   └── StopMarker.jsx     # Auto-detected stop display on map
│       │   │
│       │   ├── /fuel
│       │   │   ├── FuelGauge.jsx      # Live fuel level visual component
│       │   │   ├── FuelChart.jsx      # Recharts line chart for fuel over trip
│       │   │   └── FuelSummaryTable.jsx
│       │   │
│       │   ├── /driver
│       │   │   ├── CheckInForm.jsx    # Driver name + truck selector
│       │   │   ├── TripControls.jsx   # Start Trip / End Trip buttons
│       │   │   └── CheckOutButton.jsx
│       │   │
│       │   └── /shared
│       │       ├── Navbar.jsx
│       │       ├── Sidebar.jsx
│       │       ├── StatusBadge.jsx    # active / parked / alert colour pills
│       │       ├── DataTable.jsx      # Reusable sortable table component
│       │       ├── ExportButton.jsx   # PDF / Excel download trigger
│       │       ├── LoadingSpinner.jsx
│       │       └── ConfirmModal.jsx
│       │
│       ├── /hooks
│       │   ├── useSocket.js           # Socket.io connection and live event listener
│       │   ├── useTrucks.js           # Truck data fetching and state
│       │   ├── useTrips.js            # Trip data fetching and state
│       │   ├── useAlerts.js           # Alert polling and acknowledgement
│       │   └── useFuel.js             # Fuel data fetching
│       │
│       ├── /context
│       │   ├── AuthContext.jsx        # JWT auth state and login/logout actions
│       │   └── SocketContext.jsx      # Shared Socket.io client instance
│       │
│       ├── /services
│       │   ├── api.js                 # Axios instance with base URL and auth headers
│       │   ├── trucks.api.js          # Truck-specific API calls
│       │   ├── drivers.api.js
│       │   ├── trips.api.js
│       │   ├── alerts.api.js
│       │   └── fuel.api.js
│       │
│       └── /utils
│           ├── formatters.js          # Date, distance, KES currency formatters
│           ├── mapHelpers.js          # Coordinate bounds, zoom calculations
│           └── alertColors.js         # Alert severity → colour mapping
│
│
├── /mqtt-broker                       # Local MQTT broker for development
│   ├── mosquitto.conf                 # Broker config (ports, auth, persistence)
│   └── passwd                         # MQTT credentials (dev only)
│
│
├── /mock                              # ← ALL MOCK DATA & TEST SCRIPTS
│   │
│   ├── README.md                      # How to run mock data and test scenarios
│   │
│   ├── /data                          # Static seed and fixture data
│   │   ├── trucks.json                # 10 sample trucks with full metadata
│   │   ├── drivers.json               # 15 sample drivers (name, phone, licence)
│   │   ├── geofences.json             # 3 sample operating zone polygons (Nairobi)
│   │   ├── planned_routes.json        # 5 pre-defined route paths (lat/lng arrays)
│   │   └── alert_scenarios.json       # Named alert trigger conditions for testing
│   │
│   ├── /gps-simulator                 # Simulates GPS tracker MQTT messages
│   │   ├── simulator.js               # Main simulator — publishes to MQTT broker
│   │   ├── routes/
│   │   │   ├── nairobi_mombasa.json   # Waypoints: Nairobi CBD → Mombasa
│   │   │   ├── nairobi_kisumu.json    # Waypoints: Nairobi → Kisumu
│   │   │   ├── nairobi_nakuru.json    # Waypoints: Nairobi → Nakuru
│   │   │   ├── cbd_industrial.json    # Short: CBD → Industrial Area
│   │   │   └── offroute_deviation.json# Route that deliberately deviates
│   │   └── scenarios/
│   │       ├── normal_trip.js         # Full normal trip simulation (check-in → end)
│   │       ├── unauthorised_start.js  # Engine on, no check-in → alert fires
│   │       ├── fuel_theft.js          # Fuel drop while parked → alert fires
│   │       ├── night_movement.js      # Truck moves 11 PM → theft alert
│   │       ├── route_deviation.js     # Truck leaves planned route
│   │       ├── geofence_breach.js     # Truck exits defined operating zone
│   │       └── offline_reconnect.js   # Tracker goes offline, batch uploads on reconnect
│   │
│   ├── /api-tests                     # REST API integration tests
│   │   ├── auth.test.js               # Login, token refresh, logout
│   │   ├── trucks.test.js             # CRUD operations for trucks
│   │   ├── drivers.test.js            # CRUD operations for drivers
│   │   ├── checkin.test.js            # Check-in, check-out flow, session conflicts
│   │   ├── trips.test.js              # Start trip, end trip, fetch history
│   │   ├── fuel.test.js               # Fuel reading ingestion and report generation
│   │   ├── alerts.test.js             # Alert creation, acknowledgement, filtering
│   │   └── reports.test.js            # PDF and Excel export endpoints
│   │
│   ├── /alert-tests                   # Isolated alert rule unit tests
│   │   ├── crossverify.test.js        # Engine ignition vs app time mismatch tests
│   │   ├── unauthorised.test.js       # Engine-on-no-checkin rule tests
│   │   ├── fuel_anomaly.test.js       # Fuel drop and excess consumption tests
│   │   ├── night_movement.test.js     # After-hours movement detection tests
│   │   ├── deviation.test.js          # Route deviation threshold tests
│   │   └── geofence.test.js           # Geofence breach detection tests
│   │
│   ├── /load-tests                    # Performance and load testing
│   │   ├── README.md                  # How to run load tests (k6)
│   │   ├── concurrent_gps.js          # 10 trucks streaming GPS simultaneously (k6)
│   │   ├── dashboard_load.js          # 50 concurrent manager dashboard sessions
│   │   └── alert_storm.js             # Rapid alert generation stress test
│   │
│   └── /postman
│       ├── LogiTrack.postman_collection.json   # Full API collection (importable)
│       └── LogiTrack.postman_environment.json  # Dev environment variables
│
│
└── /docs                              # Project documentation
    ├── delivery_plan.pdf              # Original client delivery plan
    ├── api_spec.md                    # Full REST API endpoint documentation
    ├── db_schema.md                   # Database table definitions and relationships
    ├── alert_rules.md                 # All alert trigger conditions and thresholds
    ├── hardware_setup.md              # GPS tracker wiring and configuration guide
    ├── mqtt_payload_format.md         # MQTT topic structure and JSON payload spec
    ├── deployment_guide.md            # AWS / DigitalOcean production setup
    └── user_manuals/
        ├── manager_manual.md          # Dashboard usage guide for fleet managers
        └── driver_manual.md           # Mobile app guide for drivers
```

---

## 5. Getting Started

### Prerequisites

Ensure the following are installed on your development machine:

- **Node.js** v18 or higher
- **npm** v9 or higher
- **PostgreSQL** v14 or higher
- **Docker & Docker Compose** (recommended for full stack)
- **Mosquitto MQTT broker** (or run via Docker)
- **Git**

### Quick Start with Docker (Recommended)

This spins up PostgreSQL, Mosquitto MQTT broker, and the Node.js backend together:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/logitrack.git
cd logitrack

# 2. Copy environment file and fill in your values
cp .env.example .env

# 3. Start all services
docker-compose up --build

# 4. Run database migrations
docker-compose exec backend node backend/db/migrate.js

# 5. Seed development data (trucks, drivers, geofences)
docker-compose exec backend node backend/db/seed.js
```

The backend API will be available at `http://localhost:5000`  
The MQTT broker will be listening on `mqtt://localhost:1883`

### Manual Setup (No Docker)

```bash
# --- Backend ---
cd backend
npm install
cp ../.env.example .env        # Fill in your DB and MQTT credentials
node db/migrate.js             # Run all SQL migrations
node db/seed.js                # Seed with sample data
npm run dev                    # Starts server with nodemon

# --- Frontend (separate terminal) ---
cd frontend
npm install
npm run dev                    # Starts Vite dev server at http://localhost:5173

# --- MQTT Broker (separate terminal) ---
mosquitto -c mqtt-broker/mosquitto.conf
```

---

## 6. Environment Variables

Copy `.env.example` to `.env` and populate all values before running.

```bash
# ─── Server ───────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ─── PostgreSQL ───────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=logitrack_dev
DB_USER=logitrack_user
DB_PASSWORD=your_db_password

# ─── JWT Authentication ───────────────────────────────────────────
JWT_SECRET=your_very_long_random_secret_here
JWT_EXPIRES_IN=8h

# ─── MQTT Broker ──────────────────────────────────────────────────
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=logitrack
MQTT_PASSWORD=your_mqtt_password
MQTT_TOPIC_PREFIX=logitrack/trucks

# ─── Africa's Talking (SMS) ───────────────────────────────────────
AT_API_KEY=your_africas_talking_api_key
AT_USERNAME=your_at_username
AT_SENDER_ID=LogiTrack

# ─── Alert Thresholds (configurable) ─────────────────────────────
ALERT_NIGHT_START_HOUR=22        # 10 PM
ALERT_NIGHT_END_HOUR=5           # 5 AM
ALERT_CHECKIN_TIME_TOLERANCE_MIN=10
ALERT_DEVIATION_THRESHOLD_METRES=500
ALERT_STOP_DETECTION_SECONDS=300
ALERT_IDLE_THRESHOLD_MINUTES=15

# ─── Frontend (Vite) ──────────────────────────────────────────────
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 7. Mock Data & Test Scripts

Before connecting real GPS hardware, use the mock suite to fully validate every system layer. All mock tools live in `/mock`.

### 7.1 Seed the Database with Sample Data

```bash
node backend/db/seed.js
```

This inserts data from `/mock/data/`:
- **10 trucks** — registration plates, make/model, assigned SIM IMEI
- **15 drivers** — names, Kenyan phone numbers, licence numbers
- **3 geofences** — Nairobi operating zones (Industrial Area, CBD, Thika Road corridor)
- **5 planned routes** — real Kenyan road coordinate arrays

### 7.2 GPS Simulator

The simulator publishes authentic MQTT messages to your local broker, exactly mimicking what a real GPS tracker transmits. Run it before the dashboard to see live truck movement.

```bash
# Simulate a single normal trip (Nairobi → Mombasa, Truck T-001)
node mock/gps-simulator/scenarios/normal_trip.js

# Simulate all 10 trucks moving simultaneously
node mock/gps-simulator/simulator.js --trucks=10 --route=nairobi_mombasa

# Simulate a specific alert scenario
node mock/gps-simulator/scenarios/unauthorised_start.js
node mock/gps-simulator/scenarios/fuel_theft.js
node mock/gps-simulator/scenarios/night_movement.js
node mock/gps-simulator/scenarios/route_deviation.js
node mock/gps-simulator/scenarios/geofence_breach.js
node mock/gps-simulator/scenarios/offline_reconnect.js
```

**MQTT Payload format** published by each simulated truck:

```json
Topic: logitrack/trucks/{truck_id}/gps

{
  "truck_id": "T-001",
  "imei": "352656100000001",
  "timestamp": "2026-05-28T09:15:42Z",
  "lat": -1.286389,
  "lng": 36.817223,
  "speed_kmh": 72,
  "heading": 142,
  "ignition": true,
  "fuel_level_pct": 68.4,
  "fuel_level_litres": 136.8,
  "signal_strength": -78,
  "satellites": 9
}
```

### 7.3 Alert Scenario Reference

| Scenario Script | Alert Triggered | Notification Channel |
|---|---|---|
| `unauthorised_start.js` | Engine on with no driver check-in | SMS + push notification |
| `fuel_theft.js` | Fuel level drops while truck is parked, engine off | Push + email |
| `night_movement.js` | Truck moves between 10 PM and 5 AM, no check-in | SMS + push + email |
| `route_deviation.js` | Truck exceeds 500m from planned route | Push notification |
| `geofence_breach.js` | Truck exits defined operating zone polygon | SMS + push |
| `offline_reconnect.js` | Tracker goes offline, batches and uploads on reconnect | Dashboard flag |

To verify alerts fired, check the dashboard alert centre or query directly:

```bash
curl http://localhost:5000/api/alerts?limit=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7.4 Run API Integration Tests

```bash
# Install test dependencies
cd mock
npm install

# Run all API tests
npm test

# Run a specific test file
npx jest mock/api-tests/checkin.test.js --verbose

# Run alert rule unit tests
npx jest mock/alert-tests/ --verbose
```

### 7.5 Run Load Tests (k6)

Ensure [k6](https://k6.io) is installed, then:

```bash
# Simulate 10 trucks streaming GPS data simultaneously for 5 minutes
k6 run mock/load-tests/concurrent_gps.js

# Simulate 50 concurrent manager dashboard sessions
k6 run mock/load-tests/dashboard_load.js
```

### 7.6 Import Postman Collection

1. Open Postman
2. Click **Import** → select `mock/postman/LogiTrack.postman_collection.json`
3. Import the environment: `mock/postman/LogiTrack.postman_environment.json`
4. Set `base_url` to `http://localhost:5000` and `jwt_token` after logging in
5. All 40+ endpoints are pre-configured and ready to test

---

## 8. API Reference

Base URL: `http://localhost:5000/api`  
All protected routes require: `Authorization: Bearer <token>`

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Manager login — returns JWT |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/refresh` | Refresh JWT token |

### Trucks

| Method | Endpoint | Description |
|---|---|---|
| GET | `/trucks` | List all trucks with live status |
| GET | `/trucks/:id` | Single truck detail |
| POST | `/trucks` | Register new truck |
| PUT | `/trucks/:id` | Update truck record |
| DELETE | `/trucks/:id` | Decommission truck |
| GET | `/trucks/:id/position` | Latest GPS position |
| GET | `/trucks/:id/history` | GPS history (date range) |

### Drivers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/drivers` | List all drivers |
| GET | `/drivers/:id` | Driver profile and trip history |
| POST | `/drivers` | Register new driver |
| PUT | `/drivers/:id` | Update driver record |

### Check-In / Check-Out

| Method | Endpoint | Description |
|---|---|---|
| POST | `/checkin` | Driver checks in to a truck |
| POST | `/checkout` | Driver checks out of a truck |
| GET | `/checkin/active` | All currently active driver sessions |
| GET | `/checkin/history` | Check-in history (filterable) |

### Trips

| Method | Endpoint | Description |
|---|---|---|
| POST | `/trips/start` | Start a trip (driver action) |
| POST | `/trips/:id/end` | End a trip (driver action) |
| GET | `/trips` | Trip history with filters |
| GET | `/trips/:id` | Full trip detail with GPS trail |
| GET | `/trips/:id/export/pdf` | Download trip summary as PDF |
| GET | `/trips/:id/export/excel` | Download trip log as Excel |

### Fuel

| Method | Endpoint | Description |
|---|---|---|
| GET | `/fuel/:truck_id` | Fuel history for a truck |
| GET | `/fuel/reports/monthly` | Monthly fuel summary (all trucks) |
| GET | `/fuel/reports/driver/:id` | Per-driver fuel efficiency report |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/alerts` | Alert history (filterable by type, truck, date) |
| PUT | `/alerts/:id/acknowledge` | Acknowledge an alert |
| GET | `/alerts/active` | All unacknowledged alerts |

---

## 9. GPS Tracker Integration

> This section applies when connecting real hardware. Use the GPS simulator in `/mock` during development.

### MQTT Topic Structure

```
logitrack/trucks/{truck_id}/gps        # Live GPS + fuel payload
logitrack/trucks/{truck_id}/ignition   # Engine on/off events
logitrack/trucks/{truck_id}/status     # Tracker health and signal status
```

### Tracker Configuration (on device)

Program the GPS tracker with these parameters:

```
Server IP:      your.server.ip.address
Server Port:    1883 (MQTT)
Protocol:       MQTT
Client ID:      {IMEI}
Topic:          logitrack/trucks/{truck_id}/gps
Publish rate (trip):    10 seconds
Publish rate (idle):    120 seconds
Publish rate (parked):  1800 seconds
```

See `/docs/hardware_setup.md` for model-specific wiring diagrams and configuration walkthroughs.

---

## 10. Alert Engine

The alert engine (`backend/services/alert.service.js`) evaluates rules continuously as GPS and check-in data arrives. All thresholds are configurable via environment variables.

### Alert Rules

| Rule ID | Trigger Condition | Severity | Channels |
|---|---|---|---|
| `UNAUTHORISED_MOVEMENT` | Engine ignition with no active check-in | Critical | SMS + Push |
| `POSSIBLE_THEFT` | Movement detected between 22:00–05:00, no check-in | Critical | SMS + Push + Email |
| `FUEL_DROP_STATIONARY` | Fuel level falls >5% while engine is off | High | Push + Email |
| `ROUTE_DEVIATION` | Truck >500m from assigned route | Medium | Push |
| `GEOFENCE_BREACH` | Truck exits defined operating zone | High | SMS + Push |
| `CHECKIN_DISCREPANCY` | App check-in time vs ignition time differ >10 min | Medium | Dashboard |
| `ACTIVE_AFTER_SIGNOFF` | Driver checks out but engine still running | High | Push + Dashboard |
| `EXCESSIVE_IDLE` | Engine on, no movement for >15 minutes | Low | Dashboard |
| `LOW_FUEL` | Fuel level below configurable threshold (default 15%) | Medium | Push + SMS |

---

## 11. Database Schema Overview

Full schema with column definitions is in `/docs/db_schema.md`. Core tables:

```
trucks          — id, plate, make, model, imei, sim_number, status, created_at
drivers         — id, name, phone, licence_number, status, created_at
checkins        — id, driver_id, truck_id, checkin_time, checkout_time, ignition_checkin_time
trips           — id, checkin_id, truck_id, driver_id, start_time, end_time, planned_route_id,
                  total_distance_km, fuel_used_litres, status, flags[]
gps_points      — id, truck_id, trip_id, lat, lng, speed_kmh, heading, timestamp
fuel_readings   — id, truck_id, trip_id, level_pct, level_litres, timestamp
alerts          — id, truck_id, driver_id, trip_id, alert_type, severity, message,
                  acknowledged, created_at
geofences       — id, name, polygon (GeoJSON), active
planned_routes  — id, name, waypoints (GeoJSON LineString)
```

---

## 12. Development Phases

| Phase | Weeks | Owner | Focus |
|---|---|---|---|
| **Phase 1 — Foundation** | 1–4 | Jackson | DB schema, MQTT pipeline, GPS data ingestion, cloud setup |
| **Phase 2 — Core Features** | 5–9 | Jackson | Check-in/out, trip lifecycle, fuel monitoring, alert engine, SMS |
| **Phase 3 — Dashboard** | 10–13 | Sharon | Live map, trip history, fuel reports, route playback, PDF/Excel export |
| **Phase 4 — Launch** | 14–16 | Both | Real truck testing, bug fixes, training, production deployment |

Client sign-off is required at the end of Phase 3 (UAT) and Phase 4 (go-live) before corresponding payments are released.

---

## 13. Testing Strategy

| Level | Tool | Location | Covers |
|---|---|---|---|
| Unit tests — alert rules | Jest | `mock/alert-tests/` | Individual alert trigger logic |
| Integration tests — API | Jest + Supertest | `mock/api-tests/` | All REST endpoints end-to-end |
| GPS simulation | Custom MQTT simulator | `mock/gps-simulator/` | Full tracker data pipeline |
| Load tests | k6 | `mock/load-tests/` | Concurrent trucks, concurrent sessions |
| Manual API testing | Postman | `mock/postman/` | Exploratory and regression testing |
| UAT (Phase 3) | Client-led | Real environment | Full system sign-off with real trucks |

### Run All Tests

```bash
# From project root
npm test
```

---

## 14. Deployment

### Production Environment

Recommended: **DigitalOcean Droplet** (2 vCPU / 4 GB RAM minimum) or **AWS EC2 t3.medium**

```bash
# On the server:
git clone https://github.com/your-org/logitrack.git
cd logitrack
cp .env.example .env          # Fill production values
npm install --prefix backend
node backend/db/migrate.js    # Run migrations on production DB

# Start with PM2
npm install -g pm2
pm2 start backend/server.js --name logitrack-api
pm2 startup
pm2 save
```

### Production Checklist

- [ ] `.env` has production DB credentials (never commit this file)
- [ ] JWT secret is long and random (min 64 characters)
- [ ] MQTT broker has authentication enabled
- [ ] Africa's Talking account funded and API key active
- [ ] SSL/TLS certificate configured (Let's Encrypt via Nginx)
- [ ] PostgreSQL backups scheduled (daily)
- [ ] PM2 configured to restart on server reboot
- [ ] Firewall: only ports 80, 443, 1883 (MQTT) open publicly

---

## 15. Contributing & Git Workflow

### Branch Strategy

```
main                  # Production — protected, no direct pushes
└── develop           # Integration branch — merge all features here first
    ├── feature/jackson/gps-pipeline
    ├── feature/jackson/alert-engine
    ├── feature/sharon/live-map
    └── feature/sharon/trip-reports
```

### Commit Message Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
test:     Adding or updating tests
refactor: Code change without feature/fix
chore:    Build process or tooling
```

**Examples:**
```
feat: add fuel theft detection alert rule
fix: resolve checkin session not closing on checkout
docs: update MQTT payload format spec
test: add route deviation threshold unit tests
```

### Pull Request Process

1. Branch from `develop` using the naming convention above
2. Write or update relevant tests in `/mock`
3. Ensure `npm test` passes locally
4. Open a PR to `develop` — tag the other engineer for review
5. Squash and merge after approval

---

## Contacts

| Role | Name | Responsibility |
|---|---|---|
| Lead Backend Engineer | Jackson Mativo | API, database, GPS pipeline, alerts, deployment |
| Lead Frontend Engineer | Sharon Kosgei | Dashboard, driver app, maps, reports, UX |

---

*LogiTrack Delivery Plan v1.0 — Confidential*  
*Prepared by Jackson Mativo & Sharon Kosgei*  
*Document date: 28 May 2026*
