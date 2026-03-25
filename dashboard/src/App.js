import { useEffect, useMemo, useState } from 'react';
import './App.css';

function App() {
  const [readings, setReadings] = useState([]);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchReadings = async () => {
      try {
        const response = await fetch('/api/esp32/readings');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        setReadings(Array.isArray(payload.readings) ? payload.readings : []);
        setLatest(payload.latest || null);
        setLastUpdated(new Date().toLocaleTimeString());
        setError('');
      } catch (err) {
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

        <section className="latest-card" aria-label="Latest reading">
          <h2>Latest Reading</h2>
          {latest ? (
            <>
              <div className="latest-title">{latest.title}</div>
              <div className="latest-value">{formatNumber(latest.value)}</div>
              <div className="latest-time">{formatDate(latest.timestamp)}</div>
            </>
          ) : (
            <div className="empty-state">No readings received yet.</div>
          )}
        </section>

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
