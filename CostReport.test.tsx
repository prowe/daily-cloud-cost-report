import {it} from 'vitest';
import {screen, render} from '@testing-library/react';
import CostReport from './CostReport';
import React from 'react';

it('should render a report table', () => {
    render(<CostReport />);
    
    const table = screen.getByRole('table');
});