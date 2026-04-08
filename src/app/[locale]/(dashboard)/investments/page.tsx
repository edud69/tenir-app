'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate, formatPercent, cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Plus, TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface Investment {
  id: string;
  organization_id: string;
  symbol: string;
  name: string;
  type: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
  adjusted_cost_base: number | null;
  current_price: number | null;
  currency: string;
  account_type: string | null;
  notes: string | null;
  sold: boolean;
  sale_price: number | null;
  sale_date: string | null;
}

interface DividendRecord {
  id: string;
  organization_id: string;
  investment_id: string | null;
  amount: number;
  dividend_type: 'eligible' | 'non_eligible' | 'capital' | 'foreign';
  date: string;
  payer: string | null;
  currency: string;
  withholding_tax: number | null;
}

interface InvestmentFormData {
  symbol: string;
  name: string;
  type: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
  current_price: number;
  currency: string;
  account_type: string;
  notes: string;
}

function InvestmentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvestmentFormData) => void;
  initialData?: InvestmentFormData;
}) {
  const t = useTranslations('investments');
  const commonT = useTranslations('common');
  const [formData, setFormData] = useState<InvestmentFormData>(
    initialData || {
      symbol: '',
      name: '',
      type: 'stock',
      shares: 0,
      purchase_price: 0,
      purchase_date: new Date().toISOString().split('T')[0],
      current_price: 0,
      currency: 'CAD',
      account_type: '',
      notes: '',
    }
  );

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Investment' : t('addInvestment')}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            {commonT('cancel')}
          </Button>
          <Button variant="primary" fullWidth onClick={handleSubmit}>
            {commonT('save')}
          </Button>
        </div>
      }
    >
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('symbol')}
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            placeholder="e.g., RBC"
            required
          />
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as string })}
            options={[
              { value: 'stock', label: 'Stock' },
              { value: 'etf', label: 'ETF' },
              { value: 'bond', label: 'Bond' },
              { value: 'gic', label: 'GIC' },
              { value: 'mutual_fund', label: 'Mutual Fund' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Select
            label="Currency"
            value={formData.currency}
            onChange={(value) => setFormData({ ...formData, currency: value as string })}
            options={[
              { value: 'CAD', label: 'CAD' },
              { value: 'USD', label: 'USD' },
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label={t('shares')}
            type="number"
            step="0.01"
            value={formData.shares}
            onChange={(e) => setFormData({ ...formData, shares: parseFloat(e.target.value) || 0 })}
            required
          />
          <Input
            label={t('acb')}
            type="number"
            step="0.01"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
            helperText="Per share"
            required
          />
          <Input
            label={t('currentValue')}
            type="number"
            step="0.01"
            value={formData.current_price}
            onChange={(e) => setFormData({ ...formData, current_price: parseFloat(e.target.value) || 0 })}
            helperText="Per share"
            required
          />
        </div>

        <Input
          label="Purchase Date"
          type="date"
          value={formData.purchase_date}
          onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
        />

        <Input
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </form>
    </Modal>
  );
}

function PortfolioSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ size: number }>;
}) {
  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-tenir-100 rounded-lg text-tenir-600">
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );
}

