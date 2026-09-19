import React, { useState } from 'react';
import { Installation, ServiceTicket, Lead } from '../../types';
import { Calendar, Clock, MapPin, Wrench, Eye, ShieldCheck, UserCheck } from 'lucide-react';

interface CalendarViewProps {
  installations: Installation[];
  services: ServiceTicket[];
  leads: Lead[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  installations,
  services,
  leads,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'installation' | 'discovery' | 'service'>('all');

  // Unified calendar items
  const events = [
    ...installations.map(i => ({
      id: i.id,
      type: 'installation' as const,
      title: `Montaj: ${i.projectName}`,
      customer: i.customerName,
      date: i.scheduledDate,
      time: i.scheduledTime,
      address: i.fullAddress,
      assigned: i.assignedTechnicians.map(t => t.fullName).join(', '),
      status: i.status,
    })),
    ...leads.filter(l => l.discoveryDate).map(l => ({
      id: l.id,
      type: 'discovery' as const,
      title: `Ücretsiz Keşif: ${l.serviceCategory}`,
      customer: l.contactName,
      date: l.discoveryDate!,
      time: '14:00',
      address: l.company || 'Müşteri Lokasyonu',
      assigned: l.assignedToUserName,
      status: l.status,
    })),
    ...services.map(s => ({
      id: s.id,
      type: 'service' as const,
      title: `Teknik Servis: ${s.brand} ${s.model}`,
      customer: s.customerName,
      date: s.createdAt.split('T')[0],
      time: '11:00',
      address: '3AS Teknoloji Servis Masası',
      assigned: s.assignedTechnicianName || 'Servis Departmanı',
      status: s.status,
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = events.filter(e => filterType === 'all' || e.type === filterType);

  return (
    <div className="space-y-5 pb-12">
      {/* Filtre Barı */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tüm Randevular ({events.length})
          </button>
          <button
            onClick={() => setFilterType('installation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'installation' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Saha Montajları
          </button>
          <button
            onClick={() => setFilterType('discovery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'discovery' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ücretsiz Keşifler
          </button>
          <button
            onClick={() => setFilterType('service')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'service' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Teknik Servis
          </button>
        </div>
      </div>

      {/* Randevu Kartları */}
      <div className="space-y-3">
        {filtered.map(e => (
          <div
            key={e.id + e.type}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl text-white ${
                e.type === 'installation' ? 'bg-emerald-600' :
                e.type === 'discovery' ? 'bg-blue-600' : 'bg-purple-600'
              }`}>
                {e.type === 'installation' ? <Wrench size={18} /> :
                 e.type === 'discovery' ? <Eye size={18} /> : <Wrench size={18} />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{e.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    e.type === 'installation' ? 'bg-emerald-100 text-emerald-800' :
                    e.type === 'discovery' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {e.type === 'installation' ? 'Saha Montajı' :
                     e.type === 'discovery' ? 'Saha Keşfi' : 'Servis'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 font-medium mt-0.5">{e.customer}</div>

                <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px] mt-1.5">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Calendar size={12} /> {e.date}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Clock size={12} /> {e.time}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin size={12} /> {e.address}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Görevli Personel</span>
              <span className="text-xs font-bold text-slate-800">{e.assigned}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
