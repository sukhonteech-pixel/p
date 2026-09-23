import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for PEAK Property Data
export interface PropertyRecord {
  id: string;
  property_no: string;
  property_name: string;
  category: string;
  property_type: string;
  status: 'Available' | 'Rented' | 'Sold' | 'Pending' | 'Inactive';
  project_name: string;
  location: string;
  zone: string;
  bedroom: number;
  bathroom: number;
  land_area: number;
  building_area: number;
  floor: string;
  year_built: string;
  furniture: string;
  pool: string;
  parking: string;
  description: string;
  rent_price: number;
  sale_price: number;
  additional_data: Record<string, any>;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyContactRecord {
  id: string;
  property_id: string;
  contact_name: string;
  contact_type: 'Owner' | 'Agent' | 'Co-Agent' | 'Juristic' | 'Cleaning' | 'Other';
  phone: string;
  email?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyPhotoRecord {
  id: string;
  property_id: string;
  storage_path: string;
  file_name: string;
  public_url: string;
  sort_order: number;
  is_cover: boolean;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface PropertyFileRecord {
  id: string;
  property_id: string;
  storage_path: string;
  file_name: string;
  public_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface PropertyUpdateLogRecord {
  id: string;
  property_id: string;
  action: string;
  changed_field?: string;
  old_value?: string;
  new_value?: string;
  user_name: string;
  created_at: string;
}

class PeakDatabaseService {
  private supabase: SupabaseClient | null = null;
  private isSupabaseConnected = false;
  private storageBucket = 'property-files';

  // Persistent File-backed Database Store (ensures 100% data persistence without mock data)
  private dataDir = path.join(process.cwd(), 'server', 'data');
  private uploadDir = path.join(process.cwd(), 'public', 'uploads');
  private storeFile = path.join(process.cwd(), 'server', 'data', 'store.json');

  private memoryStore: {
    properties: PropertyRecord[];
    contacts: PropertyContactRecord[];
    photos: PropertyPhotoRecord[];
    files: PropertyFileRecord[];
    updateLogs: PropertyUpdateLogRecord[];
  } = {
    properties: [],
    contacts: [],
    photos: [],
    files: [],
    updateLogs: [],
  };

  constructor() {
    this.initFileSystem();
    this.initSupabase();
    this.loadStore();
  }

  private initFileSystem() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        this.isSupabaseConnected = true;
        console.log(`[Database] Connected to Supabase at ${supabaseUrl}`);
      } catch (err) {
        console.error('[Database] Failed to initialize Supabase client:', err);
      }
    } else {
      console.log('[Database] Running in High-Reliability Local Database Mode (Zero Mocks). Supabase credentials can be added to .env anytime.');
    }
  }

  private loadStore() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf-8');
        const parsed = JSON.parse(raw);
        this.memoryStore = {
          properties: parsed.properties || [],
          contacts: parsed.contacts || [],
          photos: parsed.photos || [],
          files: parsed.files || [],
          updateLogs: parsed.updateLogs || [],
        };
        console.log(`[Database] Loaded ${this.memoryStore.properties.length} properties from storage.`);
      } else {
        // Start completely empty (No mocks, no fake items!)
        this.memoryStore = {
          properties: [],
          contacts: [],
          photos: [],
          files: [],
          updateLogs: [],
        };
        this.saveStore();
      }
    } catch (e) {
      console.error('[Database] Error loading store file:', e);
    }
  }

  private saveStore() {
    try {
      fs.writeFileSync(this.storeFile, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Database] Error saving store file:', e);
    }
  }

  // Dashboard Stats (Real counts from database)
  async getDashboardStats() {
    const properties = this.memoryStore.properties.filter((p) => !p.is_archived);
    const totalProperties = properties.length;
    const totalPhotos = this.memoryStore.photos.length;
    const totalFiles = this.memoryStore.files.length;

    // Added Today
    const todayStr = new Date().toISOString().slice(0, 10);
    const propertiesAddedToday = properties.filter((p) => p.created_at.startsWith(todayStr)).length;

    return {
      totalProperties,
      totalPhotos,
      totalFiles,
      propertiesAddedToday,
      totalContacts: this.memoryStore.contacts.length,
      isSupabaseConnected: this.isSupabaseConnected,
    };
  }

  // Query Properties with Search, Filter & Pagination
  async getProperties(params: {
    search?: string;
    category?: string;
    status?: string;
    location?: string;
    project?: string;
    bedroom?: number | string;
    bathroom?: number | string;
    page?: number;
    limit?: number;
    includeArchived?: boolean;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const search = (params.search || '').trim().toLowerCase();

    let list = this.memoryStore.properties.filter((p) => {
      if (!params.includeArchived && p.is_archived) return false;
      return true;
    });

    // 1. Search across Property No, Property Name, Project Name, Location, and Contacts Phone
    if (search) {
      list = list.filter((p) => {
        const matchesProp =
          p.property_no.toLowerCase().includes(search) ||
          (p.property_name || '').toLowerCase().includes(search) ||
          (p.project_name || '').toLowerCase().includes(search) ||
          (p.location || '').toLowerCase().includes(search);

        if (matchesProp) return true;

        // Check associated phone numbers
        const pContacts = this.memoryStore.contacts.filter((c) => c.property_id === p.id);
        const matchesPhone = pContacts.some((c) => c.phone.includes(search) || c.contact_name.toLowerCase().includes(search));
        return matchesPhone;
      });
    }

    // 2. Filters
    if (params.category && params.category !== 'ALL') {
      list = list.filter((p) => (p.category || '').toLowerCase() === params.category!.toLowerCase());
    }
    if (params.status && params.status !== 'ALL') {
      list = list.filter((p) => p.status.toLowerCase() === params.status!.toLowerCase());
    }
    if (params.location && params.location !== 'ALL') {
      list = list.filter((p) => (p.location || '').toLowerCase().includes(params.location!.toLowerCase()));
    }
    if (params.project && params.project !== 'ALL') {
      list = list.filter((p) => (p.project_name || '').toLowerCase().includes(params.project!.toLowerCase()));
    }
    if (params.bedroom !== undefined && params.bedroom !== 'ALL') {
      const b = Number(params.bedroom);
      if (b >= 4) {
        list = list.filter((p) => p.bedroom >= 4);
      } else if (!isNaN(b)) {
        list = list.filter((p) => p.bedroom === b);
      }
    }
    if (params.bathroom !== undefined && params.bathroom !== 'ALL') {
      const b = Number(params.bathroom);
      if (b >= 3) {
        list = list.filter((p) => p.bathroom >= 3);
      } else if (!isNaN(b)) {
        list = list.filter((p) => p.bathroom === b);
      }
    }

    // Sort by latest created first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    // Attach cover photo & contacts count to each item
    const items = paginated.map((p) => {
      const photos = this.memoryStore.photos.filter((ph) => ph.property_id === p.id);
      const coverPhoto = photos.find((ph) => ph.is_cover) || photos[0] || null;
      const contacts = this.memoryStore.contacts.filter((c) => c.property_id === p.id);
      const files = this.memoryStore.files.filter((f) => f.property_id === p.id);

      return {
        ...p,
        cover_photo_url: coverPhoto ? coverPhoto.public_url : null,
        photos_count: photos.length,
        files_count: files.length,
        contacts,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // Get Property Detail by ID or Property No
  async getPropertyById(idOrNo: string) {
    const property = this.memoryStore.properties.find(
      (p) => p.id === idOrNo || p.property_no.toUpperCase() === idOrNo.toUpperCase()
    );

    if (!property) return null;

    const contacts = this.memoryStore.contacts.filter((c) => c.property_id === property.id);
    const photos = this.memoryStore.photos
      .filter((ph) => ph.property_id === property.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const files = this.memoryStore.files.filter((f) => f.property_id === property.id);
    const updateLogs = this.memoryStore.updateLogs
      .filter((l) => l.property_id === property.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      property,
      contacts,
      photos,
      files,
      updateLogs,
    };
  }

  // Create Property
  async createProperty(
    data: {
      property_no: string;
      property_name?: string;
      category?: string;
      property_type?: string;
      status?: 'Available' | 'Rented' | 'Sold' | 'Pending' | 'Inactive';
      project_name?: string;
      location?: string;
      zone?: string;
      bedroom?: number;
      bathroom?: number;
      land_area?: number;
      building_area?: number;
      floor?: string;
      year_built?: string;
      furniture?: string;
      pool?: string;
      parking?: string;
      description?: string;
      rent_price?: number;
      sale_price?: number;
      additional_data?: Record<string, any>;
      contacts?: Array<{
        contact_name?: string;
        contact_type?: 'Owner' | 'Agent' | 'Co-Agent' | 'Juristic' | 'Cleaning' | 'Other';
        phone: string;
        email?: string;
      }>;
    },
    user = 'Admin'
  ): Promise<PropertyRecord> {
    const cleanNo = data.property_no.trim().toUpperCase();
    if (!cleanNo) {
      throw new Error('Property No is required');
    }

    // Check Unique Constraint
    const existing = this.memoryStore.properties.find((p) => p.property_no === cleanNo);
    if (existing) {
      throw new Error(`Property No '${cleanNo}' already exists in database`);
    }

    const newId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: PropertyRecord = {
      id: newId,
      property_no: cleanNo,
      property_name: data.property_name?.trim() || cleanNo,
      category: data.category?.trim() || 'Condominium',
      property_type: data.property_type?.trim() || 'Residential',
      status: data.status || 'Available',
      project_name: data.project_name?.trim() || '',
      location: data.location?.trim() || '',
      zone: data.zone?.trim() || '',
      bedroom: Number(data.bedroom) || 0,
      bathroom: Number(data.bathroom) || 0,
      land_area: Number(data.land_area) || 0,
      building_area: Number(data.building_area) || 0,
      floor: String(data.floor || ''),
      year_built: String(data.year_built || ''),
      furniture: data.furniture?.trim() || '',
      pool: data.pool?.trim() || '',
      parking: data.parking?.trim() || '',
      description: data.description?.trim() || '',
      rent_price: Number(data.rent_price) || 0,
      sale_price: Number(data.sale_price) || 0,
      additional_data: data.additional_data || {},
      is_archived: false,
      created_at: now,
      updated_at: now,
    };

    this.memoryStore.properties.unshift(record);

    // Add initial contacts if provided
    if (data.contacts && Array.isArray(data.contacts)) {
      for (const c of data.contacts) {
        if (c.phone && c.phone.trim()) {
          this.memoryStore.contacts.push({
            id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            property_id: newId,
            contact_name: c.contact_name?.trim() || 'Owner',
            contact_type: c.contact_type || 'Owner',
            phone: c.phone.trim(),
            email: c.email?.trim() || '',
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    // Log History
    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: newId,
      action: 'Created',
      changed_field: 'All',
      new_value: `Created property ${cleanNo}`,
      user_name: user,
      created_at: now,
    });

    this.saveStore();

    // Mirror to Supabase if connected
    if (this.supabase) {
      (async () => {
        try {
          await this.supabase!.from('properties').insert([record]);
        } catch (err) {
          console.error('[Supabase Mirror] Error inserting property:', err);
        }
      })();
    }

    return record;
  }

  // Update Property and Record Field-by-Field History
  async updateProperty(id: string, updates: Partial<PropertyRecord>, user = 'Admin'): Promise<PropertyRecord> {
    const prop = this.memoryStore.properties.find((p) => p.id === id);
    if (!prop) {
      throw new Error(`Property with id '${id}' not found`);
    }

    const now = new Date().toISOString();
    const trackableFields: (keyof PropertyRecord)[] = [
      'property_name',
      'category',
      'property_type',
      'status',
      'project_name',
      'location',
      'zone',
      'bedroom',
      'bathroom',
      'land_area',
      'building_area',
      'floor',
      'year_built',
      'furniture',
      'pool',
      'parking',
      'description',
      'rent_price',
      'sale_price',
    ];

    for (const key of trackableFields) {
      if (updates[key] !== undefined && String(updates[key]) !== String(prop[key])) {
        this.memoryStore.updateLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          property_id: id,
          action: 'Updated',
          changed_field: key,
          old_value: String(prop[key] ?? ''),
          new_value: String(updates[key] ?? ''),
          user_name: user,
          created_at: now,
        });
      }
    }

    // If property_no is updated, check unique
    if (updates.property_no && updates.property_no.toUpperCase() !== prop.property_no) {
      const cleanNew = updates.property_no.trim().toUpperCase();
      const duplicate = this.memoryStore.properties.find((p) => p.id !== id && p.property_no === cleanNew);
      if (duplicate) {
        throw new Error(`Property No '${cleanNew}' is already taken by another property`);
      }
      prop.property_no = cleanNew;
    }

    Object.assign(prop, updates, { updated_at: now });
    this.saveStore();

    if (this.supabase) {
      (async () => {
        try {
          await this.supabase!.from('properties').update(prop).eq('id', id);
        } catch (err) {
          console.error('[Supabase Mirror] Error updating property:', err);
        }
      })();
    }

    return prop;
  }

  // Archive Property (Soft Delete)
  async archiveProperty(id: string, user = 'Admin'): Promise<PropertyRecord> {
    const prop = await this.updateProperty(id, { is_archived: true, status: 'Inactive' }, user);
    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: id,
      action: 'Archived',
      changed_field: 'is_archived',
      old_value: 'false',
      new_value: 'true',
      user_name: user,
      created_at: new Date().toISOString(),
    });
    this.saveStore();
    return prop;
  }

  // Restore Property from Archive
  async restoreProperty(id: string, user = 'Admin'): Promise<PropertyRecord> {
    const prop = await this.updateProperty(id, { is_archived: false, status: 'Available' }, user);
    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: id,
      action: 'Restored',
      changed_field: 'is_archived',
      old_value: 'true',
      new_value: 'false',
      user_name: user,
      created_at: new Date().toISOString(),
    });
    this.saveStore();
    return prop;
  }

  // Hard Delete (Permanent)
  async deletePropertyPermanently(id: string, user = 'Super Admin') {
    const index = this.memoryStore.properties.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Property with id '${id}' not found`);
    }

    const removed = this.memoryStore.properties.splice(index, 1)[0];

    // Remove cascading data
    this.memoryStore.contacts = this.memoryStore.contacts.filter((c) => c.property_id !== id);
    this.memoryStore.photos = this.memoryStore.photos.filter((ph) => ph.property_id !== id);
    this.memoryStore.files = this.memoryStore.files.filter((f) => f.property_id !== id);
    this.memoryStore.updateLogs = this.memoryStore.updateLogs.filter((l) => l.property_id !== id);

    this.saveStore();

    if (this.supabase) {
      (async () => {
        try {
          await this.supabase!.from('properties').delete().eq('id', id);
        } catch (err) {
          console.error('[Supabase Mirror] Error deleting property:', err);
        }
      })();
    }

    return removed;
  }

  // Add Contact to Property
  async addContact(
    propertyId: string,
    data: {
      contact_name: string;
      contact_type?: 'Owner' | 'Agent' | 'Co-Agent' | 'Juristic' | 'Cleaning' | 'Other';
      phone: string;
      email?: string;
      note?: string;
    },
    user = 'Admin'
  ) {
    const prop = this.memoryStore.properties.find((p) => p.id === propertyId);
    if (!prop) {
      throw new Error('Property not found');
    }
    if (!data.phone || !data.phone.trim()) {
      throw new Error('Phone number is required');
    }

    const now = new Date().toISOString();
    const contact: PropertyContactRecord = {
      id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      contact_name: data.contact_name?.trim() || 'Contact',
      contact_type: data.contact_type || 'Owner',
      phone: data.phone.trim(),
      email: data.email?.trim() || '',
      note: data.note?.trim() || '',
      created_at: now,
      updated_at: now,
    };

    this.memoryStore.contacts.push(contact);

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      action: 'Contact Added',
      changed_field: 'contact',
      new_value: `${contact.contact_type}: ${contact.contact_name} (${contact.phone})`,
      user_name: user,
      created_at: now,
    });

    this.saveStore();
    return contact;
  }

  // Update Contact
  async updateContact(
    contactId: string,
    data: {
      contact_name?: string;
      contact_type?: 'Owner' | 'Agent' | 'Co-Agent' | 'Juristic' | 'Cleaning' | 'Other';
      phone?: string;
      email?: string;
      note?: string;
    },
    user = 'Admin'
  ) {
    const contact = this.memoryStore.contacts.find((c) => c.id === contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const oldInfo = `${contact.contact_name} (${contact.phone})`;
    if (data.contact_name !== undefined) contact.contact_name = data.contact_name.trim();
    if (data.contact_type !== undefined) contact.contact_type = data.contact_type;
    if (data.phone !== undefined) contact.phone = data.phone.trim();
    if (data.email !== undefined) contact.email = data.email.trim();
    if (data.note !== undefined) contact.note = data.note.trim();
    contact.updated_at = new Date().toISOString();

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: contact.property_id,
      action: 'Contact Updated',
      changed_field: 'contact',
      old_value: oldInfo,
      new_value: `${contact.contact_name} (${contact.phone})`,
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();

    if (this.supabase) {
      (async () => {
        try {
          await this.supabase!.from('property_contacts').update(contact).eq('id', contactId);
        } catch (err) {
          console.error('[Supabase Mirror] Error updating contact:', err);
        }
      })();
    }

    return contact;
  }

  // Delete Contact
  async deleteContact(contactId: string, user = 'Admin') {
    const idx = this.memoryStore.contacts.findIndex((c) => c.id === contactId);
    if (idx === -1) {
      throw new Error('Contact not found');
    }
    const removed = this.memoryStore.contacts.splice(idx, 1)[0];

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: removed.property_id,
      action: 'Contact Removed',
      changed_field: 'contact',
      old_value: `${removed.contact_name} (${removed.phone})`,
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();

    if (this.supabase) {
      (async () => {
        try {
          await this.supabase!.from('property_contacts').delete().eq('id', contactId);
        } catch (err) {
          console.error('[Supabase Mirror] Error deleting contact:', err);
        }
      })();
    }

    return removed;
  }

  // Get Photo Record with File Path
  getPhotoById(photoId: string): { photo: PropertyPhotoRecord; localPath: string } | null {
    const photo = this.memoryStore.photos.find((p) => p.id === photoId);
    if (!photo) return null;
    const prop = this.memoryStore.properties.find((p) => p.id === photo.property_id);
    const propNo = prop ? prop.property_no : 'default';
    const fileName = path.basename(photo.public_url);
    const localPath = path.join(this.uploadDir, propNo, 'photos', fileName);
    return { photo, localPath };
  }

  // Get Document / File Record with File Path
  getFileById(fileId: string): { file: PropertyFileRecord; localPath: string } | null {
    const doc = this.memoryStore.files.find((f) => f.id === fileId);
    if (!doc) return null;
    const prop = this.memoryStore.properties.find((p) => p.id === doc.property_id);
    const propNo = prop ? prop.property_no : 'default';
    const fileName = path.basename(doc.public_url);
    const localPath = path.join(this.uploadDir, propNo, 'documents', fileName);
    return { file: doc, localPath };
  }

  // Upload Photo to Storage and Register in Database
  async savePhoto(
    propertyId: string,
    file: {
      originalName: string;
      buffer: Buffer;
      mimeType: string;
      size: number;
    },
    isCover = false,
    user = 'Admin'
  ) {
    const prop = this.memoryStore.properties.find((p) => p.id === propertyId);
    if (!prop) throw new Error('Property not found');

    const cleanPropNo = prop.property_no;
    const extension = path.extname(file.originalName) || '.jpg';
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${Math.random().toString(36).substring(2, 6)}${extension}`;
    const storagePath = `${this.storageBucket}/${cleanPropNo}/photos/${safeFileName}`;

    // 1. Save to local public storage directory so it's always accessible
    const propPhotoDir = path.join(this.uploadDir, cleanPropNo, 'photos');
    if (!fs.existsSync(propPhotoDir)) {
      fs.mkdirSync(propPhotoDir, { recursive: true });
    }
    const localFilePath = path.join(propPhotoDir, safeFileName);
    fs.writeFileSync(localFilePath, file.buffer);
    const publicUrl = `/uploads/${cleanPropNo}/photos/${safeFileName}`;

    // 2. Upload to Supabase Storage if configured
    if (this.supabase) {
      try {
        const { error } = await this.supabase.storage
          .from(this.storageBucket)
          .upload(`${cleanPropNo}/photos/${safeFileName}`, file.buffer, {
            contentType: file.mimeType,
            upsert: true,
          });
        if (error) {
          console.warn('[Supabase Storage] Upload warning:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase Storage] Upload exception:', err);
      }
    }

    // Determine sort_order
    const existingPhotos = this.memoryStore.photos.filter((ph) => ph.property_id === propertyId);
    const nextOrder = existingPhotos.length + 1;

    // If marked as cover, unmark others
    if (isCover || existingPhotos.length === 0) {
      existingPhotos.forEach((ph) => {
        ph.is_cover = false;
      });
      isCover = true;
    }

    const photoRecord: PropertyPhotoRecord = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      storage_path: storagePath,
      file_name: file.originalName,
      public_url: publicUrl,
      sort_order: nextOrder,
      is_cover: isCover,
      file_size: file.size,
      mime_type: file.mimeType,
      created_at: new Date().toISOString(),
    };

    this.memoryStore.photos.push(photoRecord);

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      action: 'Photo Uploaded',
      changed_field: 'photos',
      new_value: file.originalName,
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();
    return photoRecord;
  }

  // Set Cover Photo
  async setCoverPhoto(propertyId: string, photoId: string, user = 'Admin') {
    const photos = this.memoryStore.photos.filter((ph) => ph.property_id === propertyId);
    let targetFound = false;

    for (const ph of photos) {
      if (ph.id === photoId) {
        ph.is_cover = true;
        targetFound = true;
      } else {
        ph.is_cover = false;
      }
    }

    if (!targetFound) throw new Error('Photo not found');

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      action: 'Cover Photo Set',
      changed_field: 'is_cover',
      new_value: photoId,
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();
    return true;
  }

  // Reorder Photos
  async reorderPhotos(propertyId: string, photoIds: string[], user = 'Admin') {
    photoIds.forEach((id, index) => {
      const ph = this.memoryStore.photos.find((p) => p.id === id && p.property_id === propertyId);
      if (ph) {
        ph.sort_order = index + 1;
      }
    });

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      action: 'Photos Reordered',
      changed_field: 'sort_order',
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();
    return true;
  }

  // Delete Photo
  async deletePhoto(photoId: string, user = 'Admin') {
    const idx = this.memoryStore.photos.findIndex((ph) => ph.id === photoId);
    if (idx === -1) throw new Error('Photo not found');

    const removed = this.memoryStore.photos.splice(idx, 1)[0];

    // If deleted was cover, designate another photo as cover
    const remaining = this.memoryStore.photos.filter((ph) => ph.property_id === removed.property_id);
    if (removed.is_cover && remaining.length > 0) {
      remaining[0].is_cover = true;
    }

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: removed.property_id,
      action: 'Photo Deleted',
      changed_field: 'photos',
      old_value: removed.file_name,
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();
    return removed;
  }

  // Upload Document / File
  async saveFile(
    propertyId: string,
    file: {
      originalName: string;
      buffer: Buffer;
      mimeType: string;
      size: number;
    },
    user = 'Admin'
  ) {
    const prop = this.memoryStore.properties.find((p) => p.id === propertyId);
    if (!prop) throw new Error('Property not found');

    const cleanPropNo = prop.property_no;
    const extension = path.extname(file.originalName);
    const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}${extension}`;
    const storagePath = `${this.storageBucket}/${cleanPropNo}/documents/${safeFileName}`;

    const propDocDir = path.join(this.uploadDir, cleanPropNo, 'documents');
    if (!fs.existsSync(propDocDir)) {
      fs.mkdirSync(propDocDir, { recursive: true });
    }
    const localFilePath = path.join(propDocDir, safeFileName);
    fs.writeFileSync(localFilePath, file.buffer);
    const publicUrl = `/uploads/${cleanPropNo}/documents/${safeFileName}`;

    if (this.supabase) {
      try {
        await this.supabase.storage
          .from(this.storageBucket)
          .upload(`${cleanPropNo}/documents/${safeFileName}`, file.buffer, {
            contentType: file.mimeType,
            upsert: true,
          });
      } catch (err) {
        console.warn('[Supabase Storage] File upload warning:', err);
      }
    }

    const fileRecord: PropertyFileRecord = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      storage_path: storagePath,
      file_name: file.originalName,
      public_url: publicUrl,
      file_size: file.size,
      mime_type: file.mimeType,
      created_at: new Date().toISOString(),
    };

    this.memoryStore.files.push(fileRecord);

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: propertyId,
      action: 'File Uploaded',
      changed_field: 'files',
      new_value: file.originalName,
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();
    return fileRecord;
  }

  // Delete Document / File
  async deleteFile(fileId: string, user = 'Admin') {
    const idx = this.memoryStore.files.findIndex((f) => f.id === fileId);
    if (idx === -1) throw new Error('File not found');

    const removed = this.memoryStore.files.splice(idx, 1)[0];

    this.memoryStore.updateLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      property_id: removed.property_id,
      action: 'File Deleted',
      changed_field: 'files',
      old_value: removed.file_name,
      user_name: user,
      created_at: new Date().toISOString(),
    });

    this.saveStore();
    return removed;
  }

  // Batch Excel Import Engine
  async importExcelBatch(
    items: Array<{
      property_no: string;
      property_name?: string;
      category?: string;
      property_type?: string;
      status?: 'Available' | 'Rented' | 'Sold' | 'Pending' | 'Inactive';
      project_name?: string;
      location?: string;
      zone?: string;
      bedroom?: number;
      bathroom?: number;
      land_area?: number;
      building_area?: number;
      floor?: string;
      year_built?: string;
      furniture?: string;
      pool?: string;
      parking?: string;
      description?: string;
      rent_price?: number;
      sale_price?: number;
      phone?: string;
      contact_name?: string;
      additional_data?: Record<string, any>;
    }>,
    duplicateStrategy: 'UPDATE' | 'SKIP' | 'CREATE' = 'UPDATE',
    user = 'Admin'
  ) {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const failed: Array<{ property_no: string; error: string }> = [];

    for (const item of items) {
      try {
        const cleanNo = (item.property_no || '').trim().toUpperCase();
        if (!cleanNo) {
          failed.push({ property_no: 'UNKNOWN', error: 'Missing or empty Property No' });
          continue;
        }

        const existing = this.memoryStore.properties.find((p) => p.property_no === cleanNo);

        if (existing) {
          if (duplicateStrategy === 'SKIP') {
            skipped++;
            continue;
          } else if (duplicateStrategy === 'UPDATE') {
            await this.updateProperty(
              existing.id,
              {
                property_name: item.property_name || existing.property_name,
                category: item.category || existing.category,
                property_type: item.property_type || existing.property_type,
                status: item.status || existing.status,
                project_name: item.project_name || existing.project_name,
                location: item.location || existing.location,
                zone: item.zone || existing.zone,
                bedroom: item.bedroom !== undefined ? item.bedroom : existing.bedroom,
                bathroom: item.bathroom !== undefined ? item.bathroom : existing.bathroom,
                land_area: item.land_area !== undefined ? item.land_area : existing.land_area,
                building_area: item.building_area !== undefined ? item.building_area : existing.building_area,
                floor: item.floor || existing.floor,
                year_built: item.year_built || existing.year_built,
                furniture: item.furniture || existing.furniture,
                pool: item.pool || existing.pool,
                parking: item.parking || existing.parking,
                description: item.description || existing.description,
                rent_price: item.rent_price !== undefined ? item.rent_price : existing.rent_price,
                sale_price: item.sale_price !== undefined ? item.sale_price : existing.sale_price,
                additional_data: { ...existing.additional_data, ...item.additional_data },
              },
              user
            );

            // Add phone if provided and not already present
            if (item.phone) {
              const hasPhone = this.memoryStore.contacts.some(
                (c) => c.property_id === existing.id && c.phone === item.phone
              );
              if (!hasPhone) {
                await this.addContact(
                  existing.id,
                  {
                    contact_name: item.contact_name || 'Owner',
                    contact_type: 'Owner',
                    phone: item.phone,
                  },
                  user
                );
              }
            }
            updated++;
          }
        } else {
          // Create new record
          const contacts = [];
          if (item.phone && item.phone.trim()) {
            contacts.push({
              contact_name: item.contact_name || 'Owner',
              contact_type: 'Owner' as const,
              phone: item.phone.trim(),
            });
          }

          await this.createProperty(
            {
              property_no: cleanNo,
              property_name: item.property_name || cleanNo,
              category: item.category || 'Condominium',
              property_type: item.property_type || 'Residential',
              status: item.status || 'Available',
              project_name: item.project_name || '',
              location: item.location || '',
              zone: item.zone || '',
              bedroom: item.bedroom || 0,
              bathroom: item.bathroom || 0,
              land_area: item.land_area || 0,
              building_area: item.building_area || 0,
              floor: item.floor || '',
              year_built: item.year_built || '',
              furniture: item.furniture || '',
              pool: item.pool || '',
              parking: item.parking || '',
              description: item.description || '',
              rent_price: item.rent_price || 0,
              sale_price: item.sale_price || 0,
              additional_data: item.additional_data || {},
              contacts,
            },
            user
          );
          imported++;
        }
      } catch (err: any) {
        failed.push({
          property_no: item.property_no || 'UNKNOWN',
          error: err.message || 'Unknown import error',
        });
      }
    }

    return {
      total: items.length,
      imported,
      updated,
      skipped,
      failedCount: failed.length,
      failed,
    };
  }

  // Find matching property for a filename based on strict prefix matching rules
  findPropertyForFilename(filename: string): PropertyRecord | null {
    const baseName = path.parse(filename).name.trim();
    if (!baseName) return null;

    // Sort properties by property_no length descending so longer exact prefixes match first
    const activeProps = [...this.memoryStore.properties]
      .filter((p) => !p.is_archived)
      .sort((a, b) => b.property_no.length - a.property_no.length);

    for (const prop of activeProps) {
      const pNo = prop.property_no.trim();
      if (!pNo) continue;
      const escaped = pNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Must match at the start: ^pNo followed by end of baseName OR delimiter (_, -, space, dot, parenthesis, bracket)
      // Must NOT be followed by a letter or digit (which would mean a different property code like VN5680 vs VN568)
      const pattern = new RegExp(`^${escaped}(?:[_\\-\\s\\.\\(\\[].*|$)`, 'i');
      if (pattern.test(baseName)) {
        return prop;
      }
    }
    return null;
  }

  // Bulk upload files with automatic Property No matching from file name
  async bulkUploadAutoMatchedFiles(
    files: Array<{
      originalName: string;
      buffer: Buffer;
      mimeType: string;
      size: number;
    }>,
    user = 'Admin'
  ) {
    const matched: Array<{
      originalName: string;
      property_id: string;
      property_no: string;
      property_name: string;
      file_type: 'photo' | 'document';
      recordId: string;
      publicUrl: string;
      size: number;
    }> = [];

    const unmatched: Array<{
      originalName: string;
      reason: string;
      size: number;
    }> = [];

    const errors: Array<{
      originalName: string;
      error: string;
    }> = [];

    for (const file of files) {
      const matchedProp = this.findPropertyForFilename(file.originalName);

      if (!matchedProp) {
        // As strictly required: unmatched files MUST NOT be assigned to another property or uploaded randomly
        unmatched.push({
          originalName: file.originalName,
          reason: 'Property not found',
          size: file.size,
        });
        continue;
      }

      try {
        const ext = path.extname(file.originalName).toLowerCase();
        const isPhoto =
          file.mimeType.startsWith('image/') ||
          ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext);

        if (isPhoto) {
          const photoRecord = await this.savePhoto(
            matchedProp.id,
            file,
            false,
            user
          );
          matched.push({
            originalName: file.originalName,
            property_id: matchedProp.id,
            property_no: matchedProp.property_no,
            property_name: matchedProp.property_name,
            file_type: 'photo',
            recordId: photoRecord.id,
            publicUrl: photoRecord.public_url,
            size: file.size,
          });
        } else {
          const fileRecord = await this.saveFile(
            matchedProp.id,
            file,
            user
          );
          matched.push({
            originalName: file.originalName,
            property_id: matchedProp.id,
            property_no: matchedProp.property_no,
            property_name: matchedProp.property_name,
            file_type: 'document',
            recordId: fileRecord.id,
            publicUrl: fileRecord.public_url,
            size: file.size,
          });
        }
      } catch (err: any) {
        errors.push({
          originalName: file.originalName,
          error: err.message || 'Upload failed',
        });
      }
    }

    return {
      totalFiles: files.length,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      uploadedCount: matched.length,
      matched,
      unmatched,
      errors,
    };
  }
}

export const peakDb = new PeakDatabaseService();
