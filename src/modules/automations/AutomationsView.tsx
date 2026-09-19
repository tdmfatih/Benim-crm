import React, { useState } from 'react';
import { AutomationRule } from '../../types';
import { Zap, CheckCircle2, Clock, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

interface AutomationsViewProps {
  rules: AutomationRule[];
  onSaveRules: (rules: AutomationRule[]) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({ rules, onSaveRules }) => {
  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => {
      if (r.id === id) {
        const nextActive = r.isActive === false ? true : false;
        return { ...r, isActive: nextActive, isEnabled: nextActive };
      }
      return r;
    });
    onSaveRules(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">Otomasyon Motoru & Tetikleyici Kurallar</h3>
        </div>
        <p className="text-xs text-slate-500">
          Sistem olayları (Teklif Onayı, Servis Kabulü, Montaj Teslimatı) gerçekleştiğinde otomatik çalışan aksiyonlar.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map(rule => {
          const isRuleActive = rule.isActive !== false;
          return (
            <div
              key={rule.id}
              className={`p-4 rounded-2xl border transition bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
                isRuleActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{rule.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isRuleActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isRuleActive ? 'Aktif' : 'Devre Dışı'}
                  </span>
                </div>

                <p className="text-xs text-slate-500">{rule.description}</p>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 font-medium">
                  <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-mono">
                    Olay: {rule.trigger}
                  </span>
                  <ArrowRight size={12} className="text-slate-400" />
                  <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-mono">
                    Aksiyon: {rule.actionType}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleToggleRule(rule.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  isRuleActive
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isRuleActive ? 'Kuralı Durdur' : 'Kuralı Başlat'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
