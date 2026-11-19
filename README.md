# ElectroHub - Smart EV Station & Load Management System

A high-performance, responsive, interactive Web Dashboard for Electric Vehicle (EV) Charging Stations and Smart Load Management, designed in accordance with **Lovable.dev** aesthetics (modern dark mode, glassmorphism, glowing telemetry badges, micro-interactions, live chart streams, and real-time simulations).

This project directly implements all requirements, state transitions, algorithms, and architectural models specified in **Experiments 01 through 10** of the Software Engineering Lab Curriculum.

---

## ⚡ Key Features (Lovable Aesthetic & Interaction)

1. **Lovable-Style Glassmorphism & Cyberpunk Neon UI**:
   - Deep slate/zinc dark aesthetic (`#090D16`) with electric emerald (`#10B981`) and cyber cyan (`#06B6D4`) glowing accents.
   - Circular SVG State-of-Charge (SOC%) animated battery gauges.
   - Real-time telemetry ticker showing grid frequency (50 Hz), active kW load, and dynamic safety margins.
   - Built-in Web Audio API sound synthesizer for charging connection chimes and overload alerts (zero external mp3 assets needed).

2. **Smart Dynamic Load Balancing (DLB) Engine (FR-03 & FR-04)**:
   - Prevents station transformer overload by dynamically allocating available electrical capacity among all active charging bays.
   - Switchable load balancing strategies:
     - **Dynamic Equal Share**: Divides configured power limit evenly across connected vehicles.
     - **Priority & Low SOC Boost**: Prioritizes emergency/VIP vehicles and batteries with low charge (<30%), throttling cars nearing 80%+.
     - **First-Come, First-Served (FCFS)**: Guarantees full speed to earlier arrivals.

3. **Multi-Role View Switching (Actors from Experiment 05 & 06)**:
   - 👨‍💼 **Station Operator**: Manage bays, view live load metrics, toggle bay maintenance, emergency shutdown, and monitor revenues.
   - 🚗 **EV User Portal**: View personalized vehicle profile (e.g. *Aarav Sharma's Tata Nexon EV* or *Neha Verma's MG ZS EV*), live SOC progress ring, real-time bill, and new charging slot booking.
   - ⚡ **Load & Grid Dispatcher**: Inspect high-voltage feeder bus voltage, phase stability, and transformer temperature headroom.

4. **Interactive Simulation & Stress Testing**:
   - 🚗 **Spawn Random EV**: Randomly generates realistic Indian/global EV requests (Tata Nexon EV Max, MG ZS EV, Hyundai Ioniq 5, Mahindra XUV400, Kia EV6, BYD Atto 3, etc.) with randomized battery SOC% and charging limits.
   - ⚠️ **Simulate Grid Curtailment**: Drops station power limit dynamically by 35% to test auto-throttling, queue deflection, and operator alerts.
   - ⏱️ **Simulation Speed Control**: 1x, 3x, and 5x turbo simulation with play/pause.

5. **Historical Records & Reporting (FR-08)**:
   - Comprehensive charging session log (Session ID, User, Vehicle, Bay, Start Time, kWh delivered, Peak kW, Cost, Status).
   - Direct browser **CSV Export** button.

---

## 📐 Direct Mapping to University Experiments (01 to 10)

| Experiment | Academic Requirement | How It Is Implemented in ElectroHub Dashboard |
|---|---|---|
| **Experiment 01** | **Problem Statement & Objectives** | Addresses uncoordinated charging, grid overload, and waiting times through intelligent real-time load management. |
| **Experiment 02** | **Software Requirements Specification (SRS)** | Implements **FR-01 to FR-08**: Bay availability (FR-01), Request booking modal (FR-02), Total capacity gauge (FR-03), Dynamic load allocation (FR-04), Queue scheduling (FR-05), Real-time SOC & power display (FR-06), Overload alerts (FR-07), and CSV session records (FR-08). |
| **Experiment 03** | **DFD (Level 0, Level 1) & Structure Chart** | Request Management, Station Monitoring, Load Management, and Reporting modules cleanly separated in code (`loadManager.js` & `app.js`). |
| **Experiment 04** | **Entity-Relationship Diagram (ERD)** | Data entities `EV_USER`, `CHARGING_REQUEST`, `STATION`, `SCHEDULE_ALLOCATION`, `CHARGING_POINT`, and `CHARGING_SESSION` defined in `js/models.js`. |
| **Experiment 05** | **Use Case Diagram** | Actors: **EV User** (Reserve, Monitor, History), **Station Manager** (Monitor, Manage, Configure), and **Load Manager** (Calculate Load, Allocate, Raise Alerts). Accessible via top role switcher. |
| **Experiment 06** | **Class & Object Diagram** | Pre-seeded with instances from the Object Diagram: `Aarav Sharma` (`U101`, Tata Nexon EV, 22 kW), `Neha Verma` (`U102`, MG ZS EV, 30 kW), and `City Mall Parking S01` (60 kW limit). |
| **Experiment 07** | **State-Chart & Activity Diagram** | Request state transitions: `SUBMITTED` &rarr; `UNDER_VALIDATION` &rarr; `APPROVED` / `QUEUED` &rarr; `CHARGING` &rarr; `COMPLETED` / `CANCELLED`. |
| **Experiment 08** | **Sequence & Collaboration Diagrams** | Message order: User requests &rarr; Dashboard validates &rarr; Load Manager checks capacity &rarr; Allocates or queues &rarr; Updates status. |
| **Experiment 09** | **Component Diagram** | Layered modular architecture: Presentation (`index.html`, `styles.css`), Application (`loadManager.js`), Data (`models.js`), and Audio (`audio.js`). |
| **Experiment 10** | **Deployment Diagram** | Client browser executing single-page web app with local telemetry simulator. |

---

## 🚀 How to Run the Dashboard

### Option 1: Direct Browser Launch (Recommended - Zero Setup)
Simply double-click `index.html` or open it in Google Chrome, Microsoft Edge, Brave, or Firefox:
```
file:///c:/Users/IAS2028/Downloads/ev-station-dashboard/index.html
```

### Option 2: Run with Python HTTP Server
Open a terminal in the `ev-station-dashboard` folder and run:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.

### Option 3: Run with Node.js
```bash
npx serve .
```

---

## 📂 File Structure

```
ev-station-dashboard/
├── index.html          # Main Lovable-style interactive dashboard UI
├── css/
│   └── styles.css      # Glassmorphism, animations, custom scrollbars & glowing rings
├── js/
│   ├── models.js       # UML Classes & ERD entities (Experiment 04 & 06)
│   ├── loadManager.js  # DLB algorithm & State-chart transitions (Experiment 07)
│   ├── audio.js        # Web Audio API synthesizer for interactive audio feedback
│   └── app.js          # Controller, Chart.js telemetry stream & simulation engine
└── README.md           # Documentation & Experiment specification guide
```
