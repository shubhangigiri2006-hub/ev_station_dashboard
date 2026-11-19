/**
 * ElectroHub Unified Application Bundle
 * Enables zero-setup instant execution via both file:// and http:// protocols
 * Fully compliant with Experiments 01 to 10
 */

// ================= CONSTANTS & ENUMS (Exp 04 & 07) =================
const RequestStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_VALIDATION: 'UNDER_VALIDATION',
  APPROVED: 'APPROVED',
  QUEUED: 'QUEUED',
  CHARGING: 'CHARGING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
};

const PointStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE'
};

const AlertLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

// ================= DATA MODELS (Exp 04 ERD & Exp 06 Class Diagram) =================
class EVUser {
  constructor(userId, name, vehicleInfo, contact, currentSOC = 25, batteryCapacityKWh = 40) {
    this.userId = userId;
    this.name = name;
    this.vehicleInfo = vehicleInfo;
    this.contact = contact;
    this.currentSOC = currentSOC; // Battery State of Charge %
    this.batteryCapacityKWh = batteryCapacityKWh;
  }
}

class ChargingPoint {
  constructor(pointId, stationId, ratedPower, connectorType = 'CCS-2 Type 2') {
    this.pointId = pointId;
    this.stationId = stationId;
    this.ratedPower = ratedPower; // kW
    this.connectorType = connectorType;
    this.status = PointStatus.AVAILABLE;
    this.currentSessionId = null;
    this.currentRequestId = null;
    this.allocatedPower = 0; // kW currently allocated by LoadManager
  }
}

class ChargingRequest {
  constructor(requestId, userId, stationId, expectedLoad, targetSOC = 85, isPriority = false) {
    this.requestId = requestId;
    this.userId = userId;
    this.stationId = stationId;
    this.expectedLoad = expectedLoad; // Requested kW
    this.targetSOC = targetSOC;
    this.isPriority = isPriority;
    this.status = RequestStatus.SUBMITTED;
    this.createdAt = new Date();
    this.scheduledTime = null;
    this.rejectionReason = null;
  }
}

class ScheduleAllocation {
  constructor(allocationId, requestId, stationId, pointId, allocatedPower, scheduledTime = new Date()) {
    this.allocationId = allocationId;
    this.requestId = requestId;
    this.stationId = stationId;
    this.pointId = pointId;
    this.allocatedPower = allocatedPower; // in kW
    this.scheduledTime = scheduledTime;
    this.active = true;
  }
}

class ChargingSession {
  constructor(sessionId, requestId, userId, stationId, pointId, initialSOC, targetSOC, batteryCapacityKWh) {
    this.sessionId = sessionId;
    this.requestId = requestId;
    this.userId = userId;
    this.stationId = stationId;
    this.pointId = pointId;
    this.startTime = new Date();
    this.endTime = null;
    this.initialSOC = initialSOC;
    this.currentSOC = initialSOC;
    this.targetSOC = targetSOC;
    this.batteryCapacityKWh = batteryCapacityKWh;
    this.currentPowerKW = 0;
    this.energyUsedKWh = 0; // Energy delivered so far
    this.peakPowerKW = 0;
    this.tariffRatePerKWh = 12.50; // INR
    this.status = 'ACTIVE';
  }

  getCost() {
    return (this.energyUsedKWh * this.tariffRatePerKWh).toFixed(2);
  }

  getDurationMinutes() {
    const end = this.endTime ? new Date(this.endTime) : new Date();
    return Math.max(1, Math.round((end - new Date(this.startTime)) / 60000));
  }
}

class Alert {
  constructor(alertId, level, message, details = {}) {
    this.alertId = alertId;
    this.level = level;
    this.message = message;
    this.timestamp = new Date();
    this.details = details;
    this.acknowledged = false;
  }
}

class Station {
  constructor(stationId, name, location, maxCapacityKW, tariffRate = 12.50) {
    this.stationId = stationId;
    this.name = name;
    this.location = location;
    this.maxCapacityKW = maxCapacityKW;
    this.configuredLimitKW = maxCapacityKW;
    this.currentLoadKW = 0;
    this.status = 'Active';
    this.tariffRate = tariffRate;
    this.points = [];
    this.balancingStrategy = 'EQUAL_SHARE'; // 'EQUAL_SHARE', 'PRIORITY', 'FCFS'
  }
}

