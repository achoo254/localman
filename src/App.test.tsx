import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders request panel with new request action', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /new request/i })).toBeInTheDocument();
    expect(screen.getByText(/select a request from the sidebar or create a new one/i)).toBeInTheDocument();
  });
});
