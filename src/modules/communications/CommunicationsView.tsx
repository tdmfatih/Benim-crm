import React, { useState } from 'react';
import { WhatsAppLog, WhatsAppTemplate } from '../../types';
import { WhatsAppService } from '../../services/whatsappService';
import { MessageSquare, CheckCheck, Clock, AlertCircle, Phone, Search, Send } from 'lucide-react';

interface CommunicationsViewProps {
  logs: WhatsAppLog[];
  templates: WhatsAppTemplate[];
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({ logs, templates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(templates[0] || null);

  const filteredLogs = logs.filter(l => 
    l.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.recipientPhone.includes(searchTerm) ||
    (l.content || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Şablonlar & Gönderim Geçmişi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon: WhatsApp Şablonları */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Otomatik WhatsApp Mesaj Şablonları</h3>
          </div>

          <div className="space-y-2">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                  selectedTemplate?.id === t.id
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="font-bold">{t.title}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.code}</div>
              </div>
            ))}
          </div>

          {selectedTemplate && (
            <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Şablon Önizlemesi</span>
              <p className="whitespace-pre-wrap text-slate-800 font-mono leading-relaxed text-[11px]">
                {selectedTemplate.content}
              </p>
            </div>
          )}
        </div>

        {/* Sağ Kolon: WhatsApp Giden Mesaj Günlüğü */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">WhatsApp İletişim & Gönderim Günlüğü</h3>
              <p className="text-xs text-slate-500">Müşterilere giden onay linkleri, servis ve montaj bildirimleri</p>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Alıcı veya mesaj ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {filteredLogs.map(l => (
              <div key={l.id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{l.recipientName}</span>
                    <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Phone size={11} /> {l.recipientPhone}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCheck size={12} /> {l.status === 'sent' || l.status === 'delivered' ? 'İletildi' : 'Gönderildi'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap font-sans">
                    {l.content}
                  </p>

                  <div className="text-[10px] text-slate-400">
                    {l.relatedEntity ? (
                      <>İlişkili Kayıt: <strong>{l.relatedEntity.type.toUpperCase()} #{l.relatedEntity.number}</strong> • </>
                    ) : null}
                    {new Date(l.sentAt).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
