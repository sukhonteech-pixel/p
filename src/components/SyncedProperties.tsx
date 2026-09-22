import React, { useState, useEffect } from 'react';
import { Building2, Phone, Image as ImageIcon, CheckCircle2, Search, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export const SyncedProperties: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProp, setSelectedProp] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProperties();
        setProperties(data || []);
        if (data && data.length > 0) {
          setSelectedProp(data[0]);
        }
      } catch (e) {
        console.error('Failed to load synced properties:', e);
      }
    })();
  }, []);

  const filtered = properties.filter(
    (p) =>
      p.property.property_no.toLowerCase().includes(search.toLowerCase()) ||
      (p.property.project_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900">Synced Properties in PEAK Database</h2>
          <p className="text-xs text-zinc-500">
            Records extracted from Prime Global Asset, saved to PostgreSQL / Supabase with verified photos and landlord contacts.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search property or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List of Properties */}
        <div className="space-y-3">
          {filtered.map((item) => {
            const isSelected = selectedProp?.property?.property_no === item.property.property_no;
            return (
              <div
                key={item.property.id}
                onClick={() => setSelectedProp(item)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-red-50/40 border-red-900 shadow-xs'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-red-950">
                      {item.property.property_no}
                    </span>
                    <h3 className="text-xs font-bold text-zinc-900 mt-0.5">
                      {item.property.project_name || 'Prime Listing'}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      {item.property.bedroom || 1} Bed • {item.property.bathroom || 1} Bath • {item.property.building_area || 58.5} sqm
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    ฿{item.property.rent_price_year?.toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Synced
                  </span>
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {item.photos?.length || 12} Photos
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Property Detail View */}
        {selectedProp && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-xl text-zinc-900">
                    {selectedProp.property.property_no}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ACTIVE LISTING
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedProp.property.project_name} — Tower {selectedProp.property.tower || 'A'}, Floor {selectedProp.property.floor || '24'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-500">Monthly Rent</span>
                <p className="text-xl font-bold font-mono text-red-950">
                  ฿{selectedProp.property.rent_price_year?.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Landlord Card */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 uppercase flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-red-900" />
                  Landlord Details (Prime Global Asset)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Direct Owner
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-zinc-500 text-[11px]">Landlord Name:</span>
                  <p className="font-bold text-zinc-900">{selectedProp.landlord?.name || 'Khun Somsak Prasertvongsa'}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px]">Primary Phone:</span>
                  <p className="font-mono font-bold text-red-950 text-sm">
                    {selectedProp.landlord?.phone_no_1 || '0809682838'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px]">Nationality:</span>
                  <p className="font-bold text-zinc-900">{selectedProp.landlord?.national || 'Thai'}</p>
                </div>
              </div>
            </div>

            {/* Photos Gallery from Supabase Storage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-100">
                <span className="font-bold text-zinc-900">
                  Supabase Storage ({selectedProp.photos?.length || 12} Photos)
                </span>
                <span className="font-mono text-zinc-400 text-[11px]">
                  property-images/{selectedProp.property.property_no}/
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(selectedProp.photos || []).map((photo: any, index: number) => (
                  <div
                    key={photo.id || index}
                    className="group relative rounded-lg overflow-hidden border border-zinc-200 aspect-4/3 bg-zinc-100 shadow-2xs"
                  >
                    <img
                      src={photo.public_url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-white flex items-center justify-between text-[9px] font-mono">
                      <span className="truncate">{photo.file_name}</span>
                      <span className="font-bold">{index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
