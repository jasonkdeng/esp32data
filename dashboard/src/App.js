import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const API_FALLBACK_URL = process.env.REACT_APP_API_FALLBACK_URL || '';

const getApiUrl = (path) => `${API_BASE_URL}${path}`;
const getFallbackApiUrl = (path) => `${API_FALLBACK_URL}${path}`;

async function fetchReadingsFrom(url) {
  const response = await fetch(url, {
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function App() {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchReadings = async () => {
      try {
        const primaryUrl = getApiUrl('/api/esp32/readings');
        let payload;

        try {
          payload = await fetchReadingsFrom(primaryUrl);
        } catch (primaryError) {
          if (API_FALLBACK_URL && API_FALLBACK_URL !== API_BASE_URL) {
            const fallbackUrl = getFallbackApiUrl('/api/esp32/readings');
            console.warn('Primary dashboard fetch failed, trying fallback endpoint', {
              primaryUrl,
              fallbackUrl,
              error: primaryError.message || primaryError
            });

            payload = await fetchReadingsFrom(fallbackUrl);
          } else {
            throw primaryError;
          }
        }

        if (!isMounted) {
          return;
        }

        setReadings(Array.isArray(payload.readings) ? payload.readings : []);
        setLastUpdated(new Date().toLocaleTimeString());
        setError('');
      } catch (err) {
        console.error('Dashboard readings fetch failed', err);
        if (isMounted) {
          setError(err.message || 'Unable to fetch readings');
        }
      }
    };

    fetchReadings();
    const interval = window.setInterval(fetchReadings, 2000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const groupedSummary = useMemo(() => {
    const map = new Map();

    readings.forEach((reading) => {
      const existing = map.get(reading.title);
      if (!existing) {
        map.set(reading.title, {
          title: reading.title,
          latestValue: reading.value,
          latestTime: reading.timestamp,
          count: 1
        });
      } else {
        existing.count += 1;
      }
    });

    return [...map.values()];
  }, [readings]);

  const formatNumber = (value) => Number(value).toFixed(2);
  const formatDate = (iso) => new Date(iso).toLocaleString();

  return (
    <div className="dashboard-shell">
      <main className="dashboard">
        <header className="dashboard-header">
          <h1>ESP32 Sensor Dashboard</h1>
          <p>
            Live stream of float readings grouped by title.
            {lastUpdated && ` Last refresh: ${lastUpdated}`}
          </p>
        </header>

        {error && <div className="error-banner">API error: {error}</div>}

        <section className="summary-grid" aria-label="Reading summary by title">
          {groupedSummary.length === 0 && (
            <div className="empty-state">Waiting for ESP32 data...</div>
          )}

          {groupedSummary.map((item) => (
            <article className="summary-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="summary-value">{formatNumber(item.latestValue)}</p>
              <p className="summary-meta">Readings: {item.count}</p>
              <p className="summary-meta">Latest: {formatDate(item.latestTime)}</p>
            </article>
          ))}
        </section>

        <section className="table-wrap" aria-label="Recent readings">
          <h2>Recent Readings</h2>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Value</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {readings.slice(0, 20).map((reading, index) => (
                <tr key={`${reading.timestamp}-${reading.title}-${index}`}>
                  <td>{reading.title}</td>
                  <td>{formatNumber(reading.value)}</td>
                  <td>{formatDate(reading.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

export default App;
