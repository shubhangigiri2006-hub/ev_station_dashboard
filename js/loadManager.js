import { 
  RequestStatus, 
  PointStatus, 
  AlertLevel, 
  Alert, 
  ScheduleAllocation, 
  ChargingSession 
} from './models.js';

export class LoadManager {
  constructor(station, onAlertCallback = null, onStateChange = null) {
    this.station = station;
    this.onAlert = onAlertCallback;
    this.onStateChange = onStateChange;
    this.requests = [];
    this.allocations = [];
    this.activeSessions = new Map(); // sessionId -> ChargingSession
    this.completedSessions = [];
    this.alerts = [];
    this.users = new Map(); // userId -> EVUser
    this.minimumChargingKW = 6.0; // Min AC/DC charge rate allowed
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

    // Rebalance existing sessions if active load exceeds new limit
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

  /**
   * Flow according to Experiment 07 State-Chart & Experiment 08 Sequence Diagram
   */
  processChargingRequest(request) {
    request.status = RequestStatus.UNDER_VALIDATION;
    this.requests.unshift(request);

    // 1. Validation check
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
      this.notifyAlert(AlertLevel.WARNING, `Request ${request.requestId} rejected: Invalid charge target.`);
      return { success: false, status: request.status, message: request.rejectionReason };
    }

    // 2. Check station charging bay availability
    const availablePoint = this.station.points.find(p => p.status === PointStatus.AVAILABLE);

    if (!availablePoint) {
      // All bays occupied -> Queue request
      request.status = RequestStatus.QUEUED;
      request.scheduledTime = new Date(Date.now() + 15 * 60000); // estimated 15 mins later
      this.notifyAlert(
        AlertLevel.WARNING,
        `All bays occupied. Request ${request.requestId} (${user.name}) queued for later slot.`
      );
      return { 
        success: true, 
        status: request.status, 
        message: 'All bays currently busy. Placed in priority queue.' 
      };
    }

    // 3. Check Available Capacity
    const availableLoad = this.calculateAvailableLoad();
    const canFitDirectly = availableLoad >= Math.min(request.expectedLoad, availablePoint.ratedPower);

    if (canFitDirectly) {
      return this.allocateAndStart(request, availablePoint, Math.min(request.expectedLoad, availablePoint.ratedPower));
    } else {
      // Capacity constraint triggered! Check if Dynamic Load Balancing can accommodate
      const activeCount = this.activeSessions.size;
      const potentialShare = this.station.configuredLimitKW / (activeCount + 1);

      if (potentialShare >= this.minimumChargingKW) {
        // Can dynamically balance!
        this.notifyAlert(
          AlertLevel.INFO,
          `Dynamic Load Balancing activated: Sharing ${this.station.configuredLimitKW} kW across ${activeCount + 1} vehicles.`
        );
        return this.allocateAndStart(request, availablePoint, potentialShare);
      } else {
        // Capacity strictly exceeded -> Queue/Schedule later slot (FR-05)
        request.status = RequestStatus.QUEUED;
        request.scheduledTime = new Date(Date.now() + 20 * 60000);
        this.notifyAlert(
          AlertLevel.WARNING,
          `Grid capacity reached (${this.station.currentLoadKW}/${this.station.configuredLimitKW} kW). Request ${request.requestId} queued.`
        );
        return { 
          success: true, 
          status: request.status, 
          message: 'Grid capacity full. Request scheduled for next available slot.' 
        };
      }
    }
  }

  allocateAndStart(request, point, initialPowerKW) {
    const user = this.getUser(request.userId);
    request.status = RequestStatus.APPROVED;

    // Create ScheduleAllocation (ERD Entity)
    const allocationId = 'ALC-' + Math.floor(1000 + Math.random() * 9000);
    const allocation = new ScheduleAllocation(
      allocationId, 
      request.requestId, 
      this.station.stationId, 
      point.pointId, 
      initialPowerKW
    );
    this.allocations.push(allocation);

    // Create ChargingSession
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

    // Mark point as occupied
    point.status = PointStatus.OCCUPIED;
    point.currentSessionId = sessionId;
    point.currentRequestId = request.requestId;
    point.allocatedPower = session.currentPowerKW;

    request.status = RequestStatus.CHARGING;
    this.activeSessions.set(sessionId, session);

    this.rebalancePower();

    this.notifyAlert(
      AlertLevel.INFO,
      `Session ${sessionId} started for ${user.name} (${user.vehicleInfo}) on Bay ${point.pointId} at ${session.currentPowerKW} kW.`
    );

    if (this.onStateChange) this.onStateChange();
    return { success: true, status: request.status, sessionId, pointId: point.pointId };
  }

  /**
   * Dynamic Load Balancing (DLB) Engine
   */
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
      // Prioritize low battery (< 30%) and VIP priority requests
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

    // Check if total exceeds limit -> trigger overload alarm
    const newTotal = sessions.reduce((sum, s) => sum + s.currentPowerKW, 0);
    this.station.currentLoadKW = parseFloat(newTotal.toFixed(2));

    if (this.station.currentLoadKW >= this.station.configuredLimitKW * 0.95) {
      this.notifyAlert(
        AlertLevel.CRITICAL,
        `⚠️ High Load Alert: Station at ${this.station.currentLoadKW} kW (${Math.round((this.station.currentLoadKW/this.station.configuredLimitKW)*100)}% capacity). Dynamic throttle applied.`
      );
    }
  }

  /**
   * Simulation Tick (advances state, charges battery, checks completion)
   * deltaSeconds: simulated elapsed time in seconds
   */
  tickSimulation(deltaSeconds = 5) {
    const completedList = [];

    this.activeSessions.forEach(session => {
      if (session.currentPowerKW <= 0) return;

      // Energy delivered: kW * hours
      const hours = deltaSeconds / 3600;
      const energyIncrementKWh = session.currentPowerKW * hours;
      session.energyUsedKWh = parseFloat((session.energyUsedKWh + energyIncrementKWh).toFixed(3));
      session.peakPowerKW = Math.max(session.peakPowerKW, session.currentPowerKW);

      // Battery SOC update: (energyIncrement / capacity) * 100
      const socIncrement = (energyIncrementKWh / session.batteryCapacityKWh) * 100;
      session.currentSOC = Math.min(100, parseFloat((session.currentSOC + socIncrement).toFixed(1)));

      // Sync back to user object
      const user = this.getUser(session.userId);
      if (user) {
        user.currentSOC = session.currentSOC;
      }

      // Check completion criteria
      if (session.currentSOC >= session.targetSOC) {
        completedList.push(session.sessionId);
      }
    });

    // Complete sessions that reached target
    completedList.forEach(sessionId => {
      this.stopSession(sessionId, 'COMPLETED');
    });

    // Process queued requests if bay freed
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

    // Free point
    const point = this.station.points.find(p => p.pointId === session.pointId);
    if (point) {
      point.status = PointStatus.AVAILABLE;
      point.currentSessionId = null;
      point.currentRequestId = null;
      point.allocatedPower = 0;
    }

    // Update request
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
      this.notifyAlert(AlertLevel.WARNING, `Bay ${pointId} flagged for maintenance/inspection.`);
    }
    this.rebalancePower();
    if (this.onStateChange) this.onStateChange();
  }
}