// ================= SYNTHESIZED SOUND ENGINE (Web Audio API) =================
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playPlugIn() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  playAlert() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.1);
      osc.frequency.setValueAtTime(440, now + 0.2);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const t = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.25);
      });
    } catch (e) {}
  }
}

const sound = new SoundEngine();

// ================= LOAD MANAGER (Exp 01, 02 FR-04, 07 State Machine) =================
class LoadManager {
  constructor(station, onAlertCallback = null, onStateChange = null) {
    this.station = station;
    this.onAlert = onAlertCallback;
    this.onStateChange = onStateChange;
    this.requests = [];
    this.allocations = [];
    this.activeSessions = new Map();
    this.completedSessions = [];
    this.alerts = [];
    this.users = new Map();
    this.minimumChargingKW = 6.0;
  }

  registerUser(user) {
    this.users.set(user.userId, user);
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  calculateAvailableLoad() {
    const totalAllocated = Array.from(this.activeSessions.values()).reduce(
      (sum, s) => sum + s.currentPowerKW, 0
    );
    this.station.currentLoadKW = parseFloat(totalAllocated.toFixed(2));
    const available = Math.max(0, this.station.configuredLimitKW - this.station.currentLoadKW);
    return parseFloat(available.toFixed(2));
  }

  setPowerLimit(newLimitKW) {
    const oldLimit = this.station.configuredLimitKW;
    this.station.configuredLimitKW = Math.max(10, Math.min(this.station.maxCapacityKW, newLimitKW));
    
    this.notifyAlert(
      AlertLevel.INFO,
      `Station power limit adjusted from ${oldLimit} kW to ${this.station.configuredLimitKW} kW.`
    );

    this.rebalancePower();
    if (this.onStateChange) this.onStateChange();
  }

  setBalancingStrategy(strategy) {
    this.station.balancingStrategy = strategy;
    this.notifyAlert(
      AlertLevel.INFO,
      `Load Balancing algorithm switched to "${strategy}".`
    );
    this.rebalancePower();
    if (this.onStateChange) this.onStateChange();
  }

  notifyAlert(level, message, details = {}) {
    const alertId = 'ALT-' + Math.floor(1000 + Math.random() * 9000);
    const alert = new Alert(alertId, level, message, details);
    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop();
    if (this.onAlert) this.onAlert(alert);
  }

  processChargingRequest(request) {
    request.status = RequestStatus.UNDER_VALIDATION;
    this.requests.unshift(request);

    const user = this.getUser(request.userId);
    if (!user) {
      request.status = RequestStatus.REJECTED;
      request.rejectionReason = 'Unregistered user profile';
      this.notifyAlert(AlertLevel.WARNING, `Request ${request.requestId} rejected: Invalid user.`);
      return { success: false, status: request.status, message: request.rejectionReason };
    }

    if (request.expectedLoad <= 0 || request.targetSOC <= user.currentSOC) {
      request.status = RequestStatus.REJECTED;
      request.rejectionReason = 'Target battery SOC must be greater than current SOC.';
      this.notifyAlert(AlertLevel.WARNING, `Request ${request.requestId} rejected: Invalid target SOC.`);
      return { success: false, status: request.status, message: request.rejectionReason };
    }

    const availablePoint = this.station.points.find(p => p.status === PointStatus.AVAILABLE);

    if (!availablePoint) {
      request.status = RequestStatus.QUEUED;
      request.scheduledTime = new Date(Date.now() + 15 * 60000);
      this.notifyAlert(
        AlertLevel.WARNING,
        `All bays occupied. Request ${request.requestId} (${user.name}) placed in queue.`
      );
      return { success: true, status: request.status, message: 'All bays currently busy. Placed in priority queue.' };
    }

    const availableLoad = this.calculateAvailableLoad();
    const canFitDirectly = availableLoad >= Math.min(request.expectedLoad, availablePoint.ratedPower);

    if (canFitDirectly) {
      return this.allocateAndStart(request, availablePoint, Math.min(request.expectedLoad, availablePoint.ratedPower));
    } else {
      const activeCount = this.activeSessions.size;
      const potentialShare = this.station.configuredLimitKW / (activeCount + 1);

      if (potentialShare >= this.minimumChargingKW) {
        this.notifyAlert(
          AlertLevel.INFO,
          `Dynamic Load Balancing activated: Sharing ${this.station.configuredLimitKW} kW across ${activeCount + 1} vehicles.`
        );
        return this.allocateAndStart(request, availablePoint, potentialShare);
      } else {
        request.status = RequestStatus.QUEUED;
        request.scheduledTime = new Date(Date.now() + 20 * 60000);
        this.notifyAlert(
          AlertLevel.WARNING,
          `Grid capacity reached (${this.station.currentLoadKW}/${this.station.configuredLimitKW} kW). Request ${request.requestId} queued.`
        );
        return { success: true, status: request.status, message: 'Grid capacity full. Request scheduled for next available slot.' };
      }
    }
  }

  allocateAndStart(request, point, initialPowerKW) {
    const user = this.getUser(request.userId);
    request.status = RequestStatus.APPROVED;

    const allocationId = 'ALC-' + Math.floor(1000 + Math.random() * 9000);
    const allocation = new ScheduleAllocation(
      allocationId, 
      request.requestId, 
      this.station.stationId, 
      point.pointId, 
      initialPowerKW
    );
    this.allocations.push(allocation);

    const sessionId = 'SES-' + Math.floor(10000 + Math.random() * 90000);
    const session = new ChargingSession(
      sessionId,
      request.requestId,
      user.userId,
      this.station.stationId,
      point.pointId,
      user.currentSOC,
      request.targetSOC,
      user.batteryCapacityKWh
    );

    session.currentPowerKW = parseFloat(initialPowerKW.toFixed(2));
    session.peakPowerKW = session.currentPowerKW;
    session.tariffRatePerKWh = this.station.tariffRate;

    point.status = PointStatus.OCCUPIED;
    point.currentSessionId = sessionId;
    point.currentRequestId = request.requestId;
    point.allocatedPower = session.currentPowerKW;

    request.status = RequestStatus.CHARGING;
    this.activeSessions.set(sessionId, session);

    this.rebalancePower();

    this.notifyAlert(
      AlertLevel.INFO,
      `Session ${sessionId} started for ${user.name} on Bay ${point.pointId} at ${session.currentPowerKW} kW.`
    );

    if (this.onStateChange) this.onStateChange();
    return { success: true, status: request.status, sessionId, pointId: point.pointId };
  }

  rebalancePower() {
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) {
      this.station.currentLoadKW = 0;
      return;
    }

    const totalLimit = this.station.configuredLimitKW;

    if (this.station.balancingStrategy === 'EQUAL_SHARE') {
      const share = totalLimit / sessions.length;
      sessions.forEach(s => {
        const point = this.station.points.find(p => p.pointId === s.pointId);
        const req = this.requests.find(r => r.requestId === s.requestId);
        const maxDesired = Math.min(point ? point.ratedPower : 22, req ? req.expectedLoad : 22);
        s.currentPowerKW = parseFloat(Math.min(share, maxDesired).toFixed(2));
        if (point) point.allocatedPower = s.currentPowerKW;
      });
    } else if (this.station.balancingStrategy === 'PRIORITY') {
      let remainingKW = totalLimit;
      const sorted = [...sessions].sort((a, b) => a.currentSOC - b.currentSOC);
      sorted.forEach(s => {
        const point = this.station.points.find(p => p.pointId === s.pointId);
        const maxDesired = point ? point.ratedPower : 22;
        const alloc = Math.min(remainingKW, maxDesired);
        s.currentPowerKW = parseFloat(Math.max(this.minimumChargingKW, alloc).toFixed(2));
        remainingKW = Math.max(0, remainingKW - s.currentPowerKW);
        if (point) point.allocatedPower = s.currentPowerKW;
      });
    } else { // FCFS
      let remainingKW = totalLimit;
      sessions.forEach(s => {
        const point = this.station.points.find(p => p.pointId === s.pointId);
        const maxDesired = point ? point.ratedPower : 22;
        const alloc = Math.min(remainingKW, maxDesired);
        s.currentPowerKW = parseFloat(Math.max(0, alloc).toFixed(2));
        remainingKW = Math.max(0, remainingKW - s.currentPowerKW);
        if (point) point.allocatedPower = s.currentPowerKW;
      });
    }

    const newTotal = sessions.reduce((sum, s) => sum + s.currentPowerKW, 0);
    this.station.currentLoadKW = parseFloat(newTotal.toFixed(2));

    if (this.station.currentLoadKW >= this.station.configuredLimitKW * 0.95) {
      this.notifyAlert(
        AlertLevel.CRITICAL,
        `⚠️ High Load Alert: Station at ${this.station.currentLoadKW} kW (${Math.round((this.station.currentLoadKW/this.station.configuredLimitKW)*100)}% capacity). Dynamic throttle applied.`
      );
    }
  }

