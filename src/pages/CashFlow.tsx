import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { MonthlyReport, TransactionRecord } from '../api/client';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Download, Edit3, Filter, Plus, Search, Trash2, X } from 'lucide-react';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import { formatVnd, todayDateStr } from '../utils/format';

const CATEGORIES = ['Lương', 'Tiết kiệm đáo hạn', 'Bán vàng', 'Thu nhập khác', 'Ăn uống', 'Xăng xe', 'Nhà cửa', 'Mua sắm', 'Y tế', 'Giải trí', 'Khác'];

const createTx = (type: 'income' | 'expense'): TransactionRecord => ({
  id: crypto.randomUUID(),
  type,
  category: type === 'income' ? 'Lương' : 'Ăn uống',
  amount: 0,
  date: todayDateStr.replace(/-/g, '/'),
  note: '',
  created_at: new Date().toISOString(),
});

const CashFlow: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [showForm, setShowForm] = useState<'income' | 'expense' | null>(null);
  const [newTx, setNewTx] = useState<TransactionRecord>(createTx('income'));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTx, setDraftTx] = useState<TransactionRecord | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    setLoading(true);
    api.getTransactions()
      .then(data => { setTransactions(data); setLastRefreshed(new Date().toLocaleTimeString('vi-VN')); })
      .catch(() => toast('Không thể tải dữ liệu thu chi.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const fetchReport = useCallback((month: number, year: number) => {
    setReportLoading(true);
    api.getMonthlyReport(month, year)
      .then(setReport)
      .catch(() => { setReport(null); })
      .finally(() => setReportLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { fetchReport(reportMonth, reportYear); }, [fetchReport, reportMonth, reportYear]);

  const handleAdd = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    api.addTransaction(newTx)
      .then(() => {
        setNewTx(createTx(newTx.type));
        setShowForm(null);
        toast('Đã thêm giao dịch.');
        fetchData();
        fetchReport(reportMonth, reportYear);
      })
      .catch(() => toast('Không thể lưu giao dịch.', 'error'))
      .finally(() => setSaving(false));
  }, [newTx, fetchData, fetchReport, reportMonth, reportYear, toast]);

  const handleDelete = useCallback(() => {
    if (!confirmId) return;
    api.deleteTransaction(confirmId)
      .then(() => { toast('Đã xóa giao dịch.'); setConfirmId(null); fetchData(); fetchReport(reportMonth, reportYear); })
      .catch(() => toast('Xóa thất bại.', 'error'));
  }, [confirmId, fetchData, fetchReport, reportMonth, reportYear, toast]);

  const handleEdit = useCallback((tx: TransactionRecord) => {
    setEditingId(tx.id);
    setDraftTx({ ...tx });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraftTx(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !draftTx) return;
    setSaving(true);
    const updated = transactions.map(t => t.id === editingId ? draftTx : t);
    api.updateTransactions(updated)
      .then(() => {
        setEditingId(null);
        setDraftTx(null);
        toast('Đã lưu thay đổi.');
        fetchData();
        fetchReport(reportMonth, reportYear);
      })
      .catch(() => toast('Lưu thất bại.', 'error'))
      .finally(() => setSaving(false));
  }, [editingId, draftTx, transactions, fetchData, fetchReport, reportMonth, reportYear, toast]);

  const cashBalance = useMemo(() =>
    transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
  [transactions]);

  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const filteredTxs = useMemo(() => {
    let result = [...transactions];
    if (filterMonth > 0) {
      result = result.filter(t => {
        const parts = t.date.split('/');
        return parts.length === 3 && parseInt(parts[1]) === filterMonth && parseInt(parts[2]) === filterYear;
      });
    }
    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.category.toLowerCase().includes(q) || (t.note ?? '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    return result;
  }, [transactions, filterMonth, filterYear, typeFilter, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-64 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-96 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Thu chi</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Ghi chép thu nhập và chi tiêu theo danh mục.</p>
          {lastRefreshed && <p className="mt-0.5 text-xs font-medium text-slate-400">Cập nhật lúc {lastRefreshed}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setNewTx(createTx('income')); setShowForm('income'); }}
            className="primary-button"
          >
            <ArrowDown size={17} />
            Thu nhập
          </button>
          <button
            onClick={() => { setNewTx(createTx('expense')); setShowForm('expense'); }}
            className="secondary-button"
          >
            <ArrowUp size={17} />
            Chi tiêu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-2">
          <div className="text-xs font-semibold uppercase text-slate-500">Số dư tiền mặt</div>
          <div className={`mt-2 text-2xl font-bold ${cashBalance >= 0 ? 'text-slate-950' : 'text-red-500'}`}>
            {formatVnd(cashBalance)}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">{transactions.length} giao dịch</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-emerald-700">
            <ArrowDown size={14} /> Tổng thu
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700">{formatVnd(report?.total_income ?? 0)}</div>
          <div className="mt-1 text-xs font-medium text-emerald-600">Tháng {reportMonth}/{reportYear}</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-red-700">
            <ArrowUp size={14} /> Tổng chi
          </div>
          <div className="mt-2 text-xl font-bold text-red-700">{formatVnd(report?.total_expense ?? 0)}</div>
          <div className="mt-1 text-xs font-medium text-red-600">Tháng {reportMonth}/{reportYear}</div>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReport(!showReport)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              <Filter size={14} />
              {showReport ? 'Ẩn báo cáo' : 'Báo cáo tháng'}
              {showReport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={reportMonth}
              onChange={e => setReportMonth(Number(e.target.value))}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
            <select
              value={reportYear}
              onChange={e => setReportYear(Number(e.target.value))}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold outline-none"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>
        </div>
        {showReport && (
          <div className="border-t border-slate-100">
            {reportLoading ? (
              <div className="p-6 text-center text-sm font-medium text-slate-400">Đang tải...</div>
            ) : report && report.categories.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {report.categories.map(cat => (
                  <div key={cat.category} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${cat.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {cat.type === 'income' ? '+' : '-'}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-950">{cat.category}</div>
                        <div className="text-xs font-medium text-slate-500">{cat.count} giao dịch</div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${cat.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {cat.type === 'income' ? '+' : '-'}{formatVnd(cat.amount)}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
                  <div className="text-sm font-bold text-slate-950">Tổng kết</div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${report.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {report.net >= 0 ? '+' : ''}{formatVnd(report.net)}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      Thu {formatVnd(report.total_income)} - Chi {formatVnd(report.total_expense)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-sm font-medium text-slate-400">Chưa có giao dịch trong tháng này.</div>
            )}
          </div>
        )}
      </section>

      {showForm && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">
                {newTx.type === 'income' ? 'Thêm khoản thu' : 'Thêm khoản chi'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Ghi nhận giao dịch phát sinh.</p>
            </div>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="field-label">Danh mục</span>
              <select
                required
                className="field-input"
                value={newTx.category}
                onChange={e => setNewTx({ ...newTx, category: e.target.value })}
              >
                {CATEGORIES.filter(c =>
                  (newTx.type === 'income' && ['Lương', 'Tiết kiệm đáo hạn', 'Bán vàng', 'Thu nhập khác'].includes(c)) ||
                  (newTx.type === 'expense' && ['Ăn uống', 'Xăng xe', 'Nhà cửa', 'Mua sắm', 'Y tế', 'Giải trí', 'Khác'].includes(c))
                ).map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Khác">Khác</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="field-label">Số tiền</span>
              <input
                type="number"
                required
                min="0"
                className="field-input"
                value={newTx.amount ?? ''}
                onChange={e => setNewTx({ ...newTx, amount: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Ngày (dd/mm/yyyy)</span>
              <input
                type="text"
                required
                pattern="\d{2}/\d{2}/\d{4}"
                placeholder="dd/mm/yyyy"
                className="field-input"
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Ghi chú</span>
              <input
                type="text"
                className="field-input"
                placeholder="Mô tả..."
                value={newTx.note ?? ''}
                onChange={e => setNewTx({ ...newTx, note: e.target.value })}
              />
            </label>
            <div className="md:col-span-2 xl:col-span-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(null)} className="secondary-button">Hủy</button>
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
            <h3 className="text-base font-bold text-slate-950">Lịch sử giao dịch</h3>
            <p className="mt-1 text-sm text-slate-500">Sắp xếp theo ngày gần nhất.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="income">Thu nhập</option>
              <option value="expense">Chi tiêu</option>
            </select>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(Number(e.target.value))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold outline-none"
            >
              <option value={0}>Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
            {filterMonth > 0 && (
              <select
                value={filterYear}
                onChange={e => setFilterYear(Number(e.target.value))}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            )}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm danh mục..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 w-44 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              onClick={() => {
                const csv = [['Loại','Danh mục','Số tiền','Ngày','Ghi chú'] as string[], ...transactions.map(t => [t.type === 'income' ? 'Thu' : 'Chi', t.category, t.amount.toString(), t.date, t.note ?? ''])]
                  .map(row => row.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'thu-chi.csv'; a.click();
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
                <th>Loại</th>
                <th>Danh mục</th>
                <th className="text-right">Số tiền</th>
                <th>Ngày</th>
                <th>Ghi chú</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.map(tx => {
                const isEditing = editingId === tx.id && draftTx;
                const current = isEditing ? draftTx : tx;

                return (
                <tr key={tx.id}>
                  <td>
                    {isEditing ? (
                      <select
                        className="table-input min-w-24"
                        value={current.type}
                        onChange={e => setDraftTx({ ...current, type: e.target.value as 'income' | 'expense' })}
                      >
                        <option value="income">Thu</option>
                        <option value="expense">Chi</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${
                        tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {tx.type === 'income' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        {tx.type === 'income' ? 'Thu' : 'Chi'}
                      </span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="table-input min-w-32"
                        value={current.category}
                        onChange={e => setDraftTx({ ...current, category: e.target.value })}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className="font-semibold text-slate-950">{tx.category}</span>
                    )}
                  </td>
                  <td className="text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        className="table-input text-right"
                        value={current.amount ?? ''}
                        onChange={e => setDraftTx({ ...current, amount: Number(e.target.value) })}
                      />
                    ) : (
                      <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatVnd(tx.amount)}
                      </span>
                    )}
                  </td>
                  <td className="font-medium text-slate-600">
                    {isEditing ? (
                      <input
                        className="table-input min-w-28"
                        value={current.date}
                        onChange={e => setDraftTx({ ...current, date: e.target.value })}
                      />
                    ) : tx.date}
                  </td>
                  <td className="max-w-40 truncate text-sm text-slate-500">
                    {isEditing ? (
                      <input
                        className="table-input min-w-36"
                        value={current.note ?? ''}
                        onChange={e => setDraftTx({ ...current, note: e.target.value })}
                        placeholder="Ghi chú"
                      />
                    ) : tx.note || '-'}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                            aria-label="Lưu"
                          >
                            <Check size={17} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
                            aria-label="Hủy"
                          >
                            <X size={17} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(tx)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                            aria-label="Sửa"
                          >
                            <Edit3 size={17} />
                          </button>
                          <button
                            onClick={() => setConfirmId(tx.id)}
                            className="icon-button"
                            aria-label="Xóa"
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
        {filteredTxs.length === 0 && (
          <div className="px-6 py-16 text-center text-sm font-medium text-slate-400">
            Chưa có giao dịch nào.
          </div>
        )}
      </section>

      <Confirm
        open={confirmId !== null}
        title="Xóa giao dịch"
        message="Giao dịch này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default CashFlow;
