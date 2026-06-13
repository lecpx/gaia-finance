import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { GoldRecord } from '../api/client';
import { Banknote, Check, CircleDollarSign, Coins, Download, Edit3, Gem, Plus, Search, Trash2, X } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import { formatVnd, todayDateStr } from '../utils/format';

const createRecord = (): GoldRecord => ({
  gold_type: 'SJC',
  quantity: 0,
  buy_price: 0,
  buy_date: todayDateStr,
  note: '',
});

const Gold: React.FC = () => {
  const [gold, setGold] = useState<GoldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState<GoldRecord>(createRecord);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftRecord, setDraftRecord] = useState<GoldRecord | null>(null);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    setLoading(true);
    api.getGold()
      .then((goldData) => {
        setGold(goldData);
        setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      })
      .catch(() => toast('Không thể tải dữ liệu vàng.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    api.addGold(newRecord)
      .then(() => {
        setNewRecord(createRecord());
        setShowForm(false);
        toast('Đã thêm giao dịch.');
        fetchData();
      })
      .catch(() => toast('Không thể lưu giao dịch mới.', 'error'))
      .finally(() => setSaving(false));
  }, [newRecord, fetchData, toast]);

  const handleDelete = useCallback(() => {
    if (confirmIndex === null) return;
    const updated = gold.filter((_, i) => i !== confirmIndex);
    api.updateGold(updated)
      .then(() => { toast('Đã xóa giao dịch.'); setConfirmIndex(null); fetchData(); })
      .catch(() => toast('Xóa thất bại.', 'error'));
  }, [gold, confirmIndex, fetchData, toast]);

  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setDraftRecord({ ...gold[index] });
  }, [gold]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setDraftRecord(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingIndex === null || !draftRecord) return;
    setSaving(true);
    const updated = gold.map((item, index) => index === editingIndex ? draftRecord : item);
    api.updateGold(updated)
      .then(() => {
        setEditingIndex(null);
        setDraftRecord(null);
        toast('Đã lưu thay đổi.');
        fetchData();
      })
      .catch(() => toast('Lưu thất bại.', 'error'))
      .finally(() => setSaving(false));
  }, [editingIndex, draftRecord, gold, fetchData, toast]);

  const totalQuantity = useMemo(() => gold.reduce((sum, item) => sum + item.quantity, 0), [gold]);
  const totalInvestment = useMemo(() => gold.reduce((sum, item) => sum + (item.quantity * item.buy_price), 0), [gold]);
  const avgPrice = useMemo(() => totalQuantity > 0 ? totalInvestment / totalQuantity : 0, [totalInvestment, totalQuantity]);
  const filteredGold = useMemo(() => {
    if (!search.trim()) return gold;
    const q = search.toLowerCase();
    return gold.filter(item => item.gold_type.toLowerCase().includes(q) || (item.note ?? '').toLowerCase().includes(q));
  }, [gold, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-64 skeleton" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-32 skeleton" />
          <div className="h-32 skeleton" />
          <div className="h-32 skeleton" />
        </div>
        <div className="h-40 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Tích lũy vàng</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Quản lý giao dịch vàng theo khối lượng, giá vốn và ngày mua.</p>
          {lastRefreshed && <p className="mt-0.5 text-xs font-medium text-slate-400">Cập nhật lúc {lastRefreshed}</p>}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'secondary-button' : 'primary-button'}
        >
          {showForm ? <X size={17} /> : <Plus size={17} />}
          {showForm ? 'Đóng' : 'Thêm giao dịch'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetricCard
          label="Tổng khối lượng"
          value={`${totalQuantity.toFixed(1)} chỉ`}
          caption={`${(totalQuantity / 10).toFixed(2)} lượng`}
          icon={<Gem size={20} />}
          tone="amber"
          description="Tổng khối lượng vàng đang nắm giữ, tính theo đơn vị chỉ."
          formula="Cộng Số lượng chỉ của toàn bộ giao dịch"
        />
        <MetricCard
          label="Vốn đầu tư"
          value={formatVnd(totalInvestment)}
          caption={`${gold.length} giao dịch`}
          icon={<Banknote size={20} />}
          tone="slate"
          description="Tổng tiền đã bỏ ra để mua vàng theo các giao dịch đã nhập."
          formula="Tổng từng giao dịch: Số lượng chỉ x Giá mua/chỉ"
        />
        <MetricCard
          label="Giá vốn trung bình"
          value={formatVnd(avgPrice)}
          caption="Theo mỗi chỉ"
          icon={<CircleDollarSign size={20} />}
          tone="emerald"
          description="Giá vốn bình quân của mỗi chỉ vàng trong danh mục."
          formula="Tổng vốn đầu tư / Tổng số chỉ"
        />
      </div>



      {showForm && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Thông tin giao dịch</h3>
              <p className="mt-1 text-sm text-slate-500">Ghi nhận theo đơn vị chỉ và giá mua thực tế.</p>
            </div>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="field-label">Loại vàng</span>
              <select
                className="field-input"
                value={newRecord.gold_type}
                onChange={e => setNewRecord({ ...newRecord, gold_type: e.target.value })}
              >
                <option value="SJC">SJC</option>
                <option value="PNJ">PNJ</option>
                <option value="DOJI">DOJI</option>
                <option value="BTMH">BTMH</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="field-label">Số lượng</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                className="field-input"
                value={newRecord.quantity ?? ''}
                onChange={e => setNewRecord({ ...newRecord, quantity: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Giá mua</span>
              <input
                type="number"
                min="0"
                required
                className="field-input"
                value={newRecord.buy_price ?? ''}
                onChange={e => setNewRecord({ ...newRecord, buy_price: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Ngày mua (dd/mm/yyyy)</span>
              <input
                type="text"
                required
                pattern="\d{2}/\d{2}/\d{4}"
                placeholder="dd/mm/yyyy"
                className="field-input"
                value={newRecord.buy_date}
                onChange={e => setNewRecord({ ...newRecord, buy_date: e.target.value })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Ghi chú</span>
              <input
                type="text"
                placeholder="Mua tại PNJ..."
                className="field-input"
                value={newRecord.note ?? ''}
                onChange={e => setNewRecord({ ...newRecord, note: e.target.value })}
              />
            </label>
            <div className="md:col-span-2 xl:col-span-5 flex justify-end">
              <button type="submit" className="primary-button" disabled={saving}>
                <Plus size={17} />
                {saving ? 'Đang lưu...' : 'Lưu giao dịch'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="panel-header flex-col gap-3 sm:flex-row">
          <div>
            <h3 className="text-base font-bold text-slate-950">Danh sách giao dịch</h3>
            <p className="mt-1 text-sm text-slate-500">Giá vốn được tính theo từng dòng giao dịch.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm giao dịch..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 w-44 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              onClick={() => {
                const csv = [['Loại vàng','Số lượng','Giá mua','Ngày mua','Ghi chú'] as string[], ...gold.map(g => [g.gold_type, g.quantity.toString(), g.buy_price.toString(), g.buy_date, g.note ?? ''])]
                  .map(row => row.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'giao-dich-vang.csv'; a.click();
                URL.revokeObjectURL(url);
                toast('Đã tải file CSV.');
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Loại vàng</th>
                <th className="text-right">Số lượng</th>
                <th className="text-right">Giá mua</th>
                <th className="text-right">Thành tiền</th>
                <th>Ngày mua</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredGold.map((item, index) => {
                const isEditing = editingIndex === index && draftRecord;
                const current = isEditing ? draftRecord : item;

                return (
                <tr key={`${item.gold_type}-${item.buy_date}-${index}`}>
                  <td>
                    {isEditing ? (
                      <div className="space-y-2">
                        <select
                          className="table-input min-w-28"
                          value={current.gold_type}
                          onChange={e => setDraftRecord({ ...current, gold_type: e.target.value })}
                        >
                          <option value="SJC">SJC</option>
                          <option value="PNJ">PNJ</option>
                          <option value="DOJI">DOJI</option>
                          <option value="BTMH">BTMH</option>
                        </select>
                        <input
                          className="table-input min-w-36"
                          placeholder="Ghi chú"
                          value={current.note ?? ''}
                          onChange={e => setDraftRecord({ ...current, note: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                          <Coins size={17} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-950">{item.gold_type}</div>
                          <div className="text-xs font-medium text-slate-500">{item.note || 'Giao dịch vàng'}</div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="text-right font-semibold text-slate-700">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="table-input text-right"
                        value={current.quantity ?? ''}
                        onChange={e => setDraftRecord({ ...current, quantity: Number(e.target.value) })}
                      />
                    ) : `${item.quantity.toFixed(1)} chỉ`}
                  </td>
                  <td className="text-right font-medium text-slate-600">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        className="table-input text-right"
                        value={current.buy_price ?? ''}
                        onChange={e => setDraftRecord({ ...current, buy_price: Number(e.target.value) })}
                      />
                    ) : formatVnd(item.buy_price)}
                  </td>
                  <td className="text-right font-bold text-slate-950">{formatVnd(current.quantity * current.buy_price)}</td>
                  <td className="font-medium text-slate-600">
                    {isEditing ? (
                      <input
                        className="table-input min-w-28"
                        value={current.buy_date}
                        onChange={e => setDraftRecord({ ...current, buy_date: e.target.value })}
                      />
                    ) : item.buy_date}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                            aria-label={`Lưu giao dịch ${item.gold_type}`}
                          >
                            <Check size={17} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
                            aria-label="Hủy sửa"
                          >
                            <X size={17} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(index)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                            aria-label={`Sửa giao dịch ${item.gold_type}`}
                          >
                            <Edit3 size={17} />
                          </button>
                          <button
                            onClick={() => setConfirmIndex(index)}
                            className="icon-button"
                            aria-label={`Xóa giao dịch ${item.gold_type}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredGold.length === 0 && (
          <div className="px-6 py-16 text-center text-sm font-medium text-slate-400">
            {search ? 'Không tìm thấy giao dịch nào.' : 'Chưa có giao dịch vàng nào.'}
          </div>
        )}
      </section>

      <Confirm
        open={confirmIndex !== null}
        title="Xóa giao dịch vàng"
        message="Giao dịch này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setConfirmIndex(null)}
      />
    </div>
  );
};

export default Gold;