  tickSimulation(deltaSeconds = 5) {
    const completedList = [];

    this.activeSessions.forEach(session => {
      if (session.currentPowerKW <= 0) return;

      const hours = deltaSeconds / 3600;
      const energyIncrementKWh = session.currentPowerKW * hours;
      session.energyUsedKWh = parseFloat((session.energyUsedKWh + energyIncrementKWh).toFixed(3));
      session.peakPowerKW = Math.max(session.peakPowerKW, session.currentPowerKW);

      const socIncrement = (energyIncrementKWh / session.batteryCapacityKWh) * 100;
      session.currentSOC = Math.min(100, parseFloat((session.currentSOC + socIncrement).toFixed(1)));

      const user = this.getUser(session.userId);
      if (user) {
        user.currentSOC = session.currentSOC;
      }

      if (session.currentSOC >= session.targetSOC) {
        completedList.push(session.sessionId);
      }
    });

    completedList.forEach(sessionId => {
      this.stopSession(sessionId, 'COMPLETED');
    });

    this.processQueue();
    this.calculateAvailableLoad();
  }

  processQueue() {
    const queuedRequests = this.requests.filter(r => r.status === RequestStatus.QUEUED);
    if (queuedRequests.length === 0) return;

    const freePoint = this.station.points.find(p => p.status === PointStatus.AVAILABLE);
    if (freePoint && this.calculateAvailableLoad() >= this.minimumChargingKW) {
      const nextReq = queuedRequests[0];
      this.notifyAlert(
        AlertLevel.INFO,
        `Queue promotion: Request ${nextReq.requestId} allocated to freed Bay ${freePoint.pointId}.`
      );
      this.allocateAndStart(nextReq, freePoint, Math.min(nextReq.expectedLoad, freePoint.ratedPower));
    }
  }

