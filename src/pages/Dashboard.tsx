import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import type { GoldRecord, SavingRecord, GoalProgress } from '../api/client';
import MetricCard from '../components/MetricCard';
import { useToast } from '../components/Toast';
import { Banknote, Building2, CircleDollarSign, Coins, Gem, Landmark, Percent } from 'lucide-react';
import { formatPercent, formatVnd } from '../utils/format';

interface Summary {
  total_assets: number;
  total_saving: number;
  total_gold_investment: number;
  cash_balance: number;
  saving_percentage: number;
  gold_percentage: number;
}

const ChartLegend = ({ items }: { items: Array<{ name: string; color: string; value?: number }> }) => (
  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-slate-100 px-4 py-3">
    {items.map(item => (
      <div key={item.name} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        <span>{item.name}</span>
        {typeof item.value === 'number' && (
          <span className="font-bold text-slate-900">{formatVnd(item.value)}</span>
        )}
      </div>
    ))}
  </div>
);

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [savings, setSavings] = useState<SavingRecord[]>([]);
  const [gold, setGold] = useState<GoldRecord[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getSummary(),
      api.getSavings(),
      api.getGold(),
      api.getGoalsWithProgress().catch(() => [] as any),
    ])
      .then(([summaryData, savingsData, goldData, goalsData]) => {
        setSummary(summaryData);
        setSavings(savingsData);
        setGold(goldData);
        setGoals(goalsData);
        setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      })
      .catch(() => toast('Không thể tải dữ liệu. Vui lòng kiểm tra kết nối.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSaving = useMemo(() => savings.reduce((sum, item) => sum + item.amount, 0), [savings]);
  const weightedSavingRate = useMemo(() => totalSaving > 0
    ? savings.reduce((sum, item) => sum + item.amount * item.interest_rate, 0) / totalSaving
    : 0, [savings, totalSaving]);
  const termSavingInterest = useMemo(() => savings.reduce((sum, item) => sum + item.amount * item.interest_rate / 100 * item.term / 12, 0), [savings]);
  const totalGoldQuantity = useMemo(() => gold.reduce((sum, item) => sum + item.quantity, 0), [gold]);
  const goldCost = useMemo(() => gold.reduce((sum, item) => sum + item.quantity * item.buy_price, 0), [gold]);
  const cashBalance = useMemo(() => summary?.cash_balance ?? 0, [summary]);
  const totalAssets = useMemo(() => totalSaving + goldCost + cashBalance, [totalSaving, goldCost, cashBalance]);
  const savingPct = useMemo(() => totalAssets > 0 ? (totalSaving / totalAssets) * 100 : 0, [totalAssets, totalSaving]);
  const goldPct = useMemo(() => totalAssets > 0 ? (goldCost / totalAssets) * 100 : 0, [totalAssets, goldCost]);
  const avgGoldHoldingDays = useMemo(() => gold.length > 0
    ? gold.reduce((sum, item) => sum + Math.max(Math.ceil((Date.now() - (([d, m, y] = item.buy_date.split('/')) => new Date(+y, +m - 1, +d))().getTime()) / 86400000), 0), 0) / gold.length
    : 0, [gold]);
  const hypotheticalSavingReturn = useMemo(() => goldCost > 0
    ? goldCost * weightedSavingRate / 100 * avgGoldHoldingDays / 365
    : 0, [goldCost, weightedSavingRate, avgGoldHoldingDays]);

  const allocation = useMemo(() => [
    { name: 'Tiết kiệm', value: totalSaving, color: '#2563eb' },
    { name: 'Vàng (giá vốn)', value: goldCost, color: '#d97706' },
    { name: 'Tiền mặt', value: cashBalance, color: '#059669' },
  ].filter(item => item.value > 0), [totalSaving, goldCost, cashBalance]);
  const comparisonData = useMemo(() => [
    { name: 'Tiết kiệm', value: totalSaving, fill: '#2563eb' },
    { name: 'Vàng (giá vốn)', value: goldCost, fill: '#d97706' },
  ], [totalSaving, goldCost]);
  const allocationLegend = useMemo(() => allocation.map(item => ({
    name: item.name,
    color: item.color,
    value: item.value,
  })), [allocation]);
  const comparisonLegend = useMemo(() => comparisonData.map(item => ({
    name: item.name,
    color: item.fill,
    value: item.value,
  })), [comparisonData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-80 skeleton" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="h-36 skeleton" />
          <div className="h-36 skeleton" />
          <div className="h-36 skeleton" />
          <div className="h-36 skeleton" />
        </div>
        <div className="h-96 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Tổng quan danh mục</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Thống kê theo tiền riêng, vàng riêng (theo giá vốn).</p>
          {lastRefreshed && <p className="mt-0.5 text-xs font-medium text-slate-400">Cập nhật lúc {lastRefreshed}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricCard
          label="Tổng tài sản"
          value={formatVnd(totalAssets ?? summary?.total_assets)}
          caption={`Tiết kiệm + vàng (giá vốn) + tiền mặt ${formatVnd(cashBalance)}`}
          icon={<CircleDollarSign size={20} />}
          tone="slate"
          description="Tổng giá trị danh mục theo giá vốn."
          formula="Tổng tiền gửi tiết kiệm + Tổng giá vốn vàng + Tiền mặt"
        />
        <MetricCard
          label="Tỷ trọng tiết kiệm"
          value={`${savingPct.toFixed(1)}%`}
          caption={formatVnd(totalSaving)}
          icon={<Landmark size={20} />}
          tone="blue"
          description="Phần trăm tài sản đang nằm ở tiết kiệm."
          formula="Tổng tiền gửi / Tổng tài sản x 100"
        />
        <MetricCard
          label="Tỷ trọng vàng"
          value={`${goldPct.toFixed(1)}%`}
          caption={formatVnd(goldCost)}
          icon={<Coins size={20} />}
          tone="amber"
          description="Phần trăm tài sản đang nằm ở vàng (theo giá vốn)."
          formula="Tổng giá vốn vàng / Tổng tài sản x 100"
        />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-bold text-slate-950">Tiết kiệm</h3>
            <p className="mt-1 text-sm text-slate-500">Chỉ số từ sổ tiết kiệm.</p>
          </div>
          <Building2 size={20} className="text-blue-700" />
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-3">
          <MetricCard
            label="Lãi tiết kiệm tới hạn"
            value={formatVnd(termSavingInterest)}
            caption={`LS bình quân ${weightedSavingRate.toFixed(2)}%/năm`}
            icon={<Percent size={20} />}
            tone="blue"
            description="Tiền lãi ước tính nếu giữ từng sổ đến đúng kỳ hạn đã nhập."
            formula="Tổng từng sổ: Số tiền x Lãi suất năm x Kỳ hạn tháng / 12"
          />
          <MetricCard
            label="Phân tán ngân hàng"
            value={`${new Set(savings.map(s => s.bank)).size} ngân hàng`}
            caption={`${savings.length} sổ`}
            icon={<Building2 size={20} />}
            tone="blue"
            description="Số ngân hàng bạn đang gửi tiết kiệm — phân tán giúp giảm rủi ro và được bảo hiểm tiền gửi tối đa."
            formula="Đếm số ngân hàng xuất hiện trong danh sách sổ tiết kiệm"
          />
          <MetricCard
            label="Tổng tiền gửi"
            value={formatVnd(totalSaving)}
            caption="Tất cả sổ tiết kiệm"
            icon={<Banknote size={20} />}
            tone="blue"
            description="Tổng số tiền gốc đang gửi ở tất cả sổ tiết kiệm."
            formula="Cộng Số tiền của toàn bộ sổ"
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3 className="text-base font-bold text-slate-950">Vàng</h3>
            <p className="mt-1 text-sm text-slate-500">Thống kê vàng theo giá vốn.</p>
          </div>
          <Gem size={20} className="text-amber-700" />
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-3">
          <MetricCard
            label="Tổng khối lượng"
            value={`${totalGoldQuantity.toFixed(1)} chỉ`}
            caption={`${(totalGoldQuantity / 10).toFixed(2)} lượng`}
            icon={<Coins size={20} />}
            tone="amber"
            description="Tổng khối lượng vàng đang nắm giữ, tính theo đơn vị chỉ."
            formula="Cộng Số lượng chỉ của toàn bộ giao dịch"
          />
          <MetricCard
            label="Vốn đầu tư"
            value={formatVnd(goldCost)}
            caption={`${gold.length} giao dịch`}
            icon={<Banknote size={20} />}
            tone="slate"
            description="Tổng tiền đã bỏ ra để mua vàng theo các giao dịch đã nhập."
            formula="Tổng từng giao dịch: Số lượng chỉ x Giá mua/chỉ"
          />
          <MetricCard
            label="Giá vốn trung bình"
            value={formatVnd(totalGoldQuantity > 0 ? goldCost / totalGoldQuantity : 0)}
            caption="Theo mỗi chỉ"
            icon={<CircleDollarSign size={20} />}
            tone="emerald"
            description="Giá vốn bình quân của mỗi chỉ vàng trong danh mục."
            formula="Tổng vốn đầu tư / Tổng số chỉ"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Phân bổ tài sản</h3>
              <p className="mt-1 text-sm text-slate-500">Phân bổ theo giá vốn: tiết kiệm, vàng, tiền mặt.</p>
            </div>
          </div>
          <div className="h-80 min-w-0 px-3 py-6">
            {allocation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={82} outerRadius={122} paddingAngle={2} strokeWidth={0}>
                    {allocation.map(item => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatVnd(Number(value) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Chưa có dữ liệu danh mục</div>
            )}
          </div>
          {allocation.length > 0 && <ChartLegend items={allocationLegend} />}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">So sánh giá trị</h3>
              <p className="mt-1 text-sm text-slate-500">Tiết kiệm và vàng theo giá vốn.</p>
            </div>
          </div>
          <div className="h-80 min-w-0 px-4 py-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 8, right: 20, bottom: 8, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}tr`} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(value) => formatVnd(Number(value) || 0)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {comparisonData.map(item => <Cell key={item.name} fill={item.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend items={comparisonLegend} />
        </section>
      </div>

      {goldCost > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Thời gian nắm giữ vàng</h3>
              <p className="mt-1 text-sm text-slate-500">Thống kê thời gian nắm giữ trung bình.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-2">
            <MetricCard
              label="Thời gian nắm giữ vàng"
              value={`${avgGoldHoldingDays.toFixed(0)} ngày`}
              caption={`${(avgGoldHoldingDays / 365).toFixed(1)} năm`}
              icon={<TrendingUp size={20} />}
              tone="slate"
              description="Thời gian nắm giữ vàng trung bình của toàn bộ giao dịch."
              formula="Trung bình số ngày từ ngày mua đến hiện tại"
            />
            <MetricCard
              label="Tiết kiệm — giả định"
              value={formatVnd(Math.round(hypotheticalSavingReturn))}
              caption={`LS ${weightedSavingRate.toFixed(2)}% · ${avgGoldHoldingDays.toFixed(0)} ngày`}
              icon={<Percent size={20} />}
              tone="blue"
              description="Số lãi ước tính nếu số tiền mua vàng được gửi tiết kiệm với lãi suất bình quân trong cùng khoảng thời gian."
              formula="Tổng vốn vàng x LS bình quân x Số ngày bình quân / 365"
            />
          </div>
        </section>
      )}

      {goals.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="text-base font-bold text-slate-950">Mục tiêu tài chính</h3>
              <p className="mt-1 text-sm text-slate-500">Tiến độ tổng hợp từ các mục tiêu đã tạo.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 px-6 py-4">
            {goals.slice(0, 5).map(g => (
              <div key={g.id} className="flex items-center gap-4 py-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700">{g.priority}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-950">{g.name}</div>
                  <div className="text-xs font-medium text-slate-500">{formatVnd(g.current_amount)} / {formatVnd(g.target_amount)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${g.percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(g.percentage, 100)}%` }} />
                  </div>
                  <span className={`shrink-0 text-xs font-bold ${g.percentage >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{g.percentage}%</span>
                </div>
              </div>
            ))}
            {goals.length > 5 && (
              <div className="py-3 text-center text-xs font-medium text-slate-400">+ {goals.length - 5} mục tiêu khác</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
