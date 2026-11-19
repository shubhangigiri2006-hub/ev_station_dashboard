/**
 * Models according to Experiment-04 (ERD) & Experiment-06 (Class & Object Diagrams)
 */

export const RequestStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_VALIDATION: 'UNDER_VALIDATION',
  APPROVED: 'APPROVED',
  QUEUED: 'QUEUED',
  CHARGING: 'CHARGING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
};

export const PointStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE'
};

export const AlertLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

export class EVUser {
  constructor(userId, name, vehicleInfo, contact, currentSOC = 25, batteryCapacityKWh = 40) {
    this.userId = userId;
    this.name = name;
    this.vehicleInfo = vehicleInfo;
    this.contact = contact;
    this.currentSOC = currentSOC; // Battery State of Charge %
    this.batteryCapacityKWh = batteryCapacityKWh;
  }
}

export class ChargingPoint {
  constructor(pointId, stationId, ratedPower, connectorType = 'CCS-2 Type 2') {
    this.pointId = pointId;
    this.stationId = stationId;
    this.ratedPower = ratedPower; // kW (e.g. 22kW, 30kW, 60kW)
    this.connectorType = connectorType;
    this.status = PointStatus.AVAILABLE;
    this.currentSessionId = null;
    this.currentRequestId = null;
    this.allocatedPower = 0; // kW currently allocated by LoadManager
  }
}

export class ChargingRequest {
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

export class ScheduleAllocation {
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

export class ChargingSession {
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
    this.tariffRatePerKWh = 12.50; // INR or currency units
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

export class Alert {
  constructor(alertId, level, message, details = {}) {
    this.alertId = alertId;
    this.level = level;
    this.message = message;
    this.timestamp = new Date();
    this.details = details;
    this.acknowledged = false;
  }
}

export class Station {
  constructor(stationId, name, location, maxCapacityKW, tariffRate = 12.50) {
    this.stationId = stationId;
    this.name = name;
    this.location = location;
    this.maxCapacityKW = maxCapacityKW; // e.g. 60 kW as in Object Diagram
    this.configuredLimitKW = maxCapacityKW; // operator can dial down limit
    this.currentLoadKW = 0;
    this.status = 'Active';
    this.tariffRate = tariffRate;
    this.points = [];
    this.balancingStrategy = 'EQUAL_SHARE'; // 'EQUAL_SHARE', 'FCFS', 'PRIORITY', 'PEAK_SHAVING'
  }
}
