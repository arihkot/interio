import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationPicker } from '@/components/LocationPicker';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
};

// Replace the global navigator.geolocation
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
});

describe('LocationPicker', () => {
  it('renders default location correctly', () => {
    render(<LocationPicker onConfirm={jest.fn()} />);
    
    // Initially Maharashtra -> Mumbai
    expect(screen.getByText('Mumbai')).toBeInTheDocument();
    expect(screen.getByText('Maharashtra')).toBeInTheDocument();
  });

  it('changes city correctly based on state selection', () => {
    render(<LocationPicker onConfirm={jest.fn()} />);
    
    const stateSelect = screen.getByLabelText('State');
    fireEvent.change(stateSelect, { target: { value: 'Karnataka' } });
    
    expect(screen.getByText('Bengaluru')).toBeInTheDocument();
  });

  it('calls onConfirm with the right values', () => {
    const handleConfirm = jest.fn();
    render(<LocationPicker onConfirm={handleConfirm} />);
    
    const confirmButton = screen.getByText('Confirm Location');
    fireEvent.click(confirmButton);
    
    expect(handleConfirm).toHaveBeenCalledWith({
      latitude: 19.076,
      longitude: 72.8777,
      city: 'Mumbai',
      state: 'Maharashtra',
    });
  });
});
