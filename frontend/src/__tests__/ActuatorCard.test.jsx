// Feature: smart-reptile-enclosure-dashboard, Property 6: badge aktuator sesuai payload
// Validates: Requirements 5.1, 5.2, 5.3

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import ActuatorCard from '../components/ActuatorCard';

afterEach(() => {
  cleanup();
});

/**
 * Helper: given a rendered ActuatorCard, count how many badge elements
 * display a given text ('ON', 'OFF', or 'Unknown').
 */
function countBadgesWithText(text) {
  return screen.queryAllByText(text).length;
}

/**
 * Property 6: Status badge aktuator mencerminkan nilai sensor payload
 *
 * For any SensorPayload, the displayed badge for relay1, relay2, and humidifier
 * SHALL reflect the string value from the payload:
 *   - 'on'   → badge text is 'ON'
 *   - 'off'  → badge text is 'OFF'
 *   - any other value (including 'unknown', null) → badge text is 'Unknown'
 */
describe('ActuatorCard – Property 6: badge aktuator mencerminkan payload', () => {
  test('badge text matches payload value for all actuator combinations', () => {
    const actuatorArb = fc.constantFrom('on', 'off', 'unknown', null);

    fc.assert(
      fc.property(
        fc.record({
          relay1: actuatorArb,
          relay2: actuatorArb,
          humidifier: actuatorArb,
        }),
        (data) => {
          const { unmount } = render(<ActuatorCard sensorData={data} />);

          const keys = ['relay1', 'relay2', 'humidifier'];

          // Calculate expected badge counts
          let expectedOn = 0;
          let expectedOff = 0;
          let expectedUnknown = 0;

          keys.forEach((key) => {
            const val = data[key];
            if (val === 'on') expectedOn += 1;
            else if (val === 'off') expectedOff += 1;
            else expectedUnknown += 1;
          });

          const actualOn = countBadgesWithText('ON');
          const actualOff = countBadgesWithText('OFF');
          const actualUnknown = countBadgesWithText('Unknown');

          const ok =
            actualOn === expectedOn &&
            actualOff === expectedOff &&
            actualUnknown === expectedUnknown;

          unmount();
          return ok;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Concrete examples as sanity checks
  test('all actuators "on" → 3 ON badges', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: 'on', relay2: 'on', humidifier: 'on' }}
      />
    );
    expect(screen.getAllByText('ON')).toHaveLength(3);
    expect(screen.queryAllByText('OFF')).toHaveLength(0);
    expect(screen.queryAllByText('Unknown')).toHaveLength(0);
  });

  test('all actuators "off" → 3 OFF badges', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: 'off', relay2: 'off', humidifier: 'off' }}
      />
    );
    expect(screen.queryAllByText('ON')).toHaveLength(0);
    expect(screen.getAllByText('OFF')).toHaveLength(3);
    expect(screen.queryAllByText('Unknown')).toHaveLength(0);
  });

  test('all actuators null → 3 Unknown badges', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: null, relay2: null, humidifier: null }}
      />
    );
    expect(screen.queryAllByText('ON')).toHaveLength(0);
    expect(screen.queryAllByText('OFF')).toHaveLength(0);
    expect(screen.getAllByText('Unknown')).toHaveLength(3);
  });

  test('sensorData null → all 3 Unknown badges', () => {
    render(<ActuatorCard sensorData={null} />);
    expect(screen.queryAllByText('ON')).toHaveLength(0);
    expect(screen.queryAllByText('OFF')).toHaveLength(0);
    expect(screen.getAllByText('Unknown')).toHaveLength(3);
  });

  test('"unknown" string value → Unknown badge', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: 'unknown', relay2: 'on', humidifier: 'off' }}
      />
    );
    expect(screen.getAllByText('ON')).toHaveLength(1);
    expect(screen.getAllByText('OFF')).toHaveLength(1);
    expect(screen.getAllByText('Unknown')).toHaveLength(1);
  });
});
