export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export type DonorRecommendation = {
  id: string
  name: string
  bloodType: BloodType
  phone?: string | null
  distanceMeters: number
  eligible: boolean
  lastDonation?: string | null
  eligibleDate?: string | null
  donationCount?: number | null
  metrics?: {
    alertsTotal: number
    accepts: number
    declines: number
    timeouts: number
    avgResponseSeconds: number | null
    donationsTotalEver: number
    donationsLast12m: number
  }
  score: number
  breakdown: {
    distance: number
    reliability: number
    responsiveness: number
    donationHistory: number
    urgencyBoost: number
  }
}

export type DonorAlertStatus = 'pending'|'accepted'|'declined'|'timeout'|'cancelled'

export type DonorAlert = {
  id: string
  requestId: string
  donorId: string
  creatorId: string
  status: DonorAlertStatus
  notifiedAt: string
  responseAt?: string | null
}
export type Role = 'donor' | 'hospital' | 'blood-bank' | 'ngo'

export interface ProfileSummary {
  id: string
  role: Role
  name: string
  email: string
  phone?: string
  address?: string
  bloodType?: BloodType
  isAvailable?: boolean
  coordinates?: [number, number]
  donationCount?: number
  lastDonation?: string
  eligibleDate?: string
}

export interface InventoryRecord {
  id: string
  bloodBankId: string
  bloodType: BloodType
  quantity: number
  expiryDate: string
  status: 'sufficient' | 'low' | 'critical'
  lastUpdated: string
}

export interface EmergencyRequest {
  id: string
  hospitalId: string
  hospitalName: string
  bloodType: BloodType
  unitsNeeded: number
  urgency: 'critical' | 'urgent' | 'normal'
  status: 'pending' | 'fulfilled' | 'cancelled'
  createdAt: string
  fulfilledAt?: string
  distanceMeters?: number
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'emergency_request' | 'inventory_alert' | 'reminder' | 'status_update'
  read: boolean
  createdAt: string
}

export interface DonationHistoryItem {
  id: string
  donorId: string
  bloodBankId: string
  bloodBankName: string
  donationDate: string
  unitsContributed: number
  certificateUrl?: string
}

export interface BloodCamp {
  id: string
  name: string
  description?: string
  address: string
  coordinates: [number, number]
  startDate: string
  endDate: string
  organizerName: string
  bannerUrl?: string
  contactPhone?: string
  contactEmail?: string
  capacityTarget?: number
  registeredCount?: number
  status?: 'planned' | 'ongoing' | 'completed' | 'cancelled'
}

export interface ImpactSnapshot {
  totalLivesSaved: number
  activeDonors: number
  unitsDonated: number
  emergencyFulfillmentRate: number
}
