import { cloneElement, isValidElement, type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConversionChart } from './ConversionChart';

const get = vi.fn();
vi.mock('../../api/client', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

// ResponsiveContainer measures its parent, which is always zero in jsdom, so the
// chart never renders. Hand the child explicit dimensions instead.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      isValidElement(children)
        ? cloneElement(children as ReactElement<{ width: number; height: number }>, {
            width: 800,
            height: 300,
          })
        : children,
  };
});

function renderChart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConversionChart />
    </QueryClientProvider>,
  );
}

describe('ConversionChart', () => {
  beforeEach(() => get.mockReset());

  it('renders the array the API actually returns', async () => {
    // Regression: the chart read data.stages, but /reports/conversion returns a
    // bare array, so it always fell through to the empty state.
    get.mockResolvedValue({
      data: [
        { stage_name: 'Applied', entered: 4, exited: 2, conversion_rate: 50 },
        { stage_name: 'Screened', entered: 2, exited: 1, conversion_rate: 50 },
      ],
    });
    renderChart();

    expect(await screen.findByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Screened')).toBeInTheDocument();
    expect(screen.queryByText('No pipeline data yet')).not.toBeInTheDocument();
  });

  it('treats conversion_rate as a percentage, not a fraction', async () => {
    // It was multiplied by 100 a second time, rendering 50% as 5000%.
    get.mockResolvedValue({
      data: [{ stage_name: 'Applied', entered: 4, exited: 2, conversion_rate: 50 }],
    });
    const { container } = renderChart();

    await screen.findByText('Applied');
    const axisLabels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    expect(axisLabels.some((l) => l?.includes('5000'))).toBe(false);
  });

  it('shows the empty state when there is no pipeline data', async () => {
    get.mockResolvedValue({ data: [] });
    renderChart();

    expect(await screen.findByText('No pipeline data yet')).toBeInTheDocument();
  });
});
