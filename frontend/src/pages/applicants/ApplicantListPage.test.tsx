import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApplicantListPage from './ApplicantListPage';

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>,
}));

const get = vi.fn();
vi.mock('../../api/client', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

const applicant = (i: number) => ({
  id: `a${i}`,
  job_id: 'job-1',
  stage_id: 's1',
  candidate_name: `Cand ${i}`,
  candidate_email: `c${i}@test.dev`,
  candidate_phone: '',
  form_data: {},
  applied_at: '2026-01-01T00:00:00Z',
});

function mockApi({ total, rows }: { total: number; rows: number }) {
  get.mockImplementation((url: string, cfg?: { params?: Record<string, unknown> }) => {
    if (url === '/jobs') {
      return Promise.resolve({ data: [{ id: 'job-1', title: 'Backend Engineer' }] });
    }
    return Promise.resolve({
      data: {
        data: Array.from({ length: rows }, (_, i) => applicant(i)),
        total,
        page: (cfg?.params?.page as number) ?? 1,
        limit: 20,
      },
    });
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ApplicantListPage />
    </QueryClientProvider>,
  );
}

describe('ApplicantListPage', () => {
  beforeEach(() => get.mockReset());

  it('reports the real total, not the page size', async () => {
    mockApi({ total: 42, rows: 20 });
    renderPage();

    expect(await screen.findByText('42 candidates across your jobs')).toBeInTheDocument();
  });

  it('singularises a single candidate', async () => {
    mockApi({ total: 1, rows: 1 });
    renderPage();

    expect(await screen.findByText('1 candidate across your jobs')).toBeInTheDocument();
  });

  it('derives page count from the total', async () => {
    mockApi({ total: 42, rows: 20 });
    renderPage();

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('hides pagination when everything fits on one page', async () => {
    mockApi({ total: 3, rows: 3 });
    renderPage();

    await screen.findByText('3 candidates across your jobs');
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last', async () => {
    mockApi({ total: 21, rows: 20 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Page 1 of 2');
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByText('Page 2 of 2');
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('filters by job', async () => {
    mockApi({ total: 5, rows: 5 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('5 candidates across your jobs');
    await user.selectOptions(await screen.findByLabelText(/filter by job/i), 'job-1');

    await waitFor(() => {
      const calls = get.mock.calls.filter((c) => c[0] === '/applications');
      expect(calls[calls.length - 1]?.[1]?.params).toMatchObject({ job_id: 'job-1', page: 1 });
    });
  });

  it('debounces search into a single request', async () => {
    mockApi({ total: 5, rows: 5 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('5 candidates across your jobs');
    const before = get.mock.calls.filter((c) => c[0] === '/applications').length;

    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'grace');

    await waitFor(() => {
      const calls = get.mock.calls.filter((c) => c[0] === '/applications');
      expect(calls[calls.length - 1]?.[1]?.params).toMatchObject({ search: 'grace' });
    });

    // Five keystrokes must not mean five round trips.
    const after = get.mock.calls.filter((c) => c[0] === '/applications').length;
    expect(after - before).toBeLessThan(5);
  });
});
