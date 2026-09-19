import React, { useState } from 'react';
import { User, Role, PermissionKey } from '../../types';
import { storage } from '../../services/storageService';
import { RBACService } from '../../services/rbacService';
import {
  Users, UserPlus, Shield, CheckCircle2, XCircle, Edit3, Trash2,
  KeyRound, Search, Filter, Lock, CheckSquare, Square, Eye, EyeOff,
  UserCheck, AlertTriangle, ArrowRightLeft, Sparkles, Building, Phone,
  Mail, ShieldAlert, ChevronRight, X
} from 'lucide-react';

interface UserManagementViewProps {
  users: User[];
  roles: Role[];
  currentUser: User;
  onUsersChange: (users: User[]) => void;
  onSwitchUser?: (userId: string) => void;
}

// Permission Category Metadata for intuitive UI
interface PermissionGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  items: {
    key: PermissionKey;
    label: string;
    description: string;
    isCritical?: boolean;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'crm',
    title: 'CRM & Müşteri Adayları (Lead)',
    icon: Users,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    items: [
      { key: 'crm.view', label: 'Leadleri Görüntüleme', description: 'Gelen potansiyel talepleri ve keşif listesini inceler' },
      { key: 'crm.edit', label: 'Lead Oluşturma & Düzenleme', description: 'Yeni lead açar, durumunu değiştirir, not ve aktivite ekler' },
      { key: 'crm.delete', label: 'Lead Silme', description: 'Talep ve potansiyel müşteri kayıtlarını kalıcı olarak siler' },
    ],
  },
  {
    id: 'customers',
    title: 'Müşteri (Cari) Yönetimi',
    icon: UserCheck,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    items: [
      { key: 'customers.view', label: 'Müşterileri Görüntüleme', description: 'Kayıtlı bireysel ve kurumsal müşterileri inceler' },
      { key: 'customers.edit', label: 'Müşteri Ekleme & Güncelleme', description: 'Yeni cari kartı açar, telefon, adres ve vergi bilgisi düzenler' },
      { key: 'customers.delete', label: 'Müşteri Silme', description: 'Kayıtlı cari müşteriyi sistemden siler' },
    ],
  },
  {
    id: 'offers',
    title: 'Teklif & Fiyatlandırma Yönetimi',
    icon: Shield,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    items: [
      { key: 'offers.view', label: 'Teklifleri Görüntüleme', description: 'Hazırlanan satış ve proje tekliflerini görüntüler' },
      { key: 'offers.create', label: 'Yeni Teklif Hazırlama', description: 'Yeni teklif taslağı oluşturur, ürün ve işçilik ekler' },
      { key: 'offers.edit', label: 'Teklif Düzenleme & İskonto', description: 'Fiyatları, revizyonları günceller ve iskonto uygular' },
      { key: 'offers.delete', label: 'Teklif Silme', description: 'Teklif kayıtlarını sistemden siler' },
      { key: 'offers.view_cost', label: 'Alış Maliyeti & Kâr Marjı Görme', description: 'Ürünlerin toptan alış maliyetlerini ve şirket kârını görür', isCritical: true },
    ],
  },
  {
    id: 'installation',
    title: 'Saha Montaj & Proje Operasyonları',
    icon: Shield,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    items: [
      { key: 'installation.view', label: 'Saha & Montaj Planını Görme', description: 'Montaj iş emirlerini ve teknisyen takvimini inceler' },
      { key: 'installation.edit', label: 'Montaj Düzenleme & Ekip Atama', description: 'Saha teknisyeni atar, malzeme düşümü yapar, montaj durumunu günceller' },
      { key: 'installation.complete', label: 'Montaj Teslim Tutanak Onayı', description: 'İşi tamamlar ve müşteriye dijital teslim tutanağı imzalattırır' },
    ],
  },
  {
    id: 'service',
    title: 'Teknik Servis & Arıza Masası',
    icon: KeyRound,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    items: [
      { key: 'service.view', label: 'Teknik Servis Kayıtlarını Görme', description: 'Gelen cihazları, arıza fişlerini ve durumlarını inceler' },
      { key: 'service.edit', label: 'Cihaz Kabul & Teşhis / Parça Ekleme', description: 'Cihaz girişi yapar, arıza teşhisi koyar, yedek parça ve onarım ücreti girer' },
      { key: 'service.approve_override', label: 'Müşteri Onayını Yetkili Olarak Aşma', description: 'Bekleyen müşteri arıza onayını yetkili müdahalesi ile onaylar' },
    ],
  },
  {
    id: 'inventory',
    title: 'Stok & Depo Yönetimi',
    icon: Shield,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    items: [
      { key: 'inventory.view', label: 'Stok Miktarlarını Görme', description: 'Depo stok adetlerini ve kritik stok uyarılarını görür' },
      { key: 'inventory.edit', label: 'Ürün Ekleme & Fiyat Düzenleme', description: 'Yeni ürün, kamera veya yedek parça tanımlar, liste fiyatını belirler' },
      { key: 'inventory.adjust', label: 'Manuel Stok Düzeltmesi & Sayım', description: 'Depo sayım farkı düzeltir ve manuel stok hareketi girer' },
    ],
  },
  {
    id: 'finance',
    title: 'Finans, Fatura & Tahsilat',
    icon: Shield,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    items: [
      { key: 'invoice.view', label: 'Faturaları Görüntüleme', description: 'Kesilen resmi faturaları ve e-arşiv dökümlerini görür' },
      { key: 'invoice.create', label: 'Yeni Fatura Kesme', description: 'Tekliften veya servisten resmi fatura oluşturur' },
      { key: 'payments.manage', label: 'Tahsilat & Ödeme Girişi', description: 'Nakit, kredi kartı, havale tahsilat kaydeder' },
    ],
  },
  {
    id: 'system',
    title: 'Yönetim, Ayarlar & Güvenlik',
    icon: Lock,
    color: 'text-slate-800 bg-slate-100 border-slate-300',
    items: [
      { key: 'reports.view', label: 'Mali & Performans Raporları', description: 'Ciro, kâr, teknisyen performansı ve analiz grafiklerini inceler' },
      { key: 'automations.manage', label: 'Otomasyon & WhatsApp Yönetimi', description: 'WhatsApp bildirim kurallarını ve otomatik tetikleyicileri yönetir' },
      { key: 'users.manage', label: 'Kullanıcı Açma & Yetki Belirleme', description: 'Sisteme yeni personel ekler, rolleri ve tek tek yetkileri seçer', isCritical: true },
      { key: 'settings.manage', label: 'Sistem & Şirket Ayarlarını Düzenleme', description: 'Firma VKN, IBAN, fatura şartları ve yedekleme ayarlarını değiştirir', isCritical: true },
      { key: 'audit.view', label: 'Denetim İzi (Audit Log) İnceleme', description: 'Kimin ne zaman hangi kaydı değiştirdiğini izler' },
    ],
  },
];

