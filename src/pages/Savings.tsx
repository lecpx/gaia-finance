import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { SavingRecord } from '../api/client';
import { AlertTriangle, Banknote, CalendarClock, CalendarRange, Check, Download, Edit3, Landmark, Percent, Plus, Search, Trash2, X } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import { addMonths, daysUntil, formatDate, formatVnd, parseDate, todayDateStr } from '../utils/format';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const getMaturityDate = (record: SavingRecord) => {
  const startDate = parseDate(record.start_date);
  return startDate ? addMonths(startDate, record.term) : null;
};

const createRecord = (): SavingRecord => ({
  bank: 'MB',
  amount: 0,
  interest_rate: 0,
  term: 12,
  start_date: todayDateStr,
});

const Savings: React.FC = () => {
  const [savings, setSavings] = useState<SavingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState<SavingRecord>(createRecord);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftRecord, setDraftRecord] = useState<SavingRecord | null>(null);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    api.getSavings()
      .then(data => { setSavings(data); setLastRefreshed(new Date().toLocaleTimeString('vi-VN')); })
      .catch(() => toast('Không thể tải dữ liệu tiết kiệm.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    api.addSaving(newRecord)
      .then(() => {
        setNewRecord(createRecord());
        setShowForm(false);
        toast('Đã thêm sổ mới.');
        fetchData();
      })
      .catch(() => toast('Không thể lưu sổ mới.', 'error'))
      .finally(() => setSaving(false));
  }, [newRecord, fetchData, toast]);

  const handleDelete = useCallback(() => {
    if (confirmIndex === null) return;
    const updated = savings.filter((_, i) => i !== confirmIndex);
    api.updateSavings(updated)
      .then(() => { toast('Đã xóa sổ.'); setConfirmIndex(null); fetchData(); })
      .catch(() => toast('Xóa thất bại.', 'error'));
  }, [savings, confirmIndex, fetchData, toast]);

  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setDraftRecord({ ...savings[index] });
  }, [savings]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setDraftRecord(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingIndex === null || !draftRecord) return;
    setSaving(true);
    const updated = savings.map((item, index) => index === editingIndex ? draftRecord : item);
    api.updateSavings(updated)
      .then(() => {
        setEditingIndex(null);
        setDraftRecord(null);
        toast('Đã lưu thay đổi.');
        fetchData();
      })
      .catch(() => toast('Lưu thất bại.', 'error'))
      .finally(() => setSaving(false));
  }, [editingIndex, draftRecord, savings, fetchData]);

  const totalSaving = useMemo(() => savings.reduce((sum, item) => sum + item.amount, 0), [savings]);
  const avgRate = useMemo(() => totalSaving > 0
    ? savings.reduce((sum, item) => sum + item.amount * item.interest_rate, 0) / totalSaving
    : 0, [savings, totalSaving]);
  const avgTerm = useMemo(() => savings.length
    ? savings.reduce((sum, item) => sum + item.term, 0) / savings.length
    : 0, [savings]);
  const sortedSavings = useMemo(() => savings
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      maturityDate: getMaturityDate(item),
    }))
    .sort((a, b) => {
      const aTime = a.maturityDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.maturityDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    }), [savings]);
  const maturity30d = useMemo(() => sortedSavings.filter(({ maturityDate }) => {
    const daysLeft = daysUntil(maturityDate);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
  }), [sortedSavings]);
  const maturity30dAmount = useMemo(() => maturity30d.reduce((sum, { item }) => sum + item.amount, 0), [maturity30d]);
  const overdueSavings = useMemo(() => sortedSavings.filter(({ maturityDate }) => {
    const daysLeft = daysUntil(maturityDate);
    return daysLeft !== null && daysLeft < 0;
  }), [sortedSavings]);
  const overdueCount = overdueSavings.length;
  const highestRate = useMemo(() => savings.reduce((max, item) => Math.max(max, item.interest_rate), 0), [savings]);
  const lowestRate = useMemo(() => savings.reduce((min, item) => Math.min(min, item.interest_rate), savings[0]?.interest_rate ?? 0), [savings]);
  const rateSpread = useMemo(() => Math.max(highestRate - lowestRate, 0), [highestRate, lowestRate]);
  const bankExposure = useMemo(() => Object.values(
    savings.reduce<Record<string, { bank: string; amount: number }>>((acc, item) => {
      acc[item.bank] = acc[item.bank] ?? { bank: item.bank, amount: 0 };
      acc[item.bank].amount += item.amount;
      return acc;
    }, {}),
  ).sort((a, b) => b.amount - a.amount), [savings]);
  const annualInterest = useMemo(() => savings.reduce((sum, item) => sum + item.amount * item.interest_rate / 100, 0), [savings]);
  const termInterest = useMemo(() => savings.reduce((sum, item) => sum + item.amount * item.interest_rate / 100 * item.term / 12, 0), [savings]);
  const filteredSavings = useMemo(() => {
    if (!search.trim()) return sortedSavings;
    const q = search.toLowerCase();
    return sortedSavings.filter(({ item }) => item.bank.toLowerCase().includes(q));
  }, [sortedSavings, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-64 skeleton" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-32 skeleton" />
          <div className="h-32 skeleton" />
          <div className="h-32 skeleton" />
        </div>
        <div className="h-96 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Gửi tiết kiệm</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Theo dõi sổ tiết kiệm, lãi suất và kỳ hạn đang nắm giữ.</p>
          {lastRefreshed && <p className="mt-0.5 text-xs font-medium text-slate-400">Cập nhật lúc {lastRefreshed}</p>}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'secondary-button' : 'primary-button'}
        >
          {showForm ? <X size={17} /> : <Plus size={17} />}
          {showForm ? 'Đóng' : 'Thêm sổ mới'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetricCard
          label="Tổng tiền gửi"
          value={formatVnd(totalSaving)}
          caption={`${savings.length} sổ đang theo dõi`}
          icon={<Banknote size={20} />}
          tone="blue"
          description="Tổng số tiền gốc đang gửi ở tất cả sổ tiết kiệm."
          formula="Cộng Số tiền của toàn bộ sổ"
        />
        <MetricCard
          label="Lãi suất bình quân"
          value={`${avgRate.toFixed(2)}%`}
          caption="Gia quyền theo số tiền gửi"
          icon={<Percent size={20} />}
          tone="emerald"
          description="Lãi suất bình quân gia quyền theo số tiền gửi từng sổ."
          formula="Tổng (Số tiền x Lãi suất) / Tổng tiền gửi"
        />
        <MetricCard
          label="Kỳ hạn trung bình"
          value={`${avgTerm.toFixed(1)} tháng`}
          caption="Tính trên toàn bộ sổ"
          icon={<CalendarRange size={20} />}
          tone="slate"
          description="Kỳ hạn trung bình đơn giản của các sổ tiết kiệm."
          formula="Tổng kỳ hạn tháng / Số lượng sổ"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_.9fr]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">KPI tiết kiệm</h3>
              <p className="mt-1 text-sm text-slate-500">Dành riêng cho quản trị sổ, lãi suất và ngân hàng.</p>
            </div>
            <CalendarClock size={20} className="text-blue-700" />
          </div>
          <div className="grid grid-cols-2 gap-3 p-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Đáo hạn 30 ngày</div>
              <div className="mt-2 text-xl font-bold text-slate-950">{formatVnd(maturity30dAmount)}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{maturity30d.length} sổ</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Chênh LS</div>
              <div className="mt-2 text-xl font-bold text-slate-950">{rateSpread.toFixed(2)}%</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{lowestRate.toFixed(2)}% - {highestRate.toFixed(2)}%</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Lãi annualized</div>
              <div className="mt-2 text-xl font-bold text-slate-950">{formatVnd(annualInterest)}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Quy đổi 12 tháng</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Lãi tới hạn</div>
              <div className="mt-2 text-xl font-bold text-slate-950">{formatVnd(termInterest)}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Ước tính toàn kỳ hạn</div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Phân bổ ngân hàng</h3>
              <p className="mt-1 text-sm text-slate-500">Tỉ trọng tiền gửi theo từng ngân hàng.</p>
            </div>
          </div>
          <div className="flex flex-col items-center p-6">
            <div className="h-56 w-full">
              {bankExposure.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bankExposure} dataKey="amount" nameKey="bank" innerRadius={52} outerRadius={86} paddingAngle={2} strokeWidth={0}>
                      {bankExposure.map((entry, idx) => (
                        <Cell key={entry.bank} fill={['#2563eb','#d97706','#059669','#dc2626','#7c3aed','#0891b2','#ca8a04','#be185d'][idx % 8]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatVnd(value as number)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '8px 12px', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">Chưa có dữ liệu</div>
              )}
            </div>
            {bankExposure.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                {bankExposure.map((entry, idx) => (
                  <div key={entry.bank} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ['#2563eb','#d97706','#059669','#dc2626','#7c3aed','#0891b2','#ca8a04','#be185d'][idx % 8] }} />
                    {entry.bank} · {formatVnd(entry.amount)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {showForm && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Thông tin sổ tiết kiệm</h3>
              <p className="mt-1 text-sm text-slate-500">Nhập số liệu theo đúng chứng từ ngân hàng.</p>
            </div>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="field-label">Ngân hàng</span>
              <select
                required
                className="field-input"
                value={newRecord.bank}
                onChange={e => setNewRecord({ ...newRecord, bank: e.target.value })}
              >
                <option value="MB">MB</option>
                <option value="VCB">VCB</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="field-label">Số tiền</span>
              <input
                type="number"
                required
                min="0"
                className="field-input"
                value={newRecord.amount ?? ''}
                onChange={e => setNewRecord({ ...newRecord, amount: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Lãi suất</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                className="field-input"
                value={newRecord.interest_rate ?? ''}
                onChange={e => setNewRecord({ ...newRecord, interest_rate: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Kỳ hạn</span>
              <input
                type="number"
                required
                min="1"
                className="field-input"
                value={newRecord.term ?? ''}
                onChange={e => setNewRecord({ ...newRecord, term: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Ngày gửi (dd/mm/yyyy)</span>
              <input
                type="text"
                required
                pattern="\d{2}/\d{2}/\d{4}"
                placeholder="dd/mm/yyyy"
                className="field-input"
                value={newRecord.start_date}
                onChange={e => setNewRecord({ ...newRecord, start_date: e.target.value })}
              />
            </label>
            <div className="md:col-span-2 xl:col-span-5 flex justify-end">
              <button type="submit" className="primary-button" disabled={saving}>
                <Plus size={17} />
                {saving ? 'Đang lưu...' : 'Lưu sổ tiết kiệm'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="panel-header flex-col gap-3 sm:flex-row">
          <div>
            <h3 className="text-base font-bold text-slate-950">Danh sách sổ</h3>
            <p className="mt-1 text-sm text-slate-500">Sắp xếp theo ngày đến hạn gần nhất.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm ngân hàng..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 w-44 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              onClick={() => {
                const csv = [['Ngân hàng','Số tiền','Lãi suất','Kỳ hạn','Tiền lãi','Ngày gửi'] as string[], ...savings.map(s => { const interest = s.amount * s.interest_rate / 100 * s.term / 12; return [s.bank, s.amount.toString(), s.interest_rate.toString(), s.term.toString(), interest.toFixed(2), s.start_date]; })]
                  .map(row => row.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'so-tiet-kiem.csv'; a.click();
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
                <th>Ngân hàng</th>
                <th className="text-right">Số tiền</th>
                <th className="text-center">Lãi suất</th>
                <th className="text-center">Kỳ hạn</th>
                <th className="text-right">Tiền lãi</th>
                <th>Ngày gửi</th>
                <th>Ngày đến hạn</th>
                <th className="text-right">Còn lại</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredSavings.map(({ item, originalIndex, maturityDate }) => {
                const isEditing = editingIndex === originalIndex && draftRecord;
                const current = isEditing ? draftRecord : item;
                const maturity = isEditing ? getMaturityDate(current) : maturityDate;
                const daysLeft = daysUntil(maturity);

                return (
                <tr key={`${item.bank}-${item.start_date}-${originalIndex}`} className={!isEditing && daysLeft !== null && daysLeft < 0 ? 'border-l-2 border-l-red-400 bg-red-50/40' : ''}>
                  <td>
                    {isEditing ? (
                      <select
                        className="table-input min-w-32"
                        value={current.bank}
                        onChange={e => setDraftRecord({ ...current, bank: e.target.value })}
                      >
                        <option value="MB">MB</option>
                        <option value="VCB">VCB</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                          <Landmark size={17} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-950">{item.bank}</div>
                          <div className="text-xs font-medium text-slate-500">Sổ tiết kiệm</div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="text-right font-bold text-slate-950">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        className="table-input text-right"
                        value={current.amount ?? ''}
                        onChange={e => setDraftRecord({ ...current, amount: Number(e.target.value) })}
                      />
                    ) : formatVnd(item.amount)}
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="table-input text-center"
                        value={current.interest_rate ?? ''}
                        onChange={e => setDraftRecord({ ...current, interest_rate: Number(e.target.value) })}
                      />
                    ) : (
                      <span className="status-badge border-emerald-200 bg-emerald-50 text-emerald-700">
                        {item.interest_rate}%
                      </span>
                    )}
                  </td>
                  <td className="text-center font-semibold text-slate-700">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        className="table-input text-center"
                        value={current.term ?? ''}
                        onChange={e => setDraftRecord({ ...current, term: Number(e.target.value) })}
                      />
                    ) : `${item.term} tháng`}
                  </td>
                  <td className="text-right font-semibold text-emerald-600">
                    {isEditing ? '-' : formatVnd(item.amount * item.interest_rate / 100 * item.term / 12)}
                  </td>
                  <td className="font-medium text-slate-600">
                    {isEditing ? (
                      <input
                        className="table-input min-w-28"
                        value={current.start_date}
                        onChange={e => setDraftRecord({ ...current, start_date: e.target.value })}
                      />
                    ) : item.start_date}
                  </td>
                  <td className="font-bold text-slate-950">{formatDate(isEditing ? getMaturityDate(current) : maturityDate)}</td>
                  <td className="text-right">
                    {daysLeft === null ? 'N/A' : daysLeft < 0 ? <span className="text-red-500">Quá hạn</span> : `${daysLeft} ngày`}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                            aria-label={`Lưu sổ ${item.bank}`}
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
                            onClick={() => handleEdit(originalIndex)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                            aria-label={`Sửa sổ ${item.bank}`}
                          >
                            <Edit3 size={17} />
                          </button>
                          <button
                            onClick={() => setConfirmIndex(originalIndex)}
                            className="icon-button"
                            aria-label={`Xóa sổ ${item.bank}`}
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium text-slate-600">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={16} className="shrink-0" />
              {overdueCount} sổ đã quá hạn — cần cập nhật thông tin.
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={16} className="shrink-0 text-slate-400" />
            {maturity30dAmount > 0
              ? `${formatVnd(maturity30dAmount)} sẽ đáo hạn trong 30 ngày.`
              : 'Chưa có sổ nào đáo hạn trong 30 ngày tới.'}
          </span>
        </div>
        {filteredSavings.length === 0 && (
          <div className="px-6 py-16 text-center text-sm font-medium text-slate-400">
            {search ? 'Không tìm thấy sổ nào.' : 'Chưa có sổ tiết kiệm nào.'}
          </div>
        )}
      </section>

      <Confirm
        open={confirmIndex !== null}
        title="Xóa sổ tiết kiệm"
        message="Sổ này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setConfirmIndex(null)}
      />
    </div>
  );
};

export default Savings;
