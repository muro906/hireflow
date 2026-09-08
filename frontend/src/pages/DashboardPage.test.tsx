import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './DashboardPage';

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>,
}));

const get = vi.fn();
vi.mock('../api/client', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

function mockApi({ total = 0, timeToHire = [] as { avg_days: number }[] } = {}) {
  get.mockImplementation((url: string) => {
    if (url === '/jobs') return Promise.resolve({ data: [{ id: 'j1', title: 'Engineer', location: 'Remote' }] });
    if (url === '/applications') return Promise.resolve({ data: { data: [], total, page: 1, limit: 1 } });
    if (url === '/reports/time-to-hire') return Promise.resolve({ data: timeToHire });
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => get.mockReset());

  it('shows the candidate total from the API', async () => {
    mockApi({ total: 137 });
    renderPage();

    expect(await screen.findByText('137')).toBeInTheDocument();
  });

  it('averages time to hire across the reported months', async () => {
    mockApi({ total: 5, timeToHire: [{ avg_days: 10 }, { avg_days: 20 }, { avg_days: 31 }] });
    renderPage();

    // (10 + 20 + 31) / 3 = 20.33 -> 20
    expect(await screen.findByText('20d')).toBeInTheDocument();
  });

  it('shows a dash rather than a number when nothing has been hired', async () => {
    mockApi({ total: 5, timeToHire: [] });
    renderPage();

    await screen.findByText('5');
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('lists open positions', async () => {
    mockApi({ total: 0 });
    renderPage();

    expect(await screen.findByText('Engineer')).toBeInTheDocument();
  });
});