export default function InvestmentsPage() {
  const t = useTranslations('investments');
  const commonT = useTranslations('common');
  const { orgId, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchData();
  }, [orgId]);

  async function fetchData() {
    setDataLoading(true);
    setError(null);
    try {
      const [invRes, divRes] = await Promise.all([
        (supabase as any)
          .from('investments')
          .select('*')
          .eq('organization_id', orgId)
          .eq('sold', false)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('dividend_records')
          .select('*')
          .eq('organization_id', orgId)
          .order('date', { ascending: false }),
      ]);

      if (invRes.error) throw invRes.error;
      if (divRes.error) throw divRes.error;

      setInvestments(invRes.data || []);
      setDividends(divRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load investments');
    } finally {
      setDataLoading(false);
    }
  }

  // Calculate portfolio metrics from real data
  const portfolioBookValue = investments.reduce(
    (sum, inv) => sum + inv.shares * inv.purchase_price,
    0
  );
  const portfolioMarketValue = investments.reduce(
    (sum, inv) => sum + inv.shares * (inv.current_price ?? inv.purchase_price),
    0
  );
  const unrealizedGain = portfolioMarketValue - portfolioBookValue;
  const unrealizedGainPercent =
    portfolioBookValue > 0 ? (unrealizedGain / portfolioBookValue) * 100 : 0;

  const ytdDividendIncome = dividends.reduce((sum, div) => sum + div.amount, 0);

  const handleAddInvestment = async (data: InvestmentFormData) => {
    if (!orgId) return;
    try {
      const { error } = await (supabase as any).from('investments').insert({
        organization_id: orgId,
        symbol: data.symbol,
        name: data.name,
        type: data.type,
        shares: data.shares,
        purchase_price: data.purchase_price,
        purchase_date: data.purchase_date,
        adjusted_cost_base: data.purchase_price,
        current_price: data.current_price || null,
        currency: data.currency,
        account_type: data.account_type || null,
        notes: data.notes || null,
        sold: false,
      });
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Failed to add investment');
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm('Delete this investment?')) return;
    try {
      const { error } = await (supabase as any)
        .from('investments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setInvestments((prev) => prev.filter((inv) => inv.id !== id));
    } catch (e: any) {
      setError(e.message || 'Failed to delete investment');
    }
  };

  const isLoading = orgLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title={t('title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <PortfolioSummaryCard
              title={t('bookValue')}
              value={formatCurrency(portfolioBookValue)}
              subtitle="Adjusted cost base"
              icon={DollarSign}
            />
            <PortfolioSummaryCard
              title={t('marketValue')}
              value={formatCurrency(portfolioMarketValue)}
              subtitle="Current market value"
              icon={TrendingUp}
            />
            <PortfolioSummaryCard
              title={t('unrealizedGain')}
              value={formatCurrency(unrealizedGain)}
              subtitle={formatPercent(unrealizedGainPercent / 100)}
              icon={unrealizedGain >= 0 ? ArrowUpRight : ArrowDownLeft}
            />
            <PortfolioSummaryCard
              title={t('dividendIncome')}
              value={formatCurrency(ytdDividendIncome)}
              subtitle="YTD received"
              icon={DollarSign}
            />
          </div>

          {/* Add Investment Button */}
          <div className="mb-8">
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
            >
              {t('addInvestment')}
            </Button>
          </div>

          {/* Holdings Table */}
          <Card padding="none" shadow="sm" className="mb-8">
            <CardHeader className="px-6 pt-6">
              <CardTitle level="h3">Holdings ({investments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {investments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">{commonT('noResults')}</p>
                  <Button
                    variant="outline"
                    icon={<Plus size={16} />}
                    onClick={() => setIsModalOpen(true)}
                  >
                    {t('addInvestment')}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table hoverable>
                    <TableHeader>
                      <TableRow isHeader>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead align="right">Shares</TableHead>
                        <TableHead align="right">ACB</TableHead>
                        <TableHead align="right">Price</TableHead>
                        <TableHead align="right">Market Value</TableHead>
                        <TableHead align="right">Gain/Loss</TableHead>
                        <TableHead align="center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investments.map((inv) => {
                        const bookValue = inv.shares * inv.purchase_price;
                        const marketValue = inv.shares * (inv.current_price ?? inv.purchase_price);
                        const gainLoss = marketValue - bookValue;
                        const gainLossPercent =
                          bookValue > 0 ? (gainLoss / bookValue) * 100 : 0;

                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-semibold text-tenir-600">
                              {inv.symbol}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{inv.name}</p>
                                {inv.type && (
                                  <p className="text-xs text-gray-600 capitalize">{inv.type.replace('_', ' ')}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell align="right" className="font-medium">
                              {inv.shares.toLocaleString('en-CA', { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(inv.purchase_price)}
                            </TableCell>
                            <TableCell align="right" className="font-semibold">
                              {formatCurrency(inv.current_price ?? inv.purchase_price)}
                            </TableCell>
                            <TableCell align="right" className="font-semibold">
                              {formatCurrency(marketValue)}
                            </TableCell>
                            <TableCell align="right">
                              <div className="flex flex-col items-end">
                                <span
                                  className={cn(
                                    'font-semibold',
                                    gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                                  )}
                                >
                                  {formatCurrency(gainLoss)}
                                </span>
                                <span
                                  className={cn(
                                    'text-xs',
                                    gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                                  )}
                                >
                                  ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                                </span>
                              </div>
                            </TableCell>
                            <TableCell align="center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="p-1 hover:bg-red-50 rounded transition-colors"
                                  onClick={() => handleDeleteInvestment(inv.id)}
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dividend Records */}
          <Card padding="none" shadow="sm">
            <CardHeader className="px-6 pt-6">
              <CardTitle level="h3">Dividend Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table hoverable>
                <TableHeader>
                  <TableRow isHeader>
                    <TableHead>Date</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dividends.length > 0 ? (
                    dividends.map((div) => (
                      <TableRow key={div.id}>
                        <TableCell>{formatDate(div.date)}</TableCell>
                        <TableCell>{div.payer || '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              div.dividend_type === 'eligible'
                                ? 'success'
                                : div.dividend_type === 'non_eligible'
                                  ? 'warning'
                                  : 'info'
                            }
                            size="sm"
                          >
                            {div.dividend_type === 'eligible'
                              ? 'Eligible'
                              : div.dividend_type === 'non_eligible'
                                ? 'Non-eligible'
                                : div.dividend_type === 'capital'
                                  ? 'Capital'
                                  : 'Foreign'}
                          </Badge>
                        </TableCell>
                        <TableCell align="right" className="font-semibold">
                          {formatCurrency(div.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <p className="text-gray-600">{commonT('noResults')}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {dividends.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Dividends</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(ytdDividendIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Eligible Dividends</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(
                          dividends
                            .filter((d) => d.dividend_type === 'eligible')
                            .reduce((sum, d) => sum + d.amount, 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Non-Eligible Dividends</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(
                          dividends
                            .filter((d) => d.dividend_type === 'non_eligible')
                            .reduce((sum, d) => sum + d.amount, 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddInvestment}
      />
    </div>
  );
}
