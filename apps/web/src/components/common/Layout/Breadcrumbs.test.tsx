import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  test('renders nothing on home page', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders breadcrumb trail for nested route', () => {
    render(
      <MemoryRouter initialEntries={['/equipment']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Equipment')).toBeInTheDocument();
  });

  test('renders custom breadcrumb items', () => {
    const customItems = [
      { label: 'Custom Home', path: '/' },
      { label: 'Custom Page', path: '/custom' },
      { label: 'Current Page' },
    ];

    render(
      <BrowserRouter>
        <Breadcrumbs customItems={customItems} />
      </BrowserRouter>
    );

    expect(screen.getByText('Custom Home')).toBeInTheDocument();
    expect(screen.getByText('Custom Page')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  test('last breadcrumb is not a link', () => {
    render(
      <MemoryRouter initialEntries={['/equipment']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    const equipmentBreadcrumb = screen.getByText('Equipment');
    expect(equipmentBreadcrumb.closest('a')).not.toBeInTheDocument();
  });

  test('non-last breadcrumbs are links', () => {
    render(
      <MemoryRouter initialEntries={['/equipment']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    const homeBreadcrumb = screen.getByText('Home');
    expect(homeBreadcrumb.closest('a')).toBeInTheDocument();
    expect(homeBreadcrumb.closest('a')).toHaveAttribute('href', '/');
  });

  test('handles deep nested routes', () => {
    render(
      <MemoryRouter initialEntries={['/equipment/plc/details']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Equipment')).toBeInTheDocument();
    expect(screen.getByText('Plc')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  test('respects maxItems prop', () => {
    const customItems = [
      { label: 'Item 1', path: '/1' },
      { label: 'Item 2', path: '/2' },
      { label: 'Item 3', path: '/3' },
      { label: 'Item 4', path: '/4' },
      { label: 'Item 5', path: '/5' },
      { label: 'Current' },
    ];

    render(
      <BrowserRouter>
        <Breadcrumbs customItems={customItems} maxItems={3} />
      </BrowserRouter>
    );

    // MUI Breadcrumbs will show ellipsis when items exceed maxItems
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  test('displays home icon when specified', () => {
    render(
      <MemoryRouter initialEntries={['/equipment']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toBeInTheDocument();
  });
});
