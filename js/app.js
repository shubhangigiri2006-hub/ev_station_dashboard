import { 
  Station, 
  ChargingPoint, 
  EVUser, 
  ChargingRequest, 
  PointStatus, 
  RequestStatus, 
  AlertLevel 
} from './models.js';
import { LoadManager } from './loadManager.js';
import { sound } from './audio.js';

// Predefined stations
const STATIONS_DATA = [
  {
    stationId: 'S01',
    name: 'City Mall Parking Hub',
    location: 'City Mall Basement B2, Central Wing',
    maxCapacityKW: 60,
    tariffRate: 12.50,
    points: [
      { id: 'P01', ratedKW: 22, type: 'Type-2 AC Fast' },
      { id: 'P02', ratedKW: 30, type: 'CCS-2 DC Fast' },
      { id: 'P03', ratedKW: 22, type: 'Type-2 AC Fast' },
      { id: 'P04', ratedKW: 22, type: 'Type-2 AC Fast' },
      { id: 'P05', ratedKW: 30, type: 'CCS-2 DC Fast' },
      { id: 'P06', ratedKW: 60, type: 'CCS-2 Supercharge' },
    ]
  },
  {
    stationId: 'S02',
    name: 'National Highway Supercharge S02',
    location: 'NH-48 Milestone 74, Rest Stop Area',
    maxCapacityKW: 120,
    tariffRate: 15.00,
    points: [
      { id: 'P01', ratedKW: 60, type: 'CCS-2 Ultra DC' },
      { id: 'P02', ratedKW: 60, type: 'CCS-2 Ultra DC' },
      { id: 'P03', ratedKW: 30, type: 'CCS-2 DC Fast' },
      { id: 'P04', ratedKW: 30, type: 'CCS-2 DC Fast' },
      { id: 'P05', ratedKW: 22, type: 'Type-2 AC Fast' },
      { id: 'P06', ratedKW: 22, type: 'Type-2 AC Fast' },
    ]
  },
  {
    stationId: 'S03',
    name: 'CyberTech Eco Solar Park S03',
    location: 'Tech Corridor Phase 1, Gate 4',
    maxCapacityKW: 90,
    tariffRate: 11.00,
    points: [
      { id: 'P01', ratedKW: 30, type: 'CCS-2 DC Fast' },
      { id: 'P02', ratedKW: 30, type: 'CCS-2 DC Fast' },
      { id: 'P03', ratedKW: 22, type: 'Type-2 AC Fast' },
      { id: 'P04', ratedKW: 22, type: 'Type-2 AC Fast' },
    ]
  }
];

// Seed users from Experiment 06 Object Diagram
const SEED_USERS = [
  new EVUser('U101', 'Aarav Sharma', 'Tata Nexon EV (MH-12-AB-1234)', '+91 98230 11223', 42, 40.5),
  new EVUser('U102', 'Neha Verma', 'MG ZS EV (DL-03-CC-5678)', '+91 98110 44556', 28, 50.3),
  new EVUser('U103', 'Vikram Patel', 'Hyundai Ioniq 5 (GJ-01-EE-9900)', '+91 98990 77889', 58, 72.6),
  new EVUser('U104', 'Ananya Iyer', 'Mahindra XUV400 (KA-05-MM-3421)', '+91 97400 33221', 18, 39.4),
  new EVUser('U105', 'Rohan Mehta', 'BYD Atto 3 (MH-02-ZZ-8899)', '+91 98200 66778', 35, 60.4),
  new EVUser('U106', 'Priya Sundaram', 'Kia EV6 GT (TN-07-QQ-4321)', '+91 98400 99887', 50, 77.4)
];

