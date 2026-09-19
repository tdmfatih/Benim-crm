import React, { useState } from 'react';
import { Product, ProductCategory, StockMovement } from '../../types';
import { storage } from '../../services/storageService';
import { RBACService } from '../../services/rbacService';
import { 
  Plus, Search, Package, AlertTriangle, ArrowUpDown, 
  Tag, ShieldAlert, CheckCircle2, Image as ImageIcon, Camera, Upload, Eye, X
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  onSaveProducts: (products: Product[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ products, onSaveProducts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustReason, setAdjustReason] = useState('');
  const [previewProductImage, setPreviewProductImage] = useState<{ url: string; title: string } | null>(null);

  const canViewCost = RBACService.canViewCost();

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  const categories = [
    'Güvenlik Kamerası Sistemleri',
    'Hırsız Alarm Sistemleri',
    'Yangın Algılama Sistemleri',
    'Network / Ağ Kurulumu',
    'Akıllı Ev ve Ofis Sistemleri',
    'Barkod ve Adisyon Sistemleri',
    'Anten ve Uydu Sistemleri',
    'Profesyonel Ses Sistemleri',
    'Bilgisayar Tamir ve IT Hizmetleri',
    'Yedek Parça ve Sarf Malzeme',
  ];

  const filtered = products.filter(p => {
    const matchSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const currentQty = adjustingProduct.stockQuantity ?? adjustingProduct.currentStock ?? 0;
    const delta = adjustType === 'in' ? adjustQty : -adjustQty;
    const newQty = Math.max(0, currentQty + delta);

    const movement: StockMovement = {
      id: 'mov-' + Date.now(),
      productId: adjustingProduct.id,
      productName: adjustingProduct.name,
      type: adjustType,
      quantityChange: delta,
      unitPrice: adjustingProduct.purchasePrice || 0,
      previousStock: currentQty,
      newStock: newQty,
      referenceType: 'manual_adjustment',
      referenceNumber: 'MANUEL',
      note: adjustReason || (adjustType === 'in' ? 'Depo sayım fazlası / İrsaliye' : 'Montaj sarfiyatı / Zayiat'),
      createdAt: new Date().toISOString(),
      performedBy: storage.getCurrentUser().fullName,
    };

    const updated = products.map(p => {
      if (p.id === adjustingProduct.id) {
        return {
          ...p,
          currentStock: newQty,
          stockQuantity: newQty,
          stockMovements: [movement, ...(p.stockMovements || [])],
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    onSaveProducts(updated);
    storage.logAudit(
      'STOCK_ADJUSTED',
      'inventory',
      adjustingProduct.id,
      adjustingProduct.name,
      { oldStock: adjustingProduct.stockQuantity },
      { newStock: newQty, delta, reason: adjustReason }
    );

    setAdjustingProduct(null);
    setAdjustQty(1);
    setAdjustReason('');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Üst Filtre Barı */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Ürün adı, SKU veya marka ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Yeni Ürün / Stok Kartı
        </button>
      </div>

      {/* Ürün & Stok Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3 text-center w-14">Görsel</th>
                <th className="py-3 px-4">Ürün Tanımı & SKU</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Mevcut Stok</th>
                {canViewCost && <th className="py-3 px-4 text-right bg-amber-50/50 text-amber-900">Alış (Maliyet)</th>}
                <th className="py-3 px-4 text-right">Satış Fiyatı</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(prod => {
                const stock = prod.stockQuantity ?? prod.currentStock ?? 0;
                const minAlert = prod.minStockAlert ?? prod.minStockLevel ?? 5;
                const isLowStock = stock <= minAlert;
                return (
                  <tr key={prod.id} className="hover:bg-slate-50 transition group">
                    {/* Ürün Görseli Minyatür & Tıklanınca Büyük Önizleme */}
                    <td className="py-2.5 px-3 text-center">
                      {prod.imageUrl ? (
                        <div 
                          onClick={() => setPreviewProductImage({ url: prod.imageUrl!, title: prod.name })}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-xs cursor-pointer hover:opacity-80 transition relative mx-auto group/img"
                          title="Büyütmek için tıklayın"
                        >
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.name} 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition">
                            <Eye size={13} />
                          </div>
                        </div>
                      ) : (
                        <label 
                          className="w-10 h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center mx-auto text-slate-400 hover:text-blue-600 hover:border-blue-400 cursor-pointer transition"
                          title="Ürüne Fotoğraf Ekle"
                        >
                          <Camera size={15} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    const updated = products.map(p => 
                                      p.id === prod.id ? { ...p, imageUrl: event.target?.result as string } : p
                                    );
                                    onSaveProducts(updated);
                                    storage.saveProducts(updated);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {prod.sku} {prod.brand ? `• ${prod.brand}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-extrabold ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                        {prod.stockQuantity}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">{prod.unit}</span>
                    </td>
                    {canViewCost && (
                      <td className="py-3 px-4 text-right font-mono text-amber-900 bg-amber-50/20">
                        {formatMoney(prod.purchasePrice)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatMoney(prod.salePrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          <AlertTriangle size={12} /> Kritik Stok
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={12} /> Yeterli
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setAdjustingProduct(prod)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 rounded-lg font-bold text-[11px]"
                      >
                        Stok Giriş/Çıkış
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* STOK HAREKETİ MODALI */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Hızlı Stok Hareketi</h3>
              <button onClick={() => setAdjustingProduct(null)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-900">{adjustingProduct.name}</div>
                <div className="text-slate-500 mt-0.5">
                  Mevcut Stok: <strong>{adjustingProduct.stockQuantity} {adjustingProduct.unit}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="adjType"
                    checked={adjustType === 'in'}
                    onChange={() => setAdjustType('in')}
                  />
                  <span>+ Depo Girişi</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="adjType"
                    checked={adjustType === 'out'}
                    onChange={() => setAdjustType('out')}
                  />
                  <span>- Depo Çıkışı</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Miktar ({adjustingProduct.unit})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Açıklama / Referans</label>
                <input
                  type="text"
                  placeholder="İrsaliye no veya montaj kullanım notu..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Hareketi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YENİ ÜRÜN KARTI MODALI */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Yeni Ürün / Stok Kartı</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400">✕</button>
            </div>

            <NewProductForm
              categories={categories}
              onClose={() => setShowNewModal(false)}
              onSave={(newProd) => {
                const updated = [newProd, ...products];
                onSaveProducts(updated);
                setShowNewModal(false);
                storage.logAudit('PRODUCT_CREATED', 'inventory', newProd.id, newProd.name, null, newProd);
              }}
            />
          </div>
        </div>
      )}

      {/* ÜRÜN GÖRSELİ BÜYÜK ÖNİZLEME MODALI (LIGHTBOX) */}
      {previewProductImage && (
        <div 
          onClick={() => setPreviewProductImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="font-bold text-slate-900 text-sm truncate pr-2">
                {previewProductImage.title}
              </div>
              <button 
                onClick={() => setPreviewProductImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-100/60 max-h-[70vh]">
              <img 
                src={previewProductImage.url} 
                alt={previewProductImage.title} 
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xs" 
              />
            </div>
            <div className="p-3 bg-white flex justify-end">
              <button
                onClick={() => setPreviewProductImage(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Alt Form: Yeni Ürün Ekleme
interface NewProductFormProps {
  categories: string[];
  onClose: () => void;
  onSave: (product: Product) => void;
}

const NewProductForm: React.FC<NewProductFormProps> = ({ categories, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('3AS-' + Math.floor(1000 + Math.random() * 9000));
  const [category, setCategory] = useState(categories[0]);
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('Adet');
  const [imageUrl, setImageUrl] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(1000);
  const [salePrice, setSalePrice] = useState(1500);
  const [stockQuantity, setStockQuantity] = useState(5);
  const [minStockAlert, setMinStockAlert] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProd: Product = {
      id: 'prod-' + Date.now(),
      name,
      sku,
      category: category as any,
      brand,
      unit,
      imageUrl: imageUrl || undefined,
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      vatRate: 20,
      currentStock: Number(stockQuantity),
      stockQuantity: Number(stockQuantity),
      minStockLevel: Number(minStockAlert),
      minStockAlert: Number(minStockAlert),
      isServiceItem: false,
      isActive: true,
      stockMovements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newProd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      {/* Ürün Fotoğrafı / Görsel Yükleme */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-blue-900">
            <ImageIcon size={14} className="text-blue-600" /> Ürün Görseli / Fotoğrafı
          </span>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="text-[10px] text-red-500 font-bold hover:underline"
            >
              Fotoğrafı Kaldır
            </button>
          )}
        </label>

        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt="Önizleme" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={20} className="text-slate-300" />
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs shadow-2xs">
              <Upload size={13} /> Fotoğraf Seç / Çek
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setImageUrl(event.target.result as string);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            <input
              type="url"
              placeholder="Veya görsel URL adresi (https://...)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="block font-bold text-slate-700 mb-1">Ürün Adı <span className="text-red-500">*</span></label>
        <input
          type="text"
          required
          placeholder="Örn: 2MP Full HD Gece Görüşlü Bullet IP Kamera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">SKU / Kod</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Marka</label>
          <input
            type="text"
            placeholder="Dahua, Hikvision, Dell..."
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Birim</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="Adet">Adet</option>
            <option value="Metre">Metre</option>
            <option value="Set">Set</option>
            <option value="Paket">Paket</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Alış Fiyatı (TL)</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Satış Fiyatı (TL)</label>
          <input
            type="number"
            value={salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Açılış Stok Miktarı</label>
          <input
            type="number"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Kritik Stok Uyarısı</label>
          <input
            type="number"
            value={minStockAlert}
            onChange={(e) => setMinStockAlert(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          İptal
        </button>
        <button
          type="submit"
          className="px-4 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Ürünü Kaydet
        </button>
      </div>
    </form>
  );
};