const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  roles,
  currentUser,
  onUsersChange,
  onSwitchUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<'Yönetim' | 'Satış' | 'Teknik Servis' | 'Saha Montaj' | 'Muhasebe'>('Satış');
  const [roleId, setRoleId] = useState('role-sales');
  const [roleTitle, setRoleTitle] = useState('Yönetici / Satış');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [canViewCost, setCanViewCost] = useState(false);

  // Open modal for new user
  const handleOpenNewUserModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setDepartment('Satış');
    setRoleId('role-sales');
    setRoleTitle('Yönetici / Satış');
    setIsActive(true);
    setNotes('');

    // Pre-select permissions from role-sales template
    const templateRole = roles.find(r => r.id === 'role-sales');
    const initialPerms = templateRole ? [...templateRole.permissions] : [];
    setSelectedPermissions(initialPerms);
    setCanViewCost(initialPerms.includes('offers.view_cost'));
    setIsModalOpen(true);
  };

  // Open modal for editing existing user
  const handleOpenEditUserModal = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone);
    setDepartment((user.department as any) || 'Satış');
    setRoleId(user.roleId);
    setRoleTitle(user.roleTitle);
    setIsActive(user.isActive);
    setNotes(user.notes || '');

    // Load user's actual permissions (or fallback to role permissions)
    const effectivePerms = RBACService.getUserPermissions(user);
    setSelectedPermissions([...effectivePerms]);
    setCanViewCost(effectivePerms.includes('offers.view_cost'));
    setIsModalOpen(true);
  };

  // When role template dropdown changes in the form
  const handleRoleTemplateChange = (newRoleId: string) => {
    setRoleId(newRoleId);
    const selectedRole = roles.find(r => r.id === newRoleId);
    if (selectedRole) {
      setRoleTitle(selectedRole.name);
      // Automatically apply this template's permissions as initial base
      setSelectedPermissions([...selectedRole.permissions]);
      setCanViewCost(selectedRole.permissions.includes('offers.view_cost'));
    }
  };

  // Toggle individual permission checkbox
  const togglePermission = (key: PermissionKey) => {
    setSelectedPermissions(prev => {
      let updated: PermissionKey[];
      if (prev.includes(key)) {
        updated = prev.filter(k => k !== key);
      } else {
        updated = [...prev, key];
      }

      if (key === 'offers.view_cost') {
        setCanViewCost(updated.includes('offers.view_cost'));
      }
      return updated;
    });
  };

  // Bulk actions for permissions
  const handleSelectAll = () => {
    setSelectedPermissions([...ALL_PERMISSION_KEYS]);
    setCanViewCost(true);
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
    setCanViewCost(false);
  };

  const handleSelectReadOnly = () => {
    const viewOnly = ALL_PERMISSION_KEYS.filter(k => k.endsWith('.view'));
    setSelectedPermissions(viewOnly);
    setCanViewCost(false);
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('Lütfen personelin adını ve soyadını giriniz.');
      return;
    }
    if (!email.trim()) {
      alert('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    const effectivePermissions = [...selectedPermissions];
    if (canViewCost && !effectivePermissions.includes('offers.view_cost')) {
      effectivePermissions.push('offers.view_cost');
    } else if (!canViewCost && effectivePermissions.includes('offers.view_cost')) {
      const idx = effectivePermissions.indexOf('offers.view_cost');
      if (idx !== -1) effectivePermissions.splice(idx, 1);
    }

    let updatedUsers: User[];

    if (editingUser) {
      // Update existing user
      updatedUsers = users.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            department,
            roleId,
            roleTitle,
            isActive,
            notes: notes.trim(),
            permissions: effectivePermissions,
            canViewCost,
          };
        }
        return u;
      });

      storage.logAudit(
        'USER_UPDATED',
        'user' as any,
        editingUser.id,
        `${fullName} (${roleTitle}) Yetki & Bilgileri Güncellendi`,
        editingUser,
        { roleTitle, department, permissionsCount: effectivePermissions.length }
      );
    } else {
      // Create new user
      const newUser: User = {
        id: 'usr-' + Date.now(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || '0530 000 00 00',
        department,
        roleId,
        roleTitle,
        isActive,
        notes: notes.trim(),
        permissions: effectivePermissions,
        canViewCost,
        createdAt: new Date().toISOString(),
      };

      updatedUsers = [...users, newUser];

      storage.logAudit(
        'USER_CREATED',
        'user' as any,
        newUser.id,
        `Yeni Personel Açıldı: ${fullName} (${roleTitle})`,
        null,
        { email, department, permissionsCount: effectivePermissions.length }
      );
    }

    storage.saveUsers(updatedUsers);
    onUsersChange(updatedUsers);
    setIsModalOpen(false);
  };

  // Toggle user active status
  const handleToggleUserStatus = (user: User) => {
    if (user.id === 'usr-1' || user.email === 'tdmfatih.FD@gmail.com') {
      alert('Ana yönetici hesabı pasife alınamaz.');
      return;
    }

    const updated = users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u);
    storage.saveUsers(updated);
    onUsersChange(updated);
    storage.logAudit(
      'USER_STATUS_TOGGLED',
      'user' as any,
      user.id,
      `${user.fullName} kullanıcısı ${!user.isActive ? 'Aktif' : 'Pasif'} yapıldı.`
    );
  };

  // Delete user
  const handleDeleteUser = (user: User) => {
    if (user.id === 'usr-1' || user.email === 'tdmfatih.FD@gmail.com') {
      alert('Ana yönetici hesabı silinemez.');
      return;
    }

    if (confirm(`"${user.fullName}" isimli kullanıcıyı sistemden silmek istediğinize emin misiniz?`)) {
      const updated = users.filter(u => u.id !== user.id);
      storage.saveUsers(updated);
      onUsersChange(updated);
      storage.logAudit(
        'USER_DELETED',
        'user' as any,
        user.id,
        `${user.fullName} kullanıcısı sistemden silindi.`
      );
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm) ||
      u.roleTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'all' || u.department === selectedDept;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && u.isActive) ||
      (selectedStatus === 'inactive' && !u.isActive);

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Kullanıcı & Granüler Yetki Yönetimi</h1>
              <p className="text-xs text-slate-500">
                Yönetici olarak yeni personel açabilir, rollerini belirleyebilir ve hangi modülleri görüp hangi işlemleri yapabileceğini yetki matrisinden tek tek seçebilirsiniz.
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
              <CheckCircle2 size={13} /> Aktif Yönetici: {currentUser.fullName} ({currentUser.roleTitle})
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-medium">Toplam {users.length} Kayıtlı Kullanıcı</span>
          </div>
        </div>

        <button
          onClick={handleOpenNewUserModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 hover:shadow-md cursor-pointer"
        >
          <UserPlus size={16} /> Yeni Kullanıcı Aç & Yetkilendir
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="İsim, e-posta veya telefon ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 text-slate-500 shrink-0">
            <Filter size={13} /> Departman:
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">Tüm Departmanlar</option>
            <option value="Yönetim">Yönetim</option>
            <option value="Satış">Satış</option>
            <option value="Teknik Servis">Teknik Servis</option>
            <option value="Saha Montaj">Saha Montaj</option>
            <option value="Muhasebe">Muhasebe</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Yalnızca Aktif</option>
            <option value="inactive">Yalnızca Pasif</option>
          </select>
        </div>
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const isMe = user.id === currentUser.id;
          const isSuper = RBACService.isSuperAdmin(user);
          const perms = RBACService.getUserPermissions(user);
          const hasCostPermission = RBACService.canViewCost(user);

          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                isMe ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
              } ${!user.isActive ? 'opacity-70 bg-slate-50/70' : ''}`}
            >
              <div>
                {/* Header: Avatar, Name, Status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-xs shrink-0 ${
                      isSuper ? 'bg-[#2853a8]' : user.department === 'Satış' ? 'bg-amber-600' : user.department === 'Teknik Servis' ? 'bg-purple-600' : user.department === 'Saha Montaj' ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}>
                      {user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{user.fullName}</h3>
                        {isMe && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                            Siz
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 block">
                        {user.roleTitle}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {user.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                {/* Contact & Department Information */}
                <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">Departman: {user.department}</span>
                  </div>
                </div>

                {/* Permissions Summary Box */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Shield size={12} /> Tanımlı Yetki Durumu:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-blue-700">
                      {isSuper ? 'Tüm Yetkiler Açık' : `${perms.length} / ${ALL_PERMISSION_KEYS.length} İzin`}
                    </span>
                  </div>

                  {/* Badges preview */}
                  <div className="flex flex-wrap gap-1">
                    {isSuper ? (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                        Süper Yönetici (Sınırsız Erişim)
                      </span>
                    ) : (
                      <>
                        {perms.slice(0, 4).map(p => (
                          <span key={p} className="text-[10px] bg-white border border-slate-200 font-mono text-slate-600 px-1.5 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                        {perms.length > 4 && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                            +{perms.length - 4} diğer
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Cost View Permission Indicator */}
                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Maliyet & Kâr Marjı:</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      hasCostPermission ? 'text-amber-700' : 'text-slate-400'
                    }`}>
                      {hasCostPermission ? <Eye size={12} /> : <EyeOff size={12} />}
                      {hasCostPermission ? 'Görüntüleyebilir' : 'Gizli'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                <button
                  onClick={() => handleOpenEditUserModal(user)}
                  className="flex-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 size={13} /> Yetkileri Düzenle
                </button>

                {onSwitchUser && !isMe && (
                  <button
                    onClick={() => onSwitchUser(user.id)}
                    title="Bu kullanıcının yetkileriyle sistemi incele"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <ArrowRightLeft size={13} /> Test Et
                  </button>
                )}

                {user.id !== 'usr-1' && user.email !== 'tdmfatih.FD@gmail.com' && (
                  <button
                    onClick={() => handleDeleteUser(user)}
                    title="Kullanıcıyı Sil"
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: YENİ KULLANICI AÇMA & GRANÜLER YETKİ SEÇİMİ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold">
                    {editingUser ? `${editingUser.fullName} - Kullanıcı & Yetki Düzenleme` : 'Yeni Kullanıcı Aç & Yetkilerini Seç'}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Kullanıcı bilgilerini girin ve aşağıdaki yetki matrisinden yapabileceği işlemleri tek tek işaretleyin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs custom-scrollbar">
              {/* Bölüm 1: Personel Temel Bilgileri */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <UserCheck size={14} className="text-blue-600" /> 1. Personel Bilgileri & Departman
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ad Soyad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Ahmet Yılmaz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-Posta (Giriş ID) *</label>
                    <input
                      type="email"
                      required
                      placeholder="ahmet@3asteknoloji.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefon Numarası</label>
                    <input
                      type="text"
                      placeholder="0532 000 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Departman</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                    >
                      <option value="Yönetim">Yönetim</option>
                      <option value="Satış">Satış & Pazarlama</option>
                      <option value="Teknik Servis">Teknik Servis</option>
                      <option value="Saha Montaj">Saha & Montaj Operasyon</option>
                      <option value="Muhasebe">Ön Muhasebe & Finans</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Varsayılan Rol Şablonu
                    </label>
                    <select
                      value={roleId}
                      onChange={(e) => handleRoleTemplateChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hesap Durumu</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                        <input
                          type="radio"
                          name="status"
                          checked={isActive}
                          onChange={() => setIsActive(true)}
                          className="text-blue-600"
                        />
                        Aktif
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-500">
                        <input
                          type="radio"
                          name="status"
                          checked={!isActive}
                          onChange={() => setIsActive(false)}
                          className="text-slate-500"
                        />
                        Pasif (Giriş Kapalı)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bölüm 2: Yetki Matrisi ("Hangi kullanıcı ne yapabilir ben seçeyim") */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <KeyRound size={16} className="text-blue-600" />
                      2. Özel Yetki Seçimi ("Hangi İşlemleri Yapabilir?")
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Aşağıdaki kutucukları işaretleyerek veya kaldırarak bu kullanıcının yapabileceği her bir işlemi özelleştirebilirsiniz.
                    </p>
                  </div>

                  {/* Toplu İşlem Butonları */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition text-[11px] cursor-pointer"
                    >
                      Tümünü Seç ({ALL_PERMISSION_KEYS.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectReadOnly}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition text-[11px] cursor-pointer"
                    >
                      Sadece Görüntüleme
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-red-600 font-semibold rounded-lg transition text-[11px] cursor-pointer"
                    >
                      Temizle
                    </button>
                  </div>
                </div>

                {/* Granular Permission Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    const groupPermKeys = group.items.map(i => i.key);
                    const selectedInGroup = groupPermKeys.filter(k => selectedPermissions.includes(k)).length;
                    const isGroupAllSelected = selectedInGroup === groupPermKeys.length;

                    const toggleEntireGroup = () => {
                      if (isGroupAllSelected) {
                        setSelectedPermissions(prev => prev.filter(k => !groupPermKeys.includes(k)));
                      } else {
                        setSelectedPermissions(prev => Array.from(new Set([...prev, ...groupPermKeys])));
                      }
                    };

                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5 flex flex-col justify-between"
                      >
                        <div>
                          {/* Group Title Bar */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg border ${group.color}`}>
                                <GroupIcon size={14} />
                              </div>
                              <h4 className="font-bold text-slate-900 text-xs">{group.title}</h4>
                            </div>

                            <button
                              type="button"
                              onClick={toggleEntireGroup}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                            >
                              {isGroupAllSelected ? 'Grup Temizle' : 'Tüm Grubu Seç'}
                            </button>
                          </div>

                          {/* Items Checklist */}
                          <div className="space-y-2 mt-2">
                            {group.items.map((item) => {
                              const isChecked = selectedPermissions.includes(item.key);

                              return (
                                <label
                                  key={item.key}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    togglePermission(item.key);
                                  }}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition border select-none ${
                                    isChecked
                                      ? 'bg-blue-50/70 border-blue-200'
                                      : 'bg-slate-50/50 hover:bg-slate-100/60 border-transparent'
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0 text-blue-600">
                                    {isChecked ? (
                                      <CheckSquare size={16} className="text-blue-600" />
                                    ) : (
                                      <Square size={16} className="text-slate-400" />
                                    )}
                                  </div>

                                  <div className="flex-1 leading-snug">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`font-bold ${isChecked ? 'text-blue-900' : 'text-slate-800'}`}>
                                        {item.label}
                                      </span>
                                      {item.isCritical && (
                                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded text-[9px]">
                                          Kritik Yetki
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                                      {item.description}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 font-medium text-right pt-1">
                          {selectedInGroup} / {groupPermKeys.length} seçildi
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Toplam <span className="font-bold text-blue-700">{selectedPermissions.length}</span> adet yetki tanımlandı.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {editingUser ? 'Kullanıcı & Yetkileri Güncelle' : 'Kullanıcıyı Oluştur ve Kaydet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