const RANDOM_CARS = [
  { model: 'Tata Nexon EV Max', capacity: 40.5, rated: 22 },
  { model: 'MG ZS EV Exclusive', capacity: 50.3, rated: 30 },
  { model: 'Mahindra XUV400 EL', capacity: 39.4, rated: 22 },
  { model: 'Hyundai Ioniq 5 AWD', capacity: 72.6, rated: 50 },
  { model: 'BYD Atto 3 Superior', capacity: 60.4, rated: 30 },
  { model: 'Kia EV6 GT-Line', capacity: 77.4, rated: 50 },
  { model: 'BMW i4 eDrive40', capacity: 83.9, rated: 60 },
  { model: 'Tata Tiago EV Tech', capacity: 24.0, rated: 7.2 }
];

const RANDOM_NAMES = [
  'Kavita Das', 'Siddharth Rao', 'Rajesh Kothari', 'Meera Nair',
  'Aditya Deshmukh', 'Sneha Kapoor', 'Gautam Banerjee', 'Tanvi Singhania'
];

class DashboardApp {
  constructor() {
    this.currentRole = 'MANAGER'; // 'MANAGER', 'USER', 'GRID'
    this.selectedStationId = 'S01';
    this.simSpeed = 1;
    this.isSimRunning = true;
    this.chart = null;
    this.timeHistory = [];
    this.loadHistory = [];
    this.capacityHistory = [];
    this.selectedEVUserId = 'U101'; // For EV User view

    this.initStation(this.selectedStationId);
    this.initChart();
    this.bindEvents();
    this.startSimulationLoop();
    this.render();
  }

  initStation(stationId) {
    const raw = STATIONS_DATA.find(s => s.stationId === stationId) || STATIONS_DATA[0];
    this.station = new Station(raw.stationId, raw.name, raw.location, raw.maxCapacityKW, raw.tariffRate);

    this.station.points = raw.points.map(p => 
      new ChargingPoint(p.id, this.station.stationId, p.ratedKW, p.type)
    );

    this.loadManager = new LoadManager(
      this.station,
      (alert) => this.handleAlert(alert),
      () => this.render()
    );

    // Register initial users
    SEED_USERS.forEach(u => this.loadManager.registerUser(u));

    // Seed initial active sessions matching Object Diagram
    this.seedInitialSessions();
  }

  seedInitialSessions() {
    // Session 1: Aarav Sharma on P01
    const req1 = new ChargingRequest('REQ-201', 'U101', this.station.stationId, 22, 85);
    this.loadManager.processChargingRequest(req1);

    // Session 2: Neha Verma on P02
    const req2 = new ChargingRequest('REQ-202', 'U102', this.station.stationId, 30, 90);
    this.loadManager.processChargingRequest(req2);
  }

  handleAlert(alert) {
    if (alert.level === AlertLevel.CRITICAL) {
      sound.playAlert();
    }
    this.renderAlerts();
  }

  startSimulationLoop() {
    this.simInterval = setInterval(() => {
      if (this.isSimRunning) {
        // Step simulation by (2 * simSpeed) seconds
        this.loadManager.tickSimulation(2 * this.simSpeed);
        this.updateChartData();
        this.render();
      }
    }, 1000);
  }

  updateChartData() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.timeHistory.push(timeStr);
    this.loadHistory.push(this.station.currentLoadKW);
    this.capacityHistory.push(this.station.configuredLimitKW);

    if (this.timeHistory.length > 20) {
      this.timeHistory.shift();
      this.loadHistory.shift();
      this.capacityHistory.shift();
    }

