import React, { useState } from 'react';
import { Installation, Customer } from '../../types';
import { Briefcase, Search, CheckCircle2, Clock, Calendar, ArrowRight, UserCheck } from 'lucide-react';

interface ProjectsViewProps {
  installations: Installation[];
  onNavigateToInstallation: (id: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ installations, onNavigateToInstallation }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = installations.filter(i => 
    i.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-12">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Proje veya müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-500 font-semibold">{filtered.length} Proje / Taahhüt</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(inst => {
          const completedTasks = inst.checklist.filter(c => c.isCompleted).length;
          const totalTasks = inst.checklist.length;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return (
            <div key={inst.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-700">{inst.installationNumber}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    inst.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {inst.status === 'completed' ? 'Tamamlandı' : 'Saha Çalışması Devam Ediyor'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{inst.projectName}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{inst.customerName}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{inst.tasksDescription}</p>

                {/* İlerleme Çubuğu */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500">Montaj & Test İlerlemesi</span>
                    <span className="text-blue-700">%{progress}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${progress === 100 ? 'bg-emerald-600' : 'bg-blue-600'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {inst.scheduledDate}
                  </span>
                  <span>{inst.assignedTechnicians.map(t => t.fullName).join(', ')}</span>
                </div>
              </div>

              <button
                onClick={() => onNavigateToInstallation(inst.id)}
                className="mt-4 w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                İş Emrini İncele & Checklist <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
