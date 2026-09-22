import { AutomationJob, AutomationLog, Device, LandlordData, PropertyData, PropertyPhoto } from '../src/types/automation';

// High quality curated luxury real estate photos for test properties
export const TEST_PROPERTY_PHOTOS: Record<string, string[]> = {
  VN568: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', // Living Room
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', // Balcony View
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', // Master Bedroom
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80', // Kitchen Modern
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80', // Luxury Bathroom
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80', // Dining Area
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', // Building Facade
    'https://images.unsplash.com/photo-1571888165893-68d591b619d8?auto=format&fit=crop&w=1200&q=80', // Infinity Pool
    'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80', // Gym & Fitness
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', // Sky Lounge
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80', // Walk-in Closet
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', // Study & Work Corner
  ],
  KT324: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
  ],
  CL2237: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80',
  ],
};

// Known Prime Global Asset Records Database for realistic extraction
export const PRIME_GLOBAL_ASSET_RECORDS: Record<string, {
  property: Partial<PropertyData>;
  landlord: Partial<LandlordData>;
  photosCount: number;
}> = {
  VN568: {
    property: {
      property_no: 'VN568',
      project_name: 'The River Sathorn Riverfront',
      category: 'Condominium',
      status: 'Available',
      approval_status: 'Approved',
      city: 'Bangkok',
      area: 'Sathorn - Charoen Nakhon',
      district: 'Khlong San',
      room_type: '1 Bedroom Riverside Suite',
      room_no: '1804',
      building_no: 'Tower A',
      floor: '18',
      bedroom: 1,
      bathroom: 1,
      building_area: 58.5,
      land_area: 0,
      agent: 'PEAK Prime Team',
      rent_price_year: 38000,
      sale_price: 9500000,
      rent_to: 'Individual / Expat',
      website_status: 'Published',
      comments: 'Prime riverfront unit with panoramic Chao Phraya river view. Fully luxury furnished, German kitchen appliances.',
      follow_up: 'Tenant moving out end of month. Ready for inspection.',
      agency_type: 'Direct Exclusive',
      label: 'Featured Waterfront',
    },
    landlord: {
      name: 'Khun Somsak Prasertvongsa',
      phone_no_1: '0809682838',
      phone_no_2: '028639100',
      email: 'somsak.p@primegroup.co.th',
      national: 'Thai',
      representatives: [
        {
          id: 'rep-vn568-1',
          representative_no: 'REP-01',
          name: 'Khun Narumon Prasertvongsa',
          relationship: 'Co-owner / Spouse',
          phone: '0814421199',
        },
      ],
      cleaning_staff: [
        {
          id: 'cln-vn568-1',
          name: 'Mae Baan Somjit',
          phone: '0891234567',
        },
      ],
      other_contacts: [
        {
          id: 'oth-vn568-1',
          name: 'Building Juristic Office The River',
          phone: '028612000',
        },
      ],
    },
    photosCount: 12,
  },
  KT324: {
    property: {
      property_no: 'KT324',
      project_name: 'The Bangkok Thonglor 55',
      category: 'Condominium',
      status: 'Available',
      approval_status: 'Approved',
      city: 'Bangkok',
      area: 'Sukhumvit 55',
      district: 'Watthana',
      room_type: '2 Bedroom High Floor',
      room_no: '2208',
      building_no: 'Main Tower',
      floor: '22',
      bedroom: 2,
      bathroom: 2,
      building_area: 82.0,
      agent: 'PEAK Elite Team',
      rent_price_year: 75000,
      sale_price: 24500000,
      website_status: 'Published',
      comments: 'Rare high-floor unit with Japanese onsen style master bathroom, direct balcony access.',
      follow_up: 'Keys kept at Thonglor office.',
      agency_type: 'Co-Agent',
      label: 'Ultra Luxury',
    },
    landlord: {
      name: 'Khun Thanawat Kittisiri',
      phone_no_1: '0818223344',
      email: 'thanawat.k@gmail.com',
      national: 'Thai',
    },
    photosCount: 8,
  },
  CL2237: {
    property: {
      property_no: 'CL2237',
      project_name: 'Saladaeng One',
      category: 'Condominium',
      status: 'Available',
      approval_status: 'Approved',
      city: 'Bangkok',
      area: 'Silom / Saladaeng',
      district: 'Bang Rak',
      room_type: '1 Bedroom Deluxe',
      room_no: '1502',
      floor: '15',
      bedroom: 1,
      bathroom: 1,
      building_area: 52.0,
      agent: 'PEAK Prime Team',
      rent_price_year: 50000,
      sale_price: 15200000,
      website_status: 'Published',
      comments: 'Lumpini park view, walking distance to MRT Lumphini & BTS Saladaeng.',
      follow_up: 'Contact landlord 1 day in advance for viewings.',
      agency_type: 'Direct',
      label: 'Park View',
    },
    landlord: {
      name: 'Ms. Katherine Wong',
      phone_no_1: '0825556677',
      email: 'k.wong@sginvestments.com',
      national: 'Singaporean',
    },
    photosCount: 5,
  },
};

