import React from 'react';
import { RenderOptions, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * Shared test utility that provides React Query and Router context
 * for component testing
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: {
    queryClient?: QueryClient;
    initialEntries?: string[];
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  } = {}
) {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
    initialEntries = ['/'],
    renderOptions,
  } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
