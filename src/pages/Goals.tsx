import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { GoalProgress, GoalRecord, SavingRecord, GoldRecord, GoldRate } from '../api/client';
import { useToast } from '../components/Toast';
import Confirm from '../components/Confirm';
import { ArrowDown, ArrowUp, Plus, Target, Trash2 } from 'lucide-react';
import { formatVnd } from '../utils/format';

const emptyGoal = (priority: number): GoalRecord => ({
  id: crypto.randomUUID(),
  name: '',
  priority,
  target_amount: 0,
  saving_indices: [],
  gold_indices: [],
});

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [savings, setSavings] = useState<SavingRecord[]>([]);
  const [gold, setGold] = useState<GoldRecord[]>([]);
  const [goldRate, setGoldRate] = useState<GoldRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GoalRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const usedSavingIndices = useMemo(() => {
    if (!editing) return new Set<number>();
    const others = goals.filter(g => g.id !== editing.id);
    return new Set(others.flatMap(g => g.saving_indices));
  }, [goals, editing]);

  const usedGoldIndices = useMemo(() => {
    if (!editing) return new Set<number>();
    const others = goals.filter(g => g.id !== editing.id);
    return new Set(others.flatMap(g => g.gold_indices));
  }, [goals, editing]);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getGoalsWithProgress(), 
      api.getSavings(), 
      api.getGold(), 
      api.getBtmhGoldRate().catch((err) => {
        toast(err?.message || 'Không thể lấy giá BTMH. Vui lòng thử lại.', 'error');
        return null;
      })
    ])
      .then(([g, s, d, r]) => { setGoals(g); setSavings(s); setGold(d); setGoldRate(r); })
      .catch(() => toast('Không thể tải dữ liệu.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const movePriority = useCallback((id: string, dir: -1 | 1) => {
    setGoals(prev => {
      const idx = prev.findIndex(g => g.id === id);
      if (idx === -1) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const temp = next[idx].priority;
      next[idx] = { ...next[idx], priority: next[target].priority };
      next[target] = { ...next[target], priority: temp };
      return next;
    });
  }, []);

  const saveReorder = useCallback(() => {
    const records: GoalRecord[] = goals.map(g => ({
      id: g.id, name: g.name, priority: g.priority,
      target_amount: g.target_amount,
      saving_indices: g.saving_indices, gold_indices: g.gold_indices,
    }));
    api.updateGoals(records).then(() => toast('Đã cập nhật thứ tự ưu tiên.')).catch((e) => toast(e?.message ?? 'Lỗi cập nhật.', 'error'));
  }, [goals, toast]);

  const handleSave = useCallback(() => {
    if (!editing || !editing.name.trim() || editing.target_amount <= 0) {
      toast('Vui lòng nhập tên mục tiêu và số tiền hợp lệ.', 'error');
      return;
    }
    setSaving(true);
    const existing = goals.find(g => g.id === editing.id);
    if (existing) {
      const records: GoalRecord[] = goals.map(g => g.id === editing.id ? editing : {
        id: g.id, name: g.name, priority: g.priority,
        target_amount: g.target_amount,
        saving_indices: g.saving_indices, gold_indices: g.gold_indices,
      });
      api.updateGoals(records)
        .then(() => { toast('Đã cập nhật mục tiêu.'); setEditing(null); fetchAll(); })
        .catch((e) => toast(e?.message ?? 'Lỗi cập nhật.', 'error'))
        .finally(() => setSaving(false));
    } else {
      api.addGoal(editing)
        .then(() => { toast('Đã thêm mục tiêu.'); setEditing(null); fetchAll(); })
        .catch((e) => toast(e?.message ?? 'Lỗi thêm.', 'error'))
        .finally(() => setSaving(false));
    }
  }, [editing, goals, toast, fetchAll]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    api.deleteGoal(deleteId)
      .then(() => { toast('Đã xóa mục tiêu.'); setDeleteId(null); fetchAll(); })
      .catch(() => toast('Lỗi xóa.', 'error'));
  }, [deleteId, toast, fetchAll]);

  const toggleIndex = useCallback((list: number[], idx: number) =>
    list.includes(idx) ? list.filter(i => i !== idx) : [...list, idx],
  []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-60 skeleton" />
        <div className="h-40 skeleton" />
        <div className="h-40 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Mục tiêu tài chính</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Gắn từng khoản tiết kiệm / vàng vào mục tiêu để theo dõi tiến độ.</p>
        </div>
        <button
          onClick={() => setEditing(emptyGoal(goals.length > 0 ? Math.max(...goals.map(g => g.priority)) + 1 : 1))}
          className="primary-button"
        >
          <Plus size={16} />
          Thêm mục tiêu
        </button>
      </div>

      {editing && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">{goals.find(g => g.id === editing.id) ? 'Sửa mục tiêu' : 'Thêm mục tiêu'}</h3>
            </div>
          </div>
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="field-label">Tên mục tiêu</span>
                <input className="field-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="VD: Mua xe, Du lịch..." />
              </label>
              <label className="space-y-1.5">
                <span className="field-label">Số tiền mục tiêu</span>
                <input type="number" min="0" className="field-input" value={editing.target_amount || ''} onChange={e => setEditing({ ...editing, target_amount: Number(e.target.value) })} />
              </label>
              <label className="space-y-1.5">
                <span className="field-label">Ưu tiên</span>
                <input type="number" min="1" className="field-input" value={editing.priority} onChange={e => setEditing({ ...editing, priority: Number(e.target.value) })} />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  <span>Chọn sổ tiết kiệm</span>
                  {savings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, saving_indices: editing.saving_indices.length === savings.length ? [] : savings.map((_, i) => i) })}
                      className="ml-2 text-xs font-normal text-blue-600 hover:text-blue-800"
                    >
                      {editing.saving_indices.length === savings.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {savings.length === 0 && <p className="text-xs text-slate-400">Chưa có sổ tiết kiệm.</p>}
                  {savings.map((s, i) => {
                    const taken = usedSavingIndices.has(i);
                    return (
                    <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition ${taken ? 'opacity-40' : editing.saving_indices.includes(i) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={editing.saving_indices.includes(i)} disabled={taken} onChange={() => setEditing({ ...editing, saving_indices: toggleIndex(editing.saving_indices, i) })} className="h-4 w-4 rounded border-slate-300 text-blue-600 disabled:opacity-40" />
                      <span className="font-medium">{s.bank}</span>
                      <span className="ml-auto text-xs font-semibold text-slate-500">{formatVnd(s.amount)}</span>
                      {taken && <span className="text-[10px] text-slate-400">(đã dùng)</span>}
                    </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  <span>Chọn vàng</span>
                  {gold.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, gold_indices: editing.gold_indices.length === gold.length ? [] : gold.map((_, i) => i) })}
                      className="ml-2 text-xs font-normal text-amber-600 hover:text-amber-800"
                    >
                      {editing.gold_indices.length === gold.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {gold.length === 0 && <p className="text-xs text-slate-400">Chưa có vàng.</p>}
                  {gold.map((g, i) => {
                    const taken = usedGoldIndices.has(i);
                    return (
                    <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition ${taken ? 'opacity-40' : editing.gold_indices.includes(i) ? 'bg-amber-50 text-amber-700' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={editing.gold_indices.includes(i)} disabled={taken} onChange={() => setEditing({ ...editing, gold_indices: toggleIndex(editing.gold_indices, i) })} className="h-4 w-4 rounded border-slate-300 text-amber-600 disabled:opacity-40" />
                      <span className="font-medium">{g.gold_type}</span>
                      <span className="text-xs text-slate-500">{g.quantity} chỉ</span>
                      <span className="ml-auto text-xs font-semibold text-slate-500">{formatVnd(g.quantity * (goldRate?.buy_price ?? g.buy_price))}</span>
                      {taken && <span className="text-[10px] text-slate-400">(đã dùng)</span>}
                    </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="secondary-button">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="primary-button">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <section className="panel">
          <div className="flex flex-col items-center justify-center py-16">
            <Target size={40} className="text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-400">Chưa có mục tiêu nào. Hãy thêm mục tiêu tài chính đầu tiên.</p>
          </div>
        </section>
      )}

      {goals.map(g => (
        <section key={g.id} className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => { movePriority(g.id, -1); saveReorder(); }} className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Lên ưu tiên"><ArrowUp size={13} /></button>
                <button onClick={() => { movePriority(g.id, 1); saveReorder(); }} className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Xuống ưu tiên"><ArrowDown size={13} /></button>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700 mr-2">{g.priority}</span>
                  {g.name}
                </h3>
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {formatVnd(g.current_amount)} / {formatVnd(g.target_amount)}
                  {g.saving_indices.length > 0 && ` · ${g.saving_indices.length} sổ TK`}
                  {g.gold_indices.length > 0 && ` · ${g.gold_indices.length} vàng`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing({ id: g.id, name: g.name, priority: g.priority, target_amount: g.target_amount, saving_indices: g.saving_indices, gold_indices: g.gold_indices })} className="icon-button" title="Sửa">
                <Target size={16} />
              </button>
              <button onClick={() => setDeleteId(g.id)} className="icon-button text-red-400 hover:text-red-600" title="Xóa">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${g.percentage >= 100 ? 'bg-emerald-500' : g.percentage >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(g.percentage, 100)}%` }}
                />
              </div>
              <span className={`shrink-0 text-sm font-bold ${g.percentage >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                {g.percentage}%
              </span>
            </div>
          </div>
        </section>
      ))}

      <Confirm
        open={deleteId !== null}
        title="Xóa mục tiêu"
        message="Mục tiêu này sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default Goals;