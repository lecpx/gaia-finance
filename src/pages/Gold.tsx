import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { GoldChartResponse, GoldRate, GoldRecord } from '../api/client';
import { AlertTriangle, Banknote, Check, CircleDollarSign, Coins, Download, Edit3, Gem, Plus, Search, ShieldCheck, Target, TrendingUp, Trash2, X } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Confirm from '../components/Confirm';
import { useToast } from '../components/Toast';
import { formatPercent, formatVnd, todayDateStr } from '../utils/format';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  const [goldRate, setGoldRate] = useState<GoldRate | null>(null);
  const [goldRateError, setGoldRateError] = useState(false);
  const [goldChart, setGoldChart] = useState<GoldChartResponse | null>(null);
  const [chartFromDate, setChartFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [chartToDate, setChartToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [chartLoading, setChartLoading] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');
  const { toast } = useToast();

  const fetchChart = useCallback((from: string, to: string) => {
    setChartLoading(true);
    api.getBtmhGoldChart('KGB', from, to)
      .then(setGoldChart)
      .catch(() => { setGoldChart(null); toast('Không thể tải biểu đồ giá.', 'error'); })
      .finally(() => setChartLoading(false));
  }, [toast]);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getGold(),
      api.getBtmhGoldRate().catch(() => null),
    ])
      .then(([goldData, rateData]) => {
        setGold(goldData);
        setGoldRate(rateData);
        setGoldRateError(!rateData);
        setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      })
      .catch(() => toast('Không thể tải dữ liệu vàng.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchChart(chartFromDate, chartToDate);
  }, [fetchChart, chartFromDate, chartToDate]);

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
  const currentGoldBuyPrice = goldRate?.buy_price ?? 0;
  const currentGoldSellPrice = goldRate?.sell_price ?? 0;
  const marketValue = useMemo(() => currentGoldBuyPrice > 0 ? totalQuantity * currentGoldBuyPrice : totalInvestment, [currentGoldBuyPrice, totalQuantity, totalInvestment]);
  const profit = useMemo(() => marketValue - totalInvestment, [marketValue, totalInvestment]);
  const profitPct = useMemo(() => totalInvestment > 0 ? profit / totalInvestment * 100 : 0, [profit, totalInvestment]);
  const spreadPerChi = useMemo(() => Math.max(currentGoldSellPrice - currentGoldBuyPrice, 0), [currentGoldSellPrice, currentGoldBuyPrice]);
  const marginToCost = useMemo(() => avgPrice > 0 ? (currentGoldBuyPrice - avgPrice) / avgPrice * 100 : 0, [currentGoldBuyPrice, avgPrice]);
  const filteredGold = useMemo(() => {
    if (!search.trim()) return gold;
    const q = search.toLowerCase();
    return gold.filter(item => item.gold_type.toLowerCase().includes(q) || (item.note ?? '').toLowerCase().includes(q));
  }, [gold, search]);

  const chartData = useMemo(() => {
    if (!goldChart) return [];
    return goldChart.data_points.map(pt => ({ ...pt, avgPrice }));
  }, [goldChart, avgPrice]);

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

      {goldRateError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
          <strong>⚠ Không thể lấy giá BTMH.</strong> Các chỉ số định giá vàng (giá trị hiện tại, lãi/lỗ) đang hiển thị theo giá vốn — có thể không chính xác.
        </div>
      )}
      
      {goldRate?.from_cache && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-800">
          <strong>ℹ Đang sử dụng giá vàng cache.</strong> Dữ liệu có thể cũ (cập nhật sau 1 giờ). Các chỉ số vẫn chính xác nhưng có thể chưa phản ánh giá thị trường mới nhất.
        </div>
      )}

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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Giá trị hiện tại"
          value={formatVnd(marketValue)}
          caption={`Theo giá BTMH mua vào ${formatVnd(currentGoldBuyPrice)}`}
          icon={<Gem size={20} />}
          tone="amber"
          description="Giá trị danh mục vàng nếu bán theo giá mua vào hiện tại của BTMH cho sản phẩm KGB."
          formula="Tổng số chỉ x Giá BTMH mua vào/chỉ"
        />
        <MetricCard
          label="Lãi/lỗ tạm tính"
          value={formatVnd(profit)}
          caption={formatPercent(profitPct)}
          icon={<TrendingUp size={20} />}
          tone={profit >= 0 ? 'emerald' : 'slate'}
          description="Lãi hoặc lỗ tạm tính của vàng theo giá BTMH mua vào hiện tại."
          formula="Giá trị hiện tại - Vốn đầu tư"
        />
        <MetricCard
          label="Giá hòa vốn dài hạn"
          value={formatVnd(avgPrice)}
          caption="Theo giá vốn trung bình"
          icon={<Target size={20} />}
          tone="slate"
          description="Mốc giá mua vào BTMH cần đạt để danh mục vàng về hòa vốn theo giá vốn bình quân, chưa tính chi phí cơ hội."
          formula="Tổng vốn đầu tư / Tổng số chỉ"
        />
        <MetricCard
          label="Biên an toàn giá vốn"
          value={formatPercent(marginToCost)}
          caption={`BTMH mua vào ${formatVnd(currentGoldBuyPrice)}`}
          icon={<ShieldCheck size={20} />}
          tone={marginToCost >= 0 ? 'emerald' : 'slate'}
          description="Khoảng cách phần trăm giữa giá BTMH mua vào hiện tại và giá vốn trung bình của bạn. Dương nghĩa là giá hiện tại cao hơn giá vốn."
          formula="(Giá BTMH mua vào - Giá vốn trung bình) / Giá vốn trung bình x 100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="panel flex flex-col">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Giá Bảo Tín Mạnh Hải</h3>
              <p className="mt-1 text-sm text-slate-500">Nhẫn Tròn ép vỉ Kim Gia Bảo 24K (999.9).</p>
            </div>
            <span className={`status-badge ${goldRateError ? 'border-amber-200 bg-amber-50 text-amber-700' : goldRate?.from_cache ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {goldRateError ? 'Lỗi dữ liệu' : goldRate?.from_cache ? 'Cache' : 'Live'}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-between gap-4 p-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[.08em] text-amber-700">Bảo Tín Mạnh Hải</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{goldRate?.name ?? 'Chưa có dữ liệu giá'}</div>
              <div className="mt-1 text-sm font-medium text-slate-600">{goldRate?.unit ?? 'VND/1 chỉ'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">BTMH mua vào</div>
                <div className="mt-2 text-xl font-bold text-slate-950">{formatVnd(currentGoldBuyPrice)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">BTMH bán ra</div>
                <div className="mt-2 text-xl font-bold text-slate-950">{formatVnd(currentGoldSellPrice)}</div>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-500">
              Trend: <span className="font-bold text-slate-900">{goldRate?.trend ?? 'N/A'}</span>
              {goldRate?.trend_value ? ` (${goldRate.trend_value})` : ''}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Tín hiệu riêng cho vàng</h3>
              <p className="mt-1 text-sm text-slate-500">Phân tích theo góc nhìn nắm giữ dài hạn, không phải lướt sóng.</p>
            </div>
          </div>
          <div className="space-y-3 p-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-slate-950">Giá vốn so với BTMH mua vào</div>
                <span className={`status-badge ${goldRateError ? 'border-amber-200 bg-amber-50 text-amber-700' : profit >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {goldRateError ? 'Dữ liệu chưa cập nhật' : profit >= 0 ? 'Đang có lãi' : 'Dưới giá vốn'}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                Giá vốn trung bình {formatVnd(avgPrice)} / chỉ, giá BTMH mua vào {formatVnd(currentGoldBuyPrice)} / chỉ.
                {goldRate?.from_cache && <span className="text-blue-600"> (dữ liệu cache)</span>}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-slate-950">Chênh lệch mua-bán tham khảo</div>
                <span className="status-badge border-slate-200 bg-slate-50 text-slate-700">{formatVnd(spreadPerChi)} / chỉ</span>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                Với đầu tư dài hạn, spread không phải tín hiệu mua-bán chính. Nó chỉ cho biết mức chênh giữa giá BTMH bán ra và mua vào tại thời điểm hiện tại.
              </p>
            </div>
            <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-slate-400" />
              Đây là phân tích riêng cho vàng KGB, quyết định tỷ trọng tổng thể vẫn nên xem ở trang Tổng quan.
            </div>
          </div>
        </section>
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
            <h3 className="text-base font-bold text-slate-950">Biểu đồ giá BTMH</h3>
            <p className="mt-1 text-sm text-slate-500">Lịch sử giá mua vào / bán ra Kim Gia Bảo 24K.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Từ</label>
              <input
                type="date"
                value={chartFromDate}
                onChange={e => setChartFromDate(e.target.value)}
                className="h-8 w-36 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Đến</label>
              <input
                type="date"
                value={chartToDate}
                onChange={e => setChartToDate(e.target.value)}
                className="h-8 w-36 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {goldChart && (
              <span className={`status-badge ${goldChart.from_cache ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {goldChart.data_points.length} mốc {goldChart.from_cache && '(cache)'}
              </span>
            )}
          </div>
        </div>
        <div className="h-80 min-w-0 px-4 pt-4 pb-10">
          {chartLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            </div>
          ) : goldChart && goldChart.data_points.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                  tickFormatter={(val) => {
                    const parts = val.split('/');
                    return `${parts[0]}/${parts[1]}`;
                  }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  domain={[Math.min(...chartData.map(d => d.buy), ...chartData.map(d => d.sell), ...(avgPrice > 0 ? [avgPrice] : [])) - 50000, Math.max(...chartData.map(d => d.buy), ...chartData.map(d => d.sell)) + 50000]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)}tr`}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    padding: '10px 14px',
                    fontSize: 13,
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = { buy: 'Mua vào', sell: 'Bán ra', avgPrice: 'Giá vốn' };
                    return [formatVnd(value as number), labels[name as string] ?? name];
                  }}
                  labelFormatter={(label) => {
                    const [d, m, y] = label.split('/');
                    return `Ngày ${d}/${m}/${y}`;
                  }}
                />
                {avgPrice > 0 && (
                  <Line type="monotone" dataKey="avgPrice" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="avgPrice" />
                )}
                <Area type="monotone" dataKey="buy" stroke="#2563eb" strokeWidth={2} fill="none" dot={false} name="buy" />
                <Area type="monotone" dataKey="sell" stroke="#d97706" strokeWidth={2} strokeDasharray="5 3" fill="none" dot={false} name="sell" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
              {goldChart && goldChart.data_points.length === 1 ? 'Cần thêm dữ liệu để vẽ biểu đồ.' : 'Chưa có dữ liệu lịch sử.'}
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-8 border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="h-0.5 w-5 border-t-2 border-solid border-blue-600" />
            Mua vào
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="h-px w-5 border-t-2 border-dashed border-amber-600" />
            Bán ra
          </div>
          {avgPrice > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="h-px w-5 border-t-2 border-dotted border-red-600" />
              Giá vốn
            </div>
          )}
        </div>
      </section>

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
                <th className="text-right">Lãi/lỗ</th>
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
                  <td className="text-right">
                    {(() => {
                      const pl = (currentGoldBuyPrice - item.buy_price) * item.quantity;
                      const plPct = item.buy_price > 0 ? ((currentGoldBuyPrice - item.buy_price) / item.buy_price) * 100 : 0;
                      return (
                        <span className={`text-xs font-bold ${pl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          <div>{pl >= 0 ? '+' : ''}{formatVnd(pl)}</div>
                          <div className="text-[11px] font-semibold">{pl >= 0 ? '+' : ''}{plPct.toFixed(2)}%</div>
                        </span>
                      );
                    })()}
                  </td>
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
