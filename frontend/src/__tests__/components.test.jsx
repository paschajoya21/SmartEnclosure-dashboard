// Unit tests for rendering components: SensorCard, ActuatorCard, Header, LogPanel, ControlPanel
// Validates: Requirements 4.1, 4.5, 5.1, 5.2, 5.3, 7.2, 7.3, 8.1, 8.2, 6.1, 6.2

import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SensorCard from '../components/SensorCard';
import ActuatorCard from '../components/ActuatorCard';
import Header from '../components/Header';
import LogPanel from '../components/LogPanel';
import ControlPanel from '../components/ControlPanel';

// Mock the sendCommand API used by ControlPanel
jest.mock('../api/control', () => ({
  sendCommand: jest.fn(),
}));
const { sendCommand } = require('../api/control');

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// SensorCard – Validates: Requirements 4.1, 4.5
// ---------------------------------------------------------------------------

describe('SensorCard', () => {
  test('menampilkan "--" untuk semua sensor saat sensorData === null', () => {
    render(<SensorCard sensorData={null} />);

    // All three sensor value slots should show '--'
    const dashes = screen.getAllByText('--');
    expect(dashes).toHaveLength(3);
  });

  test('menampilkan nilai temperature yang benar saat sensorData ada', () => {
    const sensorData = { temperature: 28.5, humidity: 65.0, lux: 1200 };
    render(<SensorCard sensorData={sensorData} />);

    // Temperature: 28.5 → displayed as "28.5" with unit "°C"
    expect(screen.getByText('28.5')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();
  });

  test('menampilkan nilai humidity yang benar saat sensorData ada', () => {
    const sensorData = { temperature: 28.5, humidity: 65.0, lux: 1200 };
    render(<SensorCard sensorData={sensorData} />);

    // Humidity: 65.0 → "65.0" with unit "%"
    expect(screen.getByText('65.0')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  test('menampilkan nilai lux yang benar saat sensorData ada', () => {
    const sensorData = { temperature: 28.5, humidity: 65.0, lux: 1200 };
    render(<SensorCard sensorData={sensorData} />);

    // Lux: 1200 → "1200.0" with unit "lx"
    expect(screen.getByText('1200.0')).toBeInTheDocument();
    expect(screen.getByText('lx')).toBeInTheDocument();
  });

  test('tidak menampilkan "--" saat sensorData ada dengan nilai valid', () => {
    const sensorData = { temperature: 28.5, humidity: 65.0, lux: 1200 };
    render(<SensorCard sensorData={sensorData} />);

    expect(screen.queryAllByText('--')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ActuatorCard – Validates: Requirements 5.1, 5.2, 5.3
// ---------------------------------------------------------------------------

describe('ActuatorCard', () => {
  test('menampilkan badge "Unknown" saat semua status null (sensorData null)', () => {
    render(<ActuatorCard sensorData={null} />);

    const unknownBadges = screen.getAllByText('Unknown');
    expect(unknownBadges).toHaveLength(3);
  });

  test('menampilkan badge "Unknown" saat nilai aktuator undefined', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: undefined, relay2: undefined, humidifier: undefined }}
      />
    );

    const unknownBadges = screen.getAllByText('Unknown');
    expect(unknownBadges).toHaveLength(3);
  });

  test('menampilkan badge "ON" saat status relay1 adalah "on"', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: 'on', relay2: 'off', humidifier: 'off' }}
      />
    );

    expect(screen.getAllByText('ON')).toHaveLength(1);
  });

  test('menampilkan badge "ON" untuk semua aktuator saat semua status "on"', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: 'on', relay2: 'on', humidifier: 'on' }}
      />
    );

    expect(screen.getAllByText('ON')).toHaveLength(3);
    expect(screen.queryAllByText('OFF')).toHaveLength(0);
    expect(screen.queryAllByText('Unknown')).toHaveLength(0);
  });

  test('menampilkan badge "OFF" saat status relay1 adalah "off"', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: 'off', relay2: 'on', humidifier: 'on' }}
      />
    );

    expect(screen.getAllByText('OFF')).toHaveLength(1);
  });

  test('menampilkan badge "OFF" untuk semua aktuator saat semua status "off"', () => {
    render(
      <ActuatorCard
        sensorData={{ relay1: 'off', relay2: 'off', humidifier: 'off' }}
      />
    );

    expect(screen.queryAllByText('ON')).toHaveLength(0);
    expect(screen.getAllByText('OFF')).toHaveLength(3);
    expect(screen.queryAllByText('Unknown')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Header – Validates: Requirements 7.2, 7.3
// ---------------------------------------------------------------------------

describe('Header', () => {
  test('menampilkan teks "Server Connected" saat socketConnected=true', () => {
    render(<Header socketConnected={true} mqttStatus="connected" />);

    expect(screen.getByText('Server Connected')).toBeInTheDocument();
  });

  test('dot Socket.IO berwarna hijau (dotGreen) saat socketConnected=true', () => {
    const { container } = render(
      <Header socketConnected={true} mqttStatus="connected" />
    );

    // react-scripts maps CSS Module class .dotGreen → className="dotGreen"
    const greenDots = container.querySelectorAll('.dotGreen');
    expect(greenDots.length).toBeGreaterThanOrEqual(1);
  });

  test('menampilkan teks "Server Disconnected" saat socketConnected=false', () => {
    render(<Header socketConnected={false} mqttStatus="connected" />);

    expect(screen.getByText('Server Disconnected')).toBeInTheDocument();
  });

  test('dot Socket.IO berwarna merah (dotRed) saat socketConnected=false', () => {
    const { container } = render(
      <Header socketConnected={false} mqttStatus="disconnected" />
    );

    const redDots = container.querySelectorAll('.dotRed');
    expect(redDots.length).toBeGreaterThanOrEqual(1);
  });

  test('menampilkan teks "MQTT: Disconnected" saat mqttStatus="disconnected"', () => {
    render(<Header socketConnected={true} mqttStatus="disconnected" />);

    expect(screen.getByText(/MQTT:.*Disconnected/)).toBeInTheDocument();
  });

  test('dot MQTT berwarna merah (dotRed) saat mqttStatus="disconnected"', () => {
    const { container } = render(
      <Header socketConnected={false} mqttStatus="disconnected" />
    );

    const redDots = container.querySelectorAll('.dotRed');
    // Both socket (disconnected) and MQTT (disconnected) → at least 2 red dots
    expect(redDots.length).toBeGreaterThanOrEqual(2);
  });

  test('dot MQTT berwarna hijau (dotGreen) saat mqttStatus="connected"', () => {
    const { container } = render(
      <Header socketConnected={true} mqttStatus="connected" />
    );

    // Both socket and MQTT connected → 2 green dots
    const greenDots = container.querySelectorAll('.dotGreen');
    expect(greenDots.length).toBeGreaterThanOrEqual(2);
  });
});


// ---------------------------------------------------------------------------
// LogPanel – Validates: Requirements 8.1, 8.2
// ---------------------------------------------------------------------------

describe('LogPanel', () => {
  test('menampilkan pesan kosong saat tidak ada log', () => {
    render(<LogPanel logs={[]} />);
    expect(
      screen.getByText(/No log messages yet/i)
    ).toBeInTheDocument();
  });

  test('menampilkan jumlah entries "0 entries" saat logs kosong', () => {
    render(<LogPanel logs={[]} />);
    expect(screen.getByText('0 entries')).toBeInTheDocument();
  });

  test('menampilkan "1 entries" saat ada 1 log entry', () => {
    const logs = [
      { id: 1, message: 'Test message', timestamp: new Date().toISOString() },
    ];
    render(<LogPanel logs={logs} />);
    expect(screen.getByText('1 entries')).toBeInTheDocument();
  });

  test('menampilkan pesan log yang masuk', () => {
    const logs = [
      { id: 1, message: 'MQTT connected', timestamp: new Date().toISOString() },
      { id: 2, message: 'Sensor data received', timestamp: new Date().toISOString() },
    ];
    render(<LogPanel logs={logs} />);

    expect(screen.getByText('MQTT connected')).toBeInTheDocument();
    expect(screen.getByText('Sensor data received')).toBeInTheDocument();
  });

  test('menampilkan "2 entries" saat ada 2 log entry', () => {
    const logs = [
      { id: 1, message: 'msg 1', timestamp: new Date().toISOString() },
      { id: 2, message: 'msg 2', timestamp: new Date().toISOString() },
    ];
    render(<LogPanel logs={logs} />);
    expect(screen.getByText('2 entries')).toBeInTheDocument();
  });

  test('logs prop default (tanpa prop) tidak crash', () => {
    // LogPanel has defaultProps logs=[], should render without error
    render(<LogPanel />);
    expect(screen.getByText(/No log messages yet/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ControlPanel – Validates: Requirements 6.1, 6.2
// ---------------------------------------------------------------------------

describe('ControlPanel', () => {
  beforeEach(() => {
    sendCommand.mockReset();
  });

  test('menampilkan judul "Actuator Control"', () => {
    render(<ControlPanel mqttStatus="connected" />);
    expect(screen.getByText(/Actuator Control/i)).toBeInTheDocument();
  });

  test('menampilkan warning saat MQTT tidak connected', () => {
    render(<ControlPanel mqttStatus="disconnected" />);
    expect(screen.getByText(/MQTT not connected/i)).toBeInTheDocument();
  });

  test('tidak menampilkan warning saat MQTT connected', () => {
    render(<ControlPanel mqttStatus="connected" />);
    expect(screen.queryByText(/MQTT not connected/i)).not.toBeInTheDocument();
  });

  test('tombol disabled saat mqttStatus bukan "connected"', () => {
    render(<ControlPanel mqttStatus="disconnected" />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  test('tombol enabled saat mqttStatus "connected"', () => {
    render(<ControlPanel mqttStatus="connected" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn).not.toBeDisabled();
    });
  });

  test('klik tombol relay1 ON memanggil sendCommand("relay1_on") saat MQTT connected', async () => {
    sendCommand.mockResolvedValueOnce({ success: true, message: 'Command sent' });

    render(<ControlPanel mqttStatus="connected" />);

    const relay1OnBtn = screen.getByLabelText('Relay 1 ON');
    fireEvent.click(relay1OnBtn);

    await waitFor(() => {
      expect(sendCommand).toHaveBeenCalledWith('relay1_on');
    });
  });

  test('menampilkan pesan sukses setelah command berhasil', async () => {
    sendCommand.mockResolvedValueOnce({ success: true, message: 'Relay 1 ON sent' });

    render(<ControlPanel mqttStatus="connected" />);
    fireEvent.click(screen.getByLabelText('Relay 1 ON'));

    await waitFor(() => {
      expect(screen.getByText('Relay 1 ON sent')).toBeInTheDocument();
    });
  });

  test('menampilkan pesan error saat command gagal', async () => {
    sendCommand.mockRejectedValueOnce(new Error('Connection refused'));

    render(<ControlPanel mqttStatus="connected" />);
    fireEvent.click(screen.getByLabelText('Relay 1 OFF'));

    await waitFor(() => {
      expect(screen.getByText('Connection refused')).toBeInTheDocument();
    });
  });

  test('klik tombol "All OFF" memanggil sendCommand("all_off")', async () => {
    sendCommand.mockResolvedValueOnce({ success: true, message: 'All OFF sent' });

    render(<ControlPanel mqttStatus="connected" />);
    fireEvent.click(screen.getByLabelText('🛑 All OFF'));

    await waitFor(() => {
      expect(sendCommand).toHaveBeenCalledWith('all_off');
    });
  });

  test('callback onCommandSent dipanggil setelah command sukses', async () => {
    sendCommand.mockResolvedValueOnce({ success: true, message: 'OK' });
    const onCommandSent = jest.fn();

    render(<ControlPanel mqttStatus="connected" onCommandSent={onCommandSent} />);
    fireEvent.click(screen.getByLabelText('Relay 1 ON'));

    await waitFor(() => {
      expect(onCommandSent).toHaveBeenCalledWith('relay1_on');
    });
  });
});