  stopSession(sessionId, status = 'COMPLETED') {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.status = status;
    session.currentPowerKW = 0;

    const point = this.station.points.find(p => p.pointId === session.pointId);
    if (point) {
      point.status = PointStatus.AVAILABLE;
      point.currentSessionId = null;
      point.currentRequestId = null;
      point.allocatedPower = 0;
    }

    const request = this.requests.find(r => r.requestId === session.requestId);
    if (request) {
      request.status = (status === 'COMPLETED') ? RequestStatus.COMPLETED : RequestStatus.CANCELLED;
    }

    this.completedSessions.unshift(session);
    this.activeSessions.delete(sessionId);

    const user = this.getUser(session.userId);
    this.notifyAlert(
      AlertLevel.INFO,
      `Session ${sessionId} ended (${status}). ${session.energyUsedKWh} kWh delivered to ${user ? user.vehicleInfo : 'EV'}. Total: ₹${session.getCost()}`
    );

    this.rebalancePower();
    this.processQueue();

    if (this.onStateChange) this.onStateChange();
  }

  toggleBayMaintenance(pointId) {
    const point = this.station.points.find(p => p.pointId === pointId);
    if (!point) return;

    if (point.status === PointStatus.MAINTENANCE) {
      point.status = PointStatus.AVAILABLE;
      this.notifyAlert(AlertLevel.INFO, `Bay ${pointId} returned to service.`);
    } else {
      if (point.currentSessionId) {
        this.stopSession(point.currentSessionId, 'CANCELLED');
      }
      point.status = PointStatus.MAINTENANCE;
      this.notifyAlert(AlertLevel.WARNING, `Bay ${pointId} flagged for maintenance.`);
    }
    this.rebalancePower();
    if (this.onStateChange) this.onStateChange();
  }
}