    if (this.chart) {
      this.chart.data.labels = this.timeHistory;
      this.chart.data.datasets[0].data = this.loadHistory;
      this.chart.data.datasets[1].data = this.capacityHistory;
      this.chart.update('none'); // Update without full redraw
    }
  }

  initChart() {
    const ctx = document.getElementById('loadChart')?.getContext('2d');
    if (!ctx) return;

    // Fill initial 8 data points
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const past = new Date(now.getTime() - i * 3000);
      this.timeHistory.push(past.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      this.loadHistory.push(this.station.currentLoadKW);
      this.capacityHistory.push(this.station.configuredLimitKW);
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.timeHistory,
        datasets: [
          {
            label: 'Actual Station Load (kW)',
            data: this.loadHistory,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 5,
          },
          {
            label: 'Configured Grid Limit (kW)',
            data: this.capacityHistory,
            borderColor: '#f59e0b',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#e2e8f0',
            borderColor: '#334155',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          },
          y: {
            min: 0,
            suggestedMax: this.station.maxCapacityKW * 1.1,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
              color: '#64748b',
              callback: (val) => `${val} kW`
            }
          }
        }
      }
    });
  }

  bindEvents() {
    // Station dropdown switcher
    document.getElementById('stationSelect')?.addEventListener('change', (e) => {
      this.selectedStationId = e.target.value;
      this.initStation(this.selectedStationId);
      if (this.chart) {
        this.chart.options.scales.y.suggestedMax = this.station.maxCapacityKW * 1.1;
      }
      this.render();
    });

    // Role switcher pills
    document.querySelectorAll('.role-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.role-pill').forEach(b => {
          b.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/40');
          b.classList.add('text-slate-400', 'border-transparent');
        });
        const target = e.currentTarget;
        target.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/40');
        target.classList.remove('text-slate-400', 'border-transparent');
        this.currentRole = target.dataset.role;
        this.renderRoleViews();
      });
    });

    // Power limit slider
    const slider = document.getElementById('powerLimitSlider');
    const display = document.getElementById('sliderLimitDisplay');
    slider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (display) display.textContent = `${val} kW`;
      this.loadManager.setPowerLimit(val);
    });

    // Strategy selector
    document.getElementById('strategySelect')?.addEventListener('change', (e) => {
      this.loadManager.setBalancingStrategy(e.target.value);
    });

    // Simulation controls
    document.getElementById('simPlayPauseBtn')?.addEventListener('click', () => {
      this.isSimRunning = !this.isSimRunning;
      const icon = document.getElementById('playPauseIcon');
      const text = document.getElementById('playPauseText');
      if (this.isSimRunning) {
        if (icon) icon.setAttribute('data-lucide', 'pause');
        if (text) text.textContent = 'Pause';
      } else {
        if (icon) icon.setAttribute('data-lucide', 'play');
        if (text) text.textContent = 'Resume';
      }
      lucide.createIcons();
    });

    document.querySelectorAll('.sim-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sim-speed-btn').forEach(b => b.classList.remove('bg-emerald-500', 'text-slate-950'));
        e.currentTarget.classList.add('bg-emerald-500', 'text-slate-950');
        this.simSpeed = parseInt(e.currentTarget.dataset.speed);
      });
    });

    // Random EV arrival button
    document.getElementById('btnSimulateArrival')?.addEventListener('click', () => {
      this.spawnRandomEV();
      sound.playPlugIn();
    });

    // Grid overload simulation button
    document.getElementById('btnSimulateOverload')?.addEventListener('click', () => {
      const current = this.station.configuredLimitKW;
      const throttled = Math.max(20, Math.round(current * 0.65));
      slider.value = throttled;
      if (display) display.textContent = `${throttled} kW`;
      this.loadManager.setPowerLimit(throttled);
      this.loadManager.notifyAlert(
        AlertLevel.CRITICAL,
        `⚡ SIMULATED GRID CURTAILMENT: Transformer limit dropped to ${throttled} kW. Smart dynamic load shedding triggered!`
      );
    });

    // Sound toggle button
    document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      const icon = document.getElementById('soundIcon');
      if (sound.enabled) {
        icon.setAttribute('data-lucide', 'volume-2');
        sound.playSuccess();
      } else {
        icon.setAttribute('data-lucide', 'volume-x');
      }
      lucide.createIcons();
    });

    // Modals
    document.getElementById('btnOpenBookingModal')?.addEventListener('click', () => {
      this.openBookingModal();
    });
    document.getElementById('btnCloseBookingModal')?.addEventListener('click', () => {
      document.getElementById('bookingModal').classList.add('hidden');
    });

    document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitBookingForm();
    });

    // CSV Export
    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      this.exportSessionsCSV();
    });

    // Architecture drawer toggle
    document.getElementById('btnOpenUMLModal')?.addEventListener('click', () => {
      document.getElementById('umlModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseUMLModal')?.addEventListener('click', () => {
      document.getElementById('umlModal').classList.add('hidden');
    });
  }

  spawnRandomEV() {
    const carTemplate = RANDOM_CARS[Math.floor(Math.random() * RANDOM_CARS.length)];
    const ownerName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const userId = 'U' + Math.floor(200 + Math.random() * 800);
    const startSOC = Math.floor(15 + Math.random() * 40); // 15% to 55%
    const targetSOC = Math.min(100, startSOC + Math.floor(30 + Math.random() * 35));
    const randomPlate = `MH-01-${String.fromCharCode(65 + Math.floor(Math.random()*26))}${String.fromCharCode(65 + Math.floor(Math.random()*26))}-${Math.floor(1000 + Math.random()*9000)}`;

    const newUser = new EVUser(
      userId,
      ownerName,
      `${carTemplate.model} (${randomPlate})`,
      '+91 9' + Math.floor(100000000 + Math.random() * 900000000),
      startSOC,
      carTemplate.capacity
    );

    this.loadManager.registerUser(newUser);

    const reqId = 'REQ-' + Math.floor(300 + Math.random() * 700);
    const req = new ChargingRequest(
      reqId,
      userId,
      this.station.stationId,
      carTemplate.rated,
      targetSOC,
      Math.random() > 0.7
    );

    const result = this.loadManager.processChargingRequest(req);
    this.render();
    return result;
  }

  openBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const select = document.getElementById('modalUserSelect');
    if (select) {
      select.innerHTML = Array.from(this.loadManager.users.values()).map(u => 
        `<option value="${u.userId}">${u.name} — ${u.vehicleInfo} (${u.currentSOC}% SOC)</option>`
      ).join('');
    }
  }

  submitBookingForm() {
    const userId = document.getElementById('modalUserSelect').value;
    const requestedKW = parseFloat(document.getElementById('modalPowerInput').value);
    const targetSOC = parseInt(document.getElementById('modalTargetSOC').value);
    const isPriority = document.getElementById('modalPriorityCheck').checked;

    const reqId = 'REQ-' + Math.floor(500 + Math.random() * 500);
    const req = new ChargingRequest(reqId, userId, this.station.stationId, requestedKW, targetSOC, isPriority);

    const res = this.loadManager.processChargingRequest(req);
    document.getElementById('bookingModal').classList.add('hidden');
    sound.playPlugIn();
    this.render();
  }

  exportSessionsCSV() {
    const all = [...this.loadManager.activeSessions.values(), ...this.loadManager.completedSessions];
    if (all.length === 0) {
      alert('No charging sessions recorded yet.');
      return;
    }

    let csv = 'Session ID,Request ID,User Name,Vehicle,Point,Start Time,End Time,Energy (kWh),Peak Power (kW),Cost (INR),Status\n';
    all.forEach(s => {
      const user = this.loadManager.getUser(s.userId);
      csv += `"${s.sessionId}","${s.requestId}","${user ? user.name : 'Unknown'}","${user ? user.vehicleInfo : 'EV'}","${s.pointId}","${new Date(s.startTime).toLocaleTimeString()}","${s.endTime ? new Date(s.endTime).toLocaleTimeString() : 'In Progress'}","${s.energyUsedKWh}","${s.peakPowerKW}","₹${s.getCost()}","${s.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `EV_Sessions_${this.station.stationId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  render() {
    this.renderHeader();
    this.renderKPIs();
    this.renderBays();
    this.renderAlerts();
    this.renderRoleViews();
    this.renderSessionsTable();
    this.renderQueue();

    // Re-bind Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  renderHeader() {
    const nameEl = document.getElementById('stationNameDisplay');
    const locationEl = document.getElementById('stationLocationDisplay');
    const statusDot = document.getElementById('stationStatusDot');
    const gridFreq = document.getElementById('gridFrequencyDisplay');

    if (nameEl) nameEl.textContent = this.station.name;
    if (locationEl) locationEl.textContent = this.station.location;

    // Load ratio calculation
    const ratio = this.station.currentLoadKW / this.station.configuredLimitKW;
    if (statusDot) {
      if (ratio > 0.9) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping';
      } else if (ratio > 0.75) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
      } else {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
      }
    }
  }

  renderKPIs() {
    // 1. Current Load / Limit
    const loadVal = document.getElementById('kpiCurrentLoad');
    const loadLimit = document.getElementById('kpiLoadLimit');
    const loadBar = document.getElementById('kpiLoadBar');
    const loadPercent = document.getElementById('kpiLoadPercent');

    const pct = Math.min(100, Math.round((this.station.currentLoadKW / this.station.configuredLimitKW) * 100));

    if (loadVal) loadVal.textContent = `${this.station.currentLoadKW.toFixed(1)} kW`;
    if (loadLimit) loadLimit.textContent = `/ ${this.station.configuredLimitKW} kW`;
    if (loadPercent) loadPercent.textContent = `${pct}% utilized`;
    if (loadBar) {
      loadBar.style.width = `${pct}%`;
      if (pct > 90) {
        loadBar.className = 'h-2 rounded-full bg-rose-500 transition-all duration-500';
      } else if (pct > 75) {
        loadBar.className = 'h-2 rounded-full bg-amber-400 transition-all duration-500';
      } else {
        loadBar.className = 'h-2 rounded-full bg-emerald-400 transition-all duration-500';
      }
    }

    // 2. Available Bays
    const activeBays = this.station.points.filter(p => p.status === PointStatus.OCCUPIED).length;
    const totalBays = this.station.points.length;
    const bayEl = document.getElementById('kpiBayOccupancy');
    const baySub = document.getElementById('kpiBaySubtext');
    if (bayEl) bayEl.textContent = `${activeBays} / ${totalBays}`;
    if (baySub) baySub.textContent = `${totalBays - activeBays} bays available`;

    // 3. Total Energy Delivered Today
    const activeEnergy = Array.from(this.loadManager.activeSessions.values()).reduce((sum, s) => sum + s.energyUsedKWh, 0);
    const pastEnergy = this.loadManager.completedSessions.reduce((sum, s) => sum + s.energyUsedKWh, 0);
    const totalKWh = (activeEnergy + pastEnergy + 384.2).toFixed(1); // seed + runtime
    const energyEl = document.getElementById('kpiTotalEnergy');
    if (energyEl) energyEl.textContent = `${totalKWh} kWh`;

    // 4. Revenue & Grid Stability
    const revenueEl = document.getElementById('kpiTotalRevenue');
    if (revenueEl) {
      const revenue = Math.round(parseFloat(totalKWh) * this.station.tariffRate);
      revenueEl.textContent = `₹${revenue.toLocaleString()}`;
    }
  }

  renderBays() {
    const grid = document.getElementById('chargingBaysGrid');
    if (!grid) return;

    grid.innerHTML = this.station.points.map(point => {
      const isOccupied = point.status === PointStatus.OCCUPIED;
      const isMaint = point.status === PointStatus.MAINTENANCE;
      const session = isOccupied ? this.loadManager.activeSessions.get(point.currentSessionId) : null;
      const user = session ? this.loadManager.getUser(session.userId) : null;

      let statusBadge = '';
      let borderGlow = '';
      if (isMaint) {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Maintenance</span>`;
        borderGlow = 'border-rose-500/30';
      } else if (isOccupied) {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Charging</span>`;
        borderGlow = 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
      } else {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Available</span>`;
        borderGlow = 'border-slate-800 hover:border-cyan-500/30';
      }

      // SOC Calculation
      const soc = session ? Math.round(session.currentSOC) : 0;
      const circumference = 2 * Math.PI * 38; // r = 38
      const strokeDashoffset = circumference - (soc / 100) * circumference;

      return `
        <div class="glass-card relative p-5 flex flex-col justify-between overflow-hidden border ${borderGlow}">
          <!-- Top Row: Bay ID & Connector -->
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl font-bold tracking-tight text-white mono">${point.pointId}</span>
                <span class="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">${point.connectorType}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Rated: <strong class="text-slate-300">${point.ratedPower} kW</strong></p>
            </div>
            ${statusBadge}
          </div>

          <!-- Middle Row: Interactive EV or Available State -->
          ${isOccupied && session && user ? `
            <div class="my-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div class="flex items-center gap-3">
                <!-- Circular SOC Ring -->
                <div class="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
                  <svg class="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#1e293b" stroke-width="5" fill="transparent" />
                    <circle cx="32" cy="32" r="28" stroke="#10b981" stroke-width="5" fill="transparent"
                      stroke-dasharray="175.9"
                      stroke-dashoffset="${175.9 - (soc / 100) * 175.9}"
                      stroke-linecap="round"
                      class="transition-all duration-700 ease-out" />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span class="text-xs font-bold text-white mono">${soc}%</span>
                    <span class="text-[9px] text-slate-400 uppercase">SOC</span>
                  </div>
                </div>

                <!-- Car & User Metadata -->
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-semibold text-slate-100 truncate">${user.vehicleInfo}</h4>
                  <p class="text-xs text-slate-400 truncate mt-0.5">${user.name}</p>
                  
                  <div class="mt-2 flex items-center gap-2">
                    <span class="text-xs mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ⚡ ${session.currentPowerKW} kW
                    </span>
                    <span class="text-xs text-slate-400 mono">
                      ${session.energyUsedKWh.toFixed(2)} kWh
                    </span>
                  </div>
                </div>
              </div>

              <!-- Real-time Progress Bar to Target -->
              <div class="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>Target: <strong class="text-slate-200">${session.targetSOC}%</strong></span>
                <span>Cost: <strong class="text-slate-200">₹${session.getCost()}</strong></span>
              </div>
            </div>
          ` : `
            <div class="my-5 flex flex-col items-center justify-center text-center py-6 border border-dashed border-slate-800/80 rounded-xl bg-slate-900/30">
              <i data-lucide="${isMaint ? 'wrench' : 'zap'}" class="w-8 h-8 ${isMaint ? 'text-rose-400' : 'text-slate-600'} mb-2"></i>
              <p class="text-sm font-medium ${isMaint ? 'text-rose-300' : 'text-slate-300'}">
                ${isMaint ? 'Bay Out of Order' : 'Bay Ready for Connection'}
              </p>
              <p class="text-xs text-slate-500 mt-1 max-w-[180px]">
                ${isMaint ? 'Scheduled technician inspection in progress' : 'Plug in vehicle or reserve slot via user portal'}
              </p>
            </div>
          `}

          <!-- Bottom Actions -->
          <div class="mt-2 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            ${isOccupied ? `
              <button onclick="window.dashboard.stopSession('${session.sessionId}')" 
                class="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center justify-center gap-1">
                <i data-lucide="square" class="w-3.5 h-3.5"></i> Stop Charge
              </button>
              <button onclick="window.dashboard.showSessionDetails('${session.sessionId}')" 
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all">
                Details
              </button>
            ` : `
              <button onclick="window.dashboard.quickConnectBay('${point.pointId}')" 
                ${isMaint ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}
                class="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="plug-zap" class="w-3.5 h-3.5"></i> Plug Vehicle
              </button>
              <button onclick="window.dashboard.toggleMaintenance('${point.pointId}')" 
                data-tooltip="${isMaint ? 'Restore Service' : 'Flag Maintenance'}"
                class="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all">
                <i data-lucide="${isMaint ? 'check' : 'wrench'}" class="w-3.5 h-3.5"></i>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  renderAlerts() {
    const feed = document.getElementById('alertsFeed');
    const badgeCount = document.getElementById('alertCountBadge');
    if (!feed) return;

    if (badgeCount) badgeCount.textContent = this.loadManager.alerts.length;

    if (this.loadManager.alerts.length === 0) {
      feed.innerHTML = `<div class="p-4 text-center text-xs text-slate-500">No active alerts. Grid operating within optimal limits.</div>`;
      return;
    }

    feed.innerHTML = this.loadManager.alerts.slice(0, 10).map(alert => {
      let icon = 'info';
      let colorClass = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      if (alert.level === AlertLevel.WARNING) {
        icon = 'alert-triangle';
        colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      } else if (alert.level === AlertLevel.CRITICAL) {
        icon = 'alert-octagon';
        colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      }

      return `
        <div class="p-3 rounded-lg border ${colorClass} text-xs flex items-start gap-2.5 mb-2 transition-all">
          <i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
          <div class="flex-1">
            <p class="font-medium text-slate-200 leading-snug">${alert.message}</p>
            <span class="text-[10px] text-slate-500 mt-1 block">${new Date(alert.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderQueue() {
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCountBadge');
    if (!queueList) return;

    const queued = this.loadManager.requests.filter(r => r.status === RequestStatus.QUEUED);
    if (queueCount) queueCount.textContent = queued.length;

    if (queued.length === 0) {
      queueList.innerHTML = `<div class="p-3 text-center text-xs text-slate-500">No vehicles queued. Charging bays available immediately.</div>`;
      return;
    }

    queueList.innerHTML = queued.map((req, idx) => {
      const user = this.loadManager.getUser(req.userId);
      return `
        <div class="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">#${idx+1}</span>
            <div>
              <p class="font-medium text-slate-200">${user ? user.vehicleInfo : 'EV'}</p>
              <p class="text-[10px] text-slate-400">${user ? user.name : 'User'} • Target ${req.targetSOC}%</p>
            </div>
          </div>
          <span class="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Waiting Slot</span>
        </div>
      `;
    }).join('');
  }

  renderRoleViews() {
    const managerPanel = document.getElementById('stationManagerControls');
    const userPanel = document.getElementById('evUserPanel');
    const gridPanel = document.getElementById('gridManagerPanel');

    if (managerPanel) managerPanel.classList.toggle('hidden', this.currentRole !== 'MANAGER');
    if (userPanel) userPanel.classList.toggle('hidden', this.currentRole !== 'USER');
    if (gridPanel) gridPanel.classList.toggle('hidden', this.currentRole !== 'GRID');

    if (this.currentRole === 'USER') {
      this.renderUserPortal();
    }
  }

  renderUserPortal() {
    const userContainer = document.getElementById('userPortalContent');
    if (!userContainer) return;

    // Pick active user or default
    const user = this.loadManager.getUser(this.selectedEVUserId) || SEED_USERS[0];
    const activeSession = Array.from(this.loadManager.activeSessions.values()).find(s => s.userId === user.userId);

    userContainer.innerHTML = `
      <div class="glass-panel p-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              ${user.name.split(' ').map(n=>n[0]).join('')}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-white">${user.name}</h3>
                <span class="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">ID: ${user.userId}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">${user.vehicleInfo} • ${user.contact}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <select id="userSelectorDropdown" onchange="window.dashboard.changeUserView(this.value)" class="text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2">
              ${Array.from(this.loadManager.users.values()).map(u => 
                `<option value="${u.userId}" ${u.userId === user.userId ? 'selected' : ''}>Switch to: ${u.name}</option>`
              ).join('')}
            </select>
            <button onclick="window.dashboard.openBookingModal()" class="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all flex items-center gap-1.5">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> New Request
            </button>
          </div>
        </div>

        <!-- Active Charge Card for this User -->
        <div class="mt-6">
          ${activeSession ? `
            <div class="p-5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border border-emerald-500/30">
              <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                <div class="flex items-center gap-5">
                  <div class="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                    <svg class="w-24 h-24 -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#1e293b" stroke-width="6" fill="transparent" />
                      <circle cx="48" cy="48" r="40" stroke="#10b981" stroke-width="6" fill="transparent"
                        stroke-dasharray="251.2"
                        stroke-dashoffset="${251.2 - (activeSession.currentSOC / 100) * 251.2}"
                        stroke-linecap="round"
                        class="transition-all duration-700" />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                      <span class="text-base font-bold text-white mono">${Math.round(activeSession.currentSOC)}%</span>
                      <span class="text-[9px] text-emerald-400 font-semibold uppercase">CHARGING</span>
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Bay ${activeSession.pointId}</span>
                      <span class="text-xs text-slate-400">Session ID: ${activeSession.sessionId}</span>
                    </div>
                    <h4 class="text-base font-bold text-white mt-1">Charging in Progress at ${activeSession.currentPowerKW} kW</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Energy Delivered: <strong class="text-slate-200">${activeSession.energyUsedKWh.toFixed(2)} kWh</strong> (Target: ${activeSession.targetSOC}%)</p>
                  </div>
                </div>

                <div class="text-right">
                  <span class="text-xs text-slate-400">Estimated Total Cost</span>
                  <div class="text-2xl font-black text-emerald-400 mono">₹${activeSession.getCost()}</div>
                  <button onclick="window.dashboard.stopSession('${activeSession.sessionId}')" class="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40">
                    Unplug & Settle Bill
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <div class="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              <i data-lucide="battery-charging" class="w-10 h-10 text-slate-600 mx-auto mb-2"></i>
              <h4 class="text-sm font-semibold text-slate-300">No Active Charging Session</h4>
              <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Your vehicle is currently not plugged in. Click below to submit a charging request.</p>
              <button onclick="window.dashboard.openBookingModal()" class="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all">
                Book a Charging Slot
              </button>
            </div>
          `}
        </div>
      </div>
    `;
    lucide.createIcons();
  }

  changeUserView(userId) {
    this.selectedEVUserId = userId;
    this.renderUserPortal();
  }

  renderSessionsTable() {
    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;

    const all = [...this.loadManager.activeSessions.values(), ...this.loadManager.completedSessions];

    if (all.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-xs text-slate-500">No session history yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = all.slice(0, 15).map(s => {
      const user = this.loadManager.getUser(s.userId);
      const isActive = s.status === 'ACTIVE';

      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-900/40 text-xs">
          <td class="p-3 mono font-medium text-slate-300">${s.sessionId}</td>
          <td class="p-3">
            <span class="font-semibold text-slate-200">${user ? user.name : 'Unknown'}</span>
            <span class="block text-[11px] text-slate-500">${user ? user.vehicleInfo : 'EV'}</span>
          </td>
          <td class="p-3 mono text-slate-300 font-semibold">${s.pointId}</td>
          <td class="p-3 text-slate-400">${new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
          <td class="p-3 mono font-bold text-emerald-400">${s.energyUsedKWh.toFixed(2)} kWh</td>
          <td class="p-3 mono text-slate-300">${s.peakPowerKW} kW</td>
          <td class="p-3 mono font-semibold text-slate-200">₹${s.getCost()}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}">
              ${s.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  quickConnectBay(pointId) {
    this.spawnRandomEV();
  }

  stopSession(sessionId) {
    this.loadManager.stopSession(sessionId, 'COMPLETED');
    sound.playSuccess();
    this.render();
  }

  toggleMaintenance(pointId) {
    this.loadManager.toggleBayMaintenance(pointId);
  }

  showSessionDetails(sessionId) {
    const session = this.loadManager.activeSessions.get(sessionId) || 
      this.loadManager.completedSessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    const user = this.loadManager.getUser(session.userId);
    alert(
      `SESSION DETAILS: ${session.sessionId}\n\n` +
      `User: ${user ? user.name : 'N/A'}\n` +
      `Vehicle: ${user ? user.vehicleInfo : 'N/A'}\n` +
      `Charging Bay: ${session.pointId}\n` +
      `Current SOC: ${session.currentSOC}%\n` +
      `Energy Delivered: ${session.energyUsedKWh.toFixed(2)} kWh\n` +
      `Power Draw: ${session.currentPowerKW} kW\n` +
      `Estimated Cost: ₹${session.getCost()}\n` +
      `Started At: ${new Date(session.startTime).toLocaleTimeString()}`
    );
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new DashboardApp();
});
