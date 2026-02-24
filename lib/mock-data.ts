import { addDays, formatISO, subDays } from 'date-fns'
import type {
  BloodCamp,
  DonationHistoryItem,
  EmergencyRequest,
  ImpactSnapshot,
  InventoryRecord,
  NotificationItem,
  ProfileSummary
} from './types'

export const mockProfiles: ProfileSummary[] = [
  {
    id: 'donor-1',
    role: 'donor',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '+91 832 123 4567',
    address: 'Campal, Panaji, Goa',
    bloodType: 'O+',
    isAvailable: true,
    coordinates: [15.4909, 73.8278],
    donationCount: 12,
    lastDonation: formatISO(subDays(new Date(), 120)),
    eligibleDate: formatISO(subDays(new Date(), 30))
  },
  {
    id: 'donor-2',
    role: 'donor',
    name: 'Diya Patel',
    email: 'diya@example.com',
    phone: '+91 832 765 4321',
    address: 'Margao, South Goa',
    bloodType: 'A+',
    isAvailable: false,
    coordinates: [15.2993, 74.1240],
    donationCount: 4,
    lastDonation: formatISO(subDays(new Date(), 50)),
    eligibleDate: formatISO(addDays(new Date(), 40))
  },
  {
    id: 'bank-1',
    role: 'blood-bank',
    name: 'Goa Medical College Blood Bank',
    email: 'info@gmcbloodbank.in',
    phone: '+91 832 245 1234',
    address: 'Bambolim, Goa',
    coordinates: [15.4633, 73.8518]
  },
  {
    id: 'hospital-1',
    role: 'hospital',
    name: 'District Hospital Mapusa',
    email: 'er@mapusahospital.in',
    phone: '+91 832 227 2263',
    address: 'Mapusa, North Goa',
    coordinates: [15.5937, 73.8149]
  }
]

const bloodTypes: InventoryRecord['bloodType'][] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const mockInventory: InventoryRecord[] = bloodTypes.map((bloodType, index) => {
  const quantity = Math.floor(Math.random() * 45) + 6
  let status: InventoryRecord['status'] = 'sufficient'

  if (quantity < 12) {
    status = 'critical'
  } else if (quantity < 25) {
    status = 'low'
  }

  return {
    id: `inventory-${bloodType}`,
    bloodBankId: 'bank-1',
    bloodType,
    quantity,
    expiryDate: formatISO(addDays(new Date(), Math.floor(Math.random() * 20) + 5), {
      representation: 'date'
    }),
    status,
    lastUpdated: formatISO(subDays(new Date(), index * 0.25))
  }
})

export const mockRequests: EmergencyRequest[] = [
  {
    id: 'req-1',
    hospitalId: 'hospital-1',
    hospitalName: 'District Hospital Mapusa',
    bloodType: 'O-',
    unitsNeeded: 4,
    urgency: 'critical',
    status: 'pending',
    createdAt: formatISO(subDays(new Date(), 0.25)),
    distanceMeters: 920
  },
  {
    id: 'req-2',
    hospitalId: 'hospital-1',
    hospitalName: 'District Hospital Mapusa',
    bloodType: 'A+',
    unitsNeeded: 2,
    urgency: 'urgent',
    status: 'fulfilled',
    createdAt: formatISO(subDays(new Date(), 1.2)),
    fulfilledAt: formatISO(subDays(new Date(), 0.5)),
    distanceMeters: 3500
  }
]

export const mockNotifications: NotificationItem[] = [
  {
    id: 'noti-1',
    title: 'Emergency O- Request Nearby',
    message: 'Korle Bu Teaching Hospital urgently needs 4 units of O- blood.',
    type: 'emergency_request',
    read: false,
    createdAt: formatISO(subDays(new Date(), 0.05))
  },
  {
    id: 'noti-2',
    title: 'Inventory Alert: A+',
    message: 'A+ stock dropped to 10 units. Consider reaching out to local donors.',
    type: 'inventory_alert',
    read: false,
    createdAt: formatISO(subDays(new Date(), 0.3))
  },
  {
    id: 'noti-3',
    title: 'Donation Reminder',
    message: 'You are eligible to donate again in 10 days. Keep saving lives!',
    type: 'reminder',
    read: true,
    createdAt: formatISO(subDays(new Date(), 7))
  }
]

export const mockDonationHistory: DonationHistoryItem[] = [
  {
    id: 'hist-1',
    donorId: 'donor-1',
    bloodBankId: 'bank-1',
    bloodBankName: 'Greater Accra Regional Hospital Blood Bank',
    donationDate: formatISO(subDays(new Date(), 120)),
    unitsContributed: 1,
    certificateUrl: '#'
  },
  {
    id: 'hist-2',
    donorId: 'donor-1',
    bloodBankId: 'bank-1',
    bloodBankName: 'Greater Accra Regional Hospital Blood Bank',
    donationDate: formatISO(subDays(new Date(), 240)),
    unitsContributed: 1
  },
  {
    id: 'hist-3',
    donorId: 'donor-2',
    bloodBankId: 'bank-1',
    bloodBankName: 'Greater Accra Regional Hospital Blood Bank',
    donationDate: formatISO(subDays(new Date(), 50)),
    unitsContributed: 1
  }
]

export const mockCamps: BloodCamp[] = [
  {
    id: 'camp-1',
    name: 'Panaji Community Blood Drive',
    description: 'Partnered with Goa Red Cross to raise awareness and donations.',
    address: 'Campal Grounds, Panaji',
    coordinates: [15.4909, 73.8278],
    startDate: formatISO(addDays(new Date(), 7)),
    endDate: formatISO(addDays(new Date(), 7.5)),
    organizerName: 'Goa Medical College Blood Bank'
  },
  {
    id: 'camp-2',
    name: 'Margao Donation Day',
    address: 'Municipal Garden, Margao',
    coordinates: [15.2722, 73.9581],
    startDate: formatISO(addDays(new Date(), 15)),
    endDate: formatISO(addDays(new Date(), 15.5)),
    organizerName: 'National Blood Service Goa'
  }
]

export const impactStats: ImpactSnapshot = {
  totalLivesSaved: 1264,
  activeDonors: 842,
  unitsDonated: 3160,
  emergencyFulfillmentRate: 0.92
}
