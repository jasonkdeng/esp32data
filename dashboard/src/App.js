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

  const [activeTab, setActiveTab] = useState('Sensor Dashboard');
  const [servoAngle, setServoAngle] = useState(90);
  const [actuatorPosition, setActuatorPosition] = useState(1400);

  const [readings, setReadings] = useState([]);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Sends requests to backend

  const moveActuatorCommand = async () => {
    const value = Math.max(
      1075,
      Math.min(1800, Number(actuatorPosition))
    );

    const response = await fetch(
      getApiUrl('/api/esp32/move-actuator'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          position: value
        })
      }
    );

    console.log(await response.json());
  };

  const moveServoCommand = async () => {
    const value = Math.max(
      0,
      Math.min(180, Number(servoAngle))
    );

    const response = await fetch(
      getApiUrl('/api/esp32/move-servo'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          angle: value
        })
      }
    );

    console.log(await response.json());
  };

  const setResetPositionCommand = async () => {
    const value = Math.max(
      0,
      Math.min(180, Number(servoAngle))
    );

    const response = await fetch(
      getApiUrl('/api/esp32/reset-position'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          angle: value
        })
      }
    );

    const data = await response.json();
    console.log(data);
  };

  const setBrakePositionCommand = async () => {
    const value = Math.max(
      0,
      Math.min(180, Number(servoAngle))
    );

    const response = await fetch(
      getApiUrl('/api/esp32/brake-position'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          angle: value
        })
      }
    );

    const data = await response.json();
    console.log(data);
  };
  

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

  // When the [readings] array changes, get the value of brake/reset position
  const latestBrakePosition = useMemo(() => {
    return readings.find((reading) => reading.title === 'Brake Position')?.value;
  }, [readings]);

  const latestResetPosition = useMemo(() => {
    return readings.find((reading) => reading.title === 'Reset Position')?.value;}, [readings]);

  const groupedSummary = useMemo(() => {
    const map = new Map();

    readings
      .filter(
        (reading) =>
          reading.title !== 'Brake Position' &&
          reading.title !== 'Reset Position'
      )
      .forEach((reading) => {
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
              Live stream of float readings grouped by title & servo calibration.
              {lastUpdated && ` Last refresh: ${lastUpdated}`}
            </p>
          </header>

          {error && <div className="error-banner">API error: {error}</div>}

          <div className="tab-bar">
            <button class="button"onClick={() => setActiveTab('Sensor Dashboard')}>
              Sensor Dashboard
            </button>

            <button class="button"onClick={() => setActiveTab('Servo Calibration')}>
              Servo Calibration
            </button>

            <button class="button"onClick={() => setActiveTab('Linear Actuator Control')}>
              Linear Actuator Control
            </button>


          </div>

          {activeTab === 'Sensor Dashboard' && (
            <>
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
                    {readings
                      .filter(
                        (reading) =>
                          reading.title !== 'Brake Position' &&
                          reading.title !== 'Reset Position'
                      )
                      .slice(0, 20)
                      .map((reading, index) => (
                        <tr key={`${reading.timestamp}-${reading.title}-${index}`}>
                          <td>{reading.title}</td>
                          <td>{formatNumber(reading.value)}</td>
                          <td>{formatDate(reading.timestamp)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
          {activeTab === 'Servo Calibration' && (
            
            <>
              <div className="empty-state">Calibrate by using the slider or manually entering a value (0-180). Click the reset or brake position buttons to set positions.</div>
              <section className="table-wrap">
                <h2>Servo Calibration</h2>

                <div className="servo-control">
                  <label>
                    Angle: {servoAngle}°
                  </label>

                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={servoAngle}
                    onChange={(e) => setServoAngle(Number(e.target.value))}
                  />

                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={servoAngle}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setServoAngle(e.target.value)}
                    onBlur={() => {
                      let v = Number(servoAngle);

                      if (Number.isNaN(v)) v = 0;
                      v = Math.max(0, Math.min(180, v));

                      setServoAngle(String(v));
                    }}
                  />

                  <button class = "button" onClick={moveServoCommand}>
                    Move Servo
                  </button>

                </div>
              </section>

              <section className="table-wrap">
                <div className="servo-button-row">
                  <button class = "button" onClick={setResetPositionCommand}>
                    Set Reset Position
                  </button>

                  <button class = "button" onClick={setBrakePositionCommand}>
                    Set Brake Position
                  </button>
                </div>
              </section>

              <section className="table-wrap">
                  <div className="summary-grid">
                    <article className="summary-card">
                      <h3>Reset Position</h3>
                      <p className="summary-value">
                        {latestResetPosition ?? '--'}°
                      </p>
                    </article>

                    <article className="summary-card">
                      <h3>Brake Position</h3>
                      <p className="summary-value">
                        {latestBrakePosition ?? '--'}°
                      </p>
                    </article>

                  </div>
              </section>



            </>
          )}
          
          {activeTab === 'Linear Actuator Control' && (

            <>
              <div className="empty-state">Control by using the slider or entering a position value 1075-1800</div>
              
              <section className="table-wrap">
                <h2>Linear Actuator Control</h2>

                <div className="servo-control">
                  <label>
                    Position: {actuatorPosition}µs
                  </label>

                  <input
                    type="range"
                    min="1075"
                    max="1800"
                    value={Number(actuatorPosition)}
                    onChange={(e) => setActuatorPosition(e.target.value)}
                  />

                  <input
                    type="number"
                    min="1075"
                    max="1800"
                    value={actuatorPosition}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setActuatorPosition(e.target.value)}
                    onBlur={() => {
                      let v = Number(actuatorPosition);

                      if (Number.isNaN(v)) v = 1075;
                      v = Math.max(1075, Math.min(1800, v));

                      setActuatorPosition(String(v));
                    }}
                  />

                  <button class = "button" onClick={moveActuatorCommand}>
                    Move Actuator
                  </button>

                </div>
              </section>

            </>

          )}


        </main>
      </div>
  );
}

export default App;