// ================= STATION DATA & SEED INSTANCES =================
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

// Pre-seeded objects from Experiment 06 Object Diagram
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

// ================= UI APPLICATION CONTROLLER =================
class DashboardApp {
  constructor() {
    this.currentRole = 'MANAGER';
    this.selectedStationId = 'S01';
    this.simSpeed = 1;
    this.isSimRunning = true;
    this.chart = null;
    this.timeHistory = [];
    this.loadHistory = [];
    this.capacityHistory = [];
    this.selectedEVUserId = 'U101';

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

    SEED_USERS.forEach(u => this.loadManager.registerUser(u));
    this.seedInitialSessions();
  }

  seedInitialSessions() {
    const req1 = new ChargingRequest('REQ-201', 'U101', this.station.stationId, 22, 85);
    this.loadManager.processChargingRequest(req1);

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
      this.chart.update('none');
    }
  }

  initChart() {
    const canvas = document.getElementById('loadChart');
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext('2d');

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
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } } },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#e2e8f0',
            borderColor: '#334155',
            borderWidth: 1
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: {
            min: 0,
            suggestedMax: this.station.maxCapacityKW * 1.1,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', callback: (val) => `${val} kW` }
          }
        }
      }
    });
  }

  bindEvents() {
    document.getElementById('stationSelect')?.addEventListener('change', (e) => {
      this.selectedStationId = e.target.value;
      this.initStation(this.selectedStationId);
      if (this.chart) {
        this.chart.options.scales.y.suggestedMax = this.station.maxCapacityKW * 1.1;
      }
      this.render();
    });

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

    const slider = document.getElementById('powerLimitSlider');
    const display = document.getElementById('sliderLimitDisplay');
    slider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (display) display.textContent = `${val} kW`;
      this.loadManager.setPowerLimit(val);
    });

    document.getElementById('strategySelect')?.addEventListener('change', (e) => {
      this.loadManager.setBalancingStrategy(e.target.value);
    });

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
      if (window.lucide) lucide.createIcons();
    });

    document.querySelectorAll('.sim-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sim-speed-btn').forEach(b => b.classList.remove('bg-emerald-500', 'text-slate-950'));
        e.currentTarget.classList.add('bg-emerald-500', 'text-slate-950');
        this.simSpeed = parseInt(e.currentTarget.dataset.speed);
      });
    });

    document.getElementById('btnSimulateArrival')?.addEventListener('click', () => {
      this.spawnRandomEV();
      sound.playPlugIn();
    });

    document.getElementById('btnSimulateOverload')?.addEventListener('click', () => {
      const current = this.station.configuredLimitKW;
      const throttled = Math.max(20, Math.round(current * 0.65));
      if (slider) slider.value = throttled;
      if (display) display.textContent = `${throttled} kW`;
      this.loadManager.setPowerLimit(throttled);
      this.loadManager.notifyAlert(
        AlertLevel.CRITICAL,
        `⚡ SIMULATED GRID CURTAILMENT: Capacity dropped to ${throttled} kW. Smart dynamic load shedding triggered!`
      );
    });

    document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      const icon = document.getElementById('soundIcon');
      if (sound.enabled) {
        icon.setAttribute('data-lucide', 'volume-2');
        sound.playSuccess();
      } else {
        icon.setAttribute('data-lucide', 'volume-x');
      }
      if (window.lucide) lucide.createIcons();
    });

    document.getElementById('btnOpenBookingModal')?.addEventListener('click', () => {
      this.openBookingModal();
    });
    document.getElementById('btnCloseBookingModal')?.addEventListener('click', () => {
      document.getElementById('bookingModal')?.classList.add('hidden');
    });

    document.getElementById('bookingForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitBookingForm();
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      this.exportSessionsCSV();
    });

    document.getElementById('btnOpenUMLModal')?.addEventListener('click', () => {
      document.getElementById('umlModal')?.classList.remove('hidden');
    });
    document.getElementById('btnCloseUMLModal')?.addEventListener('click', () => {
      document.getElementById('umlModal')?.classList.add('hidden');
    });
  }

  spawnRandomEV() {
    const carTemplate = RANDOM_CARS[Math.floor(Math.random() * RANDOM_CARS.length)];
    const ownerName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const userId = 'U' + Math.floor(200 + Math.random() * 800);
    const startSOC = Math.floor(15 + Math.random() * 40);
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
    const userId = document.getElementById('modalUserSelect')?.value;
    const requestedKW = parseFloat(document.getElementById('modalPowerInput')?.value || 22);
    const targetSOC = parseInt(document.getElementById('modalTargetSOC')?.value || 85);
    const isPriority = document.getElementById('modalPriorityCheck')?.checked || false;

    const reqId = 'REQ-' + Math.floor(500 + Math.random() * 500);
    const req = new ChargingRequest(reqId, userId, this.station.stationId, requestedKW, targetSOC, isPriority);

    this.loadManager.processChargingRequest(req);
    document.getElementById('bookingModal')?.classList.add('hidden');
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

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  renderHeader() {
    const nameEl = document.getElementById('stationNameDisplay');
    const locationEl = document.getElementById('stationLocationDisplay');
    const statusDot = document.getElementById('stationStatusDot');

    if (nameEl) nameEl.textContent = this.station.name;
    if (locationEl) locationEl.textContent = `${this.station.location} • Real-time Hardware Telemetry`;

    const ratio = this.station.currentLoadKW / this.station.configuredLimitKW;
    if (statusDot) {
      if (ratio > 0.9) {
        statusDot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-ping';
      } else if (ratio > 0.75) {
        statusDot.className = 'w-2 h-2 rounded-full bg-amber-400';
      } else {
        statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      }
    }
  }

  renderKPIs() {
    const loadVal = document.getElementById('kpiCurrentLoad');
    const loadLimit = document.getElementById('kpiLoadLimit');
    const loadBar = document.getElementById('kpiLoadBar');
    const loadPercent = document.getElementById('kpiLoadPercent');

    const pct = Math.min(100, Math.round((this.station.currentLoadKW / this.station.configuredLimitKW) * 100));

    if (loadVal) loadVal.textContent = `${this.station.currentLoadKW.toFixed(1)} kW`;
    if (loadLimit) loadLimit.textContent = `/ ${this.station.configuredLimitKW} kW`;
    if (loadPercent) loadPercent.textContent = `${pct}% capacity`;
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

    const activeBays = this.station.points.filter(p => p.status === PointStatus.OCCUPIED).length;
    const totalBays = this.station.points.length;
    const bayEl = document.getElementById('kpiBayOccupancy');
    const baySub = document.getElementById('kpiBaySubtext');
    if (bayEl) bayEl.textContent = `${activeBays} / ${totalBays}`;
    if (baySub) baySub.textContent = `${totalBays - activeBays} bays available`;

    const activeEnergy = Array.from(this.loadManager.activeSessions.values()).reduce((sum, s) => sum + s.energyUsedKWh, 0);
    const pastEnergy = this.loadManager.completedSessions.reduce((sum, s) => sum + s.energyUsedKWh, 0);
    const totalKWh = (activeEnergy + pastEnergy + 384.2).toFixed(1);
    const energyEl = document.getElementById('kpiTotalEnergy');
    if (energyEl) energyEl.textContent = `${totalKWh} kWh`;

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

      const soc = session ? Math.round(session.currentSOC) : 0;

      return `
        <div class="glass-card relative p-5 flex flex-col justify-between overflow-hidden border ${borderGlow}">
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

          ${isOccupied && session && user ? `
            <div class="my-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div class="flex items-center gap-3">
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
                ${isMaint ? 'Technician maintenance scheduled' : 'Plug in vehicle or reserve slot via user portal'}
              </p>
            </div>
          `}

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
    if (window.lucide) lucide.createIcons();
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