// Initial State Store
class AutomationStore {
  devices: Device[] = [
    {
      id: 'dev-office-pc-01',
      name: 'Office PC',
      status: 'ONLINE',
      os: 'Windows 11 Pro 64-bit (23H2)',
      ipAddress: '192.168.1.104',
      primeDetected: true,
      primeVersion: 'v4.2.1-prod',
      lastHeartbeat: new Date().toISOString(),
      pairedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      authToken: 'pk_dev_office_pc_2026_authorized',
      activeJobId: null,
    },
    {
      id: 'dev-laptop-backoffice',
      name: 'Backoffice Automation Laptop',
      status: 'OFFLINE',
      os: 'Windows 10 Enterprise',
      ipAddress: '192.168.1.118',
      primeDetected: false,
      primeVersion: undefined,
      lastHeartbeat: new Date(Date.now() - 3600000 * 4).toISOString(),
      pairedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      authToken: 'pk_dev_laptop_backoffice_2026',
      activeJobId: null,
    },
  ];

  jobs: AutomationJob[] = [];
  logs: AutomationLog[] = [];
  properties: PropertyData[] = [];
  landlords: LandlordData[] = [];
  photos: PropertyPhoto[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed initial successful job record for history
    const seedJobId = 'job-seed-20260920-001';
    const seedJob: AutomationJob = {
      id: seedJobId,
      jobNo: 'JOB-20260920-00001',
      propertyNo: 'KT324',
      deviceId: 'dev-office-pc-01',
      deviceName: 'Office PC',
      userId: 'admin@peakrealestate.com',
      status: 'COMPLETED',
      currentStep: 'Verification Completed & Saved to PEAK Database',
      progress: 100,
      startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      completedAt: new Date(Date.now() - 86400000 * 2 + 134000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      options: {
        propertyInfo: true,
        landlordInfo: true,
        priceInfo: true,
        photos: true,
        videos: false,
        occupancyStatus: false,
        followup: true,
        viewingRecords: false,
      },
    };
    this.jobs.push(seedJob);

    this.logs.push(
      {
        id: 'log-seed-1',
        jobId: seedJobId,
        propertyNo: 'KT324',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        level: 'INFO',
        action: 'Launch Prime Global Asset',
        message: 'Prime Global Asset v4.2.1 process detected (PID 14280)',
      },
      {
        id: 'log-seed-2',
        jobId: seedJobId,
        propertyNo: 'KT324',
        timestamp: new Date(Date.now() - 86400000 * 2 + 30000).toISOString(),
        level: 'SUCCESS',
        action: 'Search Property',
        message: 'Property KT324 located via UI Automation Accessibility Grid',
      },
      {
        id: 'log-seed-3',
        jobId: seedJobId,
        propertyNo: 'KT324',
        timestamp: new Date(Date.now() - 86400000 * 2 + 134000).toISOString(),
        level: 'SUCCESS',
        action: 'Job Finished',
        message: 'KT324 successfully synced: 8 photos uploaded to Supabase storage',
      }
    );
  }

  // Devices
  getDevices() {
    return this.devices;
  }

  getDeviceById(id: string) {
    return this.devices.find((d) => d.id === id);
  }

  pairDevice(data: { name: string; os?: string; ipAddress?: string; primeDetected?: boolean }) {
    const newDevice: Device = {
      id: `dev-${Date.now().toString(36)}`,
      name: data.name,
      status: 'ONLINE',
      os: data.os || 'Windows 11 Pro 64-bit',
      ipAddress: data.ipAddress || '192.168.1.' + Math.floor(Math.random() * 200 + 50),
      primeDetected: data.primeDetected ?? true,
      primeVersion: 'v4.2.1-prod',
      lastHeartbeat: new Date().toISOString(),
      pairedAt: new Date().toISOString(),
      authToken: `pk_dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      activeJobId: null,
    };
    this.devices.push(newDevice);
    return newDevice;
  }

  revokeDevice(id: string) {
    const idx = this.devices.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const removed = this.devices.splice(idx, 1)[0];
      return removed;
    }
    return null;
  }

  updateDeviceHeartbeat(id: string, primeDetected?: boolean) {
    const device = this.devices.find((d) => d.id === id);
    if (device) {
      device.lastHeartbeat = new Date().toISOString();
      if (device.status === 'OFFLINE') {
        device.status = 'ONLINE';
      }
      if (primeDetected !== undefined) {
        device.primeDetected = primeDetected;
      }
    }
    return device;
  }

  // Jobs
  getJobs() {
    return [...this.jobs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getJobById(id: string) {
    return this.jobs.find((j) => j.id === id);
  }

  createJob(data: {
    propertyNo: string;
    deviceId: string;
    userId?: string;
    options: any;
    dryRun?: boolean;
  }): AutomationJob {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const jobCounter = String(this.jobs.length + 1).padStart(5, '0');
    const jobNo = `JOB-${todayStr}-${jobCounter}`;

    const device = this.getDeviceById(data.deviceId);

    const newJob: AutomationJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      jobNo,
      propertyNo: data.propertyNo.trim().toUpperCase(),
      deviceId: data.deviceId,
      deviceName: device ? device.name : 'Unknown Device',
      userId: data.userId || 'admin@peakrealestate.com',
      status: 'QUEUED',
      currentStep: 'Queued in Automation Dispatcher',
      progress: 0,
      createdAt: new Date().toISOString(),
      options: data.options,
      dryRun: data.dryRun ?? false,
    };

    this.jobs.unshift(newJob);
    return newJob;
  }

  updateJob(id: string, updates: Partial<AutomationJob>): AutomationJob | null {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return null;
    Object.assign(job, updates);
    return job;
  }

  // Logs
  getLogs(jobId?: string) {
    if (jobId) {
      return this.logs.filter((l) => l.jobId === jobId);
    }
    return [...this.logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  addLog(data: Omit<AutomationLog, 'id'>) {
    const log: AutomationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
    };
    this.logs.unshift(log);
    return log;
  }

  // Property & Landlord & Photo Records
  savePropertyData(property: PropertyData, landlord?: LandlordData, photos?: PropertyPhoto[]) {
    // Upsert property
    const existingIdx = this.properties.findIndex((p) => p.property_no === property.property_no);
    if (existingIdx !== -1) {
      this.properties[existingIdx] = property;
    } else {
      this.properties.unshift(property);
    }

    // Upsert landlord
    if (landlord) {
      const lIdx = this.landlords.findIndex((l) => l.property_id === property.id);
      if (lIdx !== -1) {
        this.landlords[lIdx] = landlord;
      } else {
        this.landlords.unshift(landlord);
      }
    }

    // Upsert photos
    if (photos && photos.length > 0) {
      // Remove old photos for this property
      this.photos = this.photos.filter((ph) => ph.property_id !== property.id);
      this.photos.push(...photos);
    }
  }

  getProperty(propertyNo: string) {
    const property = this.properties.find((p) => p.property_no === propertyNo.toUpperCase());
    if (!property) return null;
    const landlord = this.landlords.find((l) => l.property_id === property.id);
    const photos = this.photos.filter((p) => p.property_id === property.id);
    return { property, landlord, photos };
  }

  getAllProperties() {
    return this.properties.map((p) => {
      const landlord = this.landlords.find((l) => l.property_id === p.id);
      const photos = this.photos.filter((ph) => ph.property_id === p.id);
      return { property: p, landlord, photosCount: photos.length };
    });
  }
}

export const automationStore = new AutomationStore();
