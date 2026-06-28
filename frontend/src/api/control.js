const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

/**
 * Send a control command to the backend
 * @param {string} command
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function sendCommand(command) {
  const response = await fetch(`${BACKEND_URL}/api/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}
