'use client';

import React, { useState } from 'react';
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

interface Investment {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  acb: number; // Adjusted Cost Base per share
  currentPrice: number;
  lastUpdated: string;
  sector?: string;
}

interface Dividend {
  id: string;
  date: string;
  symbol: string;
  payer: string;
  amount: number;
  type: 'eligible' | 'ineligible' | 'return_of_capital';
}

const mockInvestments: Investment[] = [
  {
    id: '1',
    symbol: 'RBC',
    name: 'Royal Bank of Canada',
    shares: 150,
    acb: 98.5,
    currentPrice: 126.45,
    lastUpdated: '2024-03-20',
    sector: 'Financials',
  },
  {
    id: '2',
    symbol: 'TD',
    name: 'Toronto-Dominion Bank',
    shares: 200,
    acb: 68.2,
    currentPrice: 81.30,
    lastUpdated: '2024-03-20',
    sector: 'Financials',
  },
  {
    id: '3',
    symbol: 'CNQ',
    name: 'Canadian Natural Resources',
    shares: 250,
    acb: 42.1,
    currentPrice: 56.75,
    lastUpdated: '2024-03-20',
    sector: 'Energy',
  },
  {
    id: '4',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    shares: 50,
    acb: 310.25,
    currentPrice: 421.80,
    lastUpdated: '2024-03-20',
    sector: 'Technology',
  },
  {
    id: '5',
    symbol: 'VFV',
    name: 'Vanguard U.S. Total Index ETF',
    shares: 300,
    acb: 68.5,
    currentPrice: 82.10,
    lastUpdated: '2024-03-20',
    sector: 'Diversified',
  },
];

const mockDividends: Dividend[] = [
  {
    id: '1',
    date: '2024-03-15',
    symbol: 'RBC',
    payer: 'Royal Bank of Canada',
    amount: 112.50,
    type: 'eligible',
  },
  {
    id: '2',
    date: '2024-03-10',
    symbol: 'TD',
    payer: 'Toronto-Dominion Bank',
    amount: 150.00,
    type: 'eligible',
  },
  {
    id: '3',
    date: '2024-02-28',
    symbol: 'CNQ',
    payer: 'Canadian Natural Resources',
    amount: 87.50,
    type: 'ineligible',
  },
  {
    id: '4',
    date: '2024-02-15',
    symbol: 'VFV',
    payer: 'Vanguard U.S. Total Index ETF',
    amount: 65.25,
    type: 'eligible',
  },
];

function InvestmentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Investment>) => void;
  initialData?: Investment;
}) {
  const t = useTranslations('investments');
  const commonT = useTranslations('common');
  const [formData, setFormData] = useState<Partial<Investment>>(
    initialData || {
      symbol: '',
      name: '',
      shares: 0,
      acb: 0,
      currentPrice: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    }
  );

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
            value={formData.symbol || ''}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            placeholder="e.g., RBC"
            required
          />
          <Input
            label="Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label={t('shares')}
            type="number"
            step="0.01"
            value={formData.shares || 0}
            onChange={(e) => setFormData({ ...formData, shares: parseFloat(e.target.value) })}
            required
          />
          <Input
            label={t('acb')}
            type="number"
            step="0.01"
            value={formData.acb || 0}
            onChange={(e) => setFormData({ ...formData, acb: parseFloat(e.target.value) })}
            helperText="Per share"
            required
          />
          <Input
            label={t('currentValue')}
            type="number"
            step="0.01"
            value={formData.currentPrice || 0}
            onChange={(e) => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) })}
            helperText="Per share"
            required
          />
        </div>

        <Input
          label="Last Updated"
          type="date"
          value={formData.lastUpdated || ''}
          onChange={(e) => setFormData({ ...formData, lastUpdated: e.target.value })}
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
  const [investments, setInvestments] = useState<Investment[]>(mockInvestments);
  const [dividends, setDividends] = useState<Dividend[]>(mockDividends);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate portfolio metrics
  const portfolioBookValue = investments.reduce((sum, inv) => sum + inv.shares * inv.acb, 0);
  const portfolioMarketValue = investments.reduce((sum, inv) => sum + inv.shares * inv.currentPrice, 0);
  const unrealizedGain = portfolioMarketValue - portfolioBookValue;
  const unrealizedGainPercent = (unrealizedGain / portfolioBookValue) * 100;

  // Calculate YTD dividend income
  const ytdDividendIncome = dividends.reduce((sum, div) => sum + div.amount, 0);

  const handleAddInvestment = (data: Partial<Investment>) => {
    const newInvestment: Investment = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: data.symbol || '',
      name: data.name || '',
      shares: data.shares || 0,
      acb: data.acb || 0,
      currentPrice: data.currentPrice || 0,
      lastUpdated: data.lastUpdated || new Date().toISOString().split('T')[0],
    };
    setInvestments([...investments, newInvestment]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
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
                      const bookValue = inv.shares * inv.acb;
                      const marketValue = inv.shares * inv.currentPrice;
                      const gainLoss = marketValue - bookValue;
                      const gainLossPercent = (gainLoss / bookValue) * 100;

                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-semibold text-tenir-600">
                            {inv.symbol}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{inv.name}</p>
                              {inv.sector && (
                                <p className="text-xs text-gray-600">{inv.sector}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell align="right" className="font-medium">
                            {inv.shares.toLocaleString('en-CA', { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(inv.acb)}
                          </TableCell>
                          <TableCell align="right" className="font-semibold">
                            {formatCurrency(inv.currentPrice)}
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
                              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                                <Edit2 size={16} className="text-gray-600" />
                              </button>
                              <button className="p-1 hover:bg-red-50 rounded transition-colors">
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
                    <TableHead>Symbol</TableHead>
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
                        <TableCell className="font-semibold text-tenir-600">
                          {div.symbol}
                        </TableCell>
                        <TableCell>{div.payer}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              div.type === 'eligible'
                                ? 'success'
                                : div.type === 'ineligible'
                                  ? 'warning'
                                  : 'info'
                            }
                            size="sm"
                          >
                            {div.type === 'eligible'
                              ? 'Eligible'
                              : div.type === 'ineligible'
                                ? 'Non-eligible'
                                : 'ROC'}
                          </Badge>
                        </TableCell>
                        <TableCell align="right" className="font-semibold">
                          {formatCurrency(div.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
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
                            .filter((d) => d.type === 'eligible')
                            .reduce((sum, d) => sum + d.amount, 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Non-Eligible Dividends</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(
                          dividends
                            .filter((d) => d.type === 'ineligible')
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
