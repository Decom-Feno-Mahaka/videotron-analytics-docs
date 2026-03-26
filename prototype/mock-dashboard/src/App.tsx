import { createSignal, onCleanup, onMount, For, Show } from 'solid-js';
import Chart from 'chart.js/auto';
import './index.css';

type Campaign = {
  id: string;
  name: string;
  locations: { name: string; audience: number; attention: number }[];
  audienceLog: { timestamp: number; location: string; audienceCount: number; attentionTime: number }[];
  totalAudience: number;
  displayAudience: number;
  averageAttentionTime: number;
  eventsCount: number;
};

type EventPayload = {
  timestamp: number;
  campaign_id: string;
  campaign_name: string;
  location: string;
  audience: {
    total_count: number;
    attention: { average_attention_time_seconds: number; };
  };
};

type StatsResponse = {
  scale: string;
  overallAudience: number;
  overallAttention: number;
  insightSummary: string;
  campaigns: Campaign[];
  chartData: { label: string; value: number }[];
  recentEvents: EventPayload[];
};

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [stats, setStats] = createSignal<StatsResponse | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);
  const [timeScale, setTimeScale] = createSignal('day');
  const [selectedCampaign, setSelectedCampaign] = createSignal<Campaign | null>(null);

  let chartCanvas: HTMLCanvasElement | undefined;
  let pieCanvas: HTMLCanvasElement | undefined;
  let doughnutCanvas: HTMLCanvasElement | undefined;
  let chartInstance: Chart | null = null;
  let pieInstance: Chart | null = null;
  let doughnutInstance: Chart | null = null;

  const fetchData = async () => { // Renamed from fetchStats
    try {
      const res = await fetch(`${API_URL}/api/stats?timeScale=${timeScale()}`);
      if (res.ok) {
        const data: StatsResponse = await res.json();
        setStats(data);
        setIsConnected(true);
        updateChart(data.chartData);
        updatePieCharts(data.campaigns); // Call to update pie charts

        // If a campaign is currently selected, update its reference to latest data
        if (selectedCampaign()) {
          const updated = data.campaigns.find(c => c.id === selectedCampaign()?.id);
          if (updated) setSelectedCampaign(updated);
        }
      } else { setIsConnected(false); }
    } catch { setIsConnected(false); }
  };

  const updateChart = (data: { label: string, value: number }[]) => {
    if (!chartCanvas) return;
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);

    // Default height handling in case container is weird
    if (chartCanvas) {
      chartCanvas.style.height = '230px';
    }

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = values;
      chartInstance.update('none'); // silent update without animation flash
    } else {

      // Creating a gradient fill for the chart line
      const ctx = chartCanvas.getContext('2d');
      let gradient: string | CanvasGradient = 'rgba(0, 245, 255, 0.1)';
      if (ctx) {
        gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 245, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 245, 255, 0.0)');
      }

      chartInstance = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Tren Audiens',
            data: values,
            borderColor: '#00f5ff',
            backgroundColor: gradient as any,
            borderWidth: 3,
            pointBackgroundColor: '#00f5ff',
            pointBorderColor: '#ffffff',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 },
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#7F8EA3' } },
            x: { grid: { display: false }, ticks: { color: '#7F8EA3' } }
          }
        }
      });
    }
  };

  const updatePieCharts = (campaigns: Campaign[]) => {
    if (!stats()) return; // Ensure stats are available

    const campaignNames = campaigns.map((c: Campaign) => c.name);
    const campaignAudiences = campaigns.map((c: Campaign) => c.displayAudience);
    const campaignEvents = campaigns.map((c: Campaign) => c.eventsCount);
    const colors = ['#00f5ff', '#ffb703', '#b5179e', '#10b981', '#f43f5e', '#a855f7'];

    // Pie Chart (Total Audiens)
    if (pieInstance) {
      pieInstance.data.labels = campaignNames;
      pieInstance.data.datasets[0].data = campaignAudiences;
      pieInstance.update('none');
    } else if (pieCanvas) {
      pieInstance = new Chart(pieCanvas, {
        type: 'pie',
        data: {
          labels: campaignNames,
          datasets: [{
            data: campaignAudiences,
            backgroundColor: colors.slice(0, campaignNames.length).map(c => c + 'D9'),
            borderColor: '#060A1C',
            borderWidth: 2,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#f8fafc', font: { family: 'Inter' }, usePointStyle: true, boxWidth: 8 } }
          }
        }
      });
    }

    // Doughnut Chart (Frekuensi Tayang/Iklan apa saja yang ada)
    if (doughnutInstance) {
      doughnutInstance.data.labels = campaignNames;
      doughnutInstance.data.datasets[0].data = campaignEvents;
      doughnutInstance.update('none');
    } else if (doughnutCanvas) {
      doughnutInstance = new Chart(doughnutCanvas, {
        type: 'doughnut',
        data: {
          labels: campaignNames,
          datasets: [{
            data: campaignEvents,
            backgroundColor: colors.slice(0, campaignNames.length).map(c => c + 'D9'),
            borderColor: '#060A1C',
            borderWidth: 2,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'right', labels: { color: '#f8fafc', font: { family: 'Inter' }, usePointStyle: true, boxWidth: 8 } }
          }
        }
      });
    }
  };

  onMount(() => {
    const interval = setInterval(fetchData, 1500); // Call fetchData
    onCleanup(() => {
      clearInterval(interval);
      if (chartInstance) chartInstance.destroy();
      if (pieInstance) pieInstance.destroy(); // Cleanup pie chart
      if (doughnutInstance) doughnutInstance.destroy(); // Cleanup doughnut chart
    });
  });

  return (
    <div class="dashboard-container">
      <header>
        <div>
          <h1>Videotron Analytics v2</h1>
          <p style="color: var(--text-secondary); margin-top: 0.5rem;">Multi-Campaign & Timeline Tracking</p>
        </div>
        <div class="header-controls">
          <div class="time-filters">
            <button class={timeScale() === 'day' ? 'active' : ''} onClick={() => { setTimeScale('day'); fetchData(); }}>Hari</button>
            <button class={timeScale() === 'week' ? 'active' : ''} onClick={() => { setTimeScale('week'); fetchData(); }}>Minggu</button>
            <button class={timeScale() === 'month' ? 'active' : ''} onClick={() => { setTimeScale('month'); fetchData(); }}>Bulan</button>
          </div>
          <div class="status-badge" style={!isConnected() ? 'color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);' : ''}>
            {isConnected() ? 'Live Data AI' : 'Terputus...'}
          </div>
        </div>
      </header>

      {stats() ? (
        <Show when={!selectedCampaign()} fallback={
          <div class="detail-view">
            <button class="back-btn" onClick={() => setSelectedCampaign(null)}>← Kembali ke Dashboard Utama</button>
            <div class="glass-card" style="margin-top: 1rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <div style="font-weight: 600; font-size: 1.1rem; color: #fff;">{selectedCampaign()?.name}</div> {/* Changed h2 to div */}
                  <p class="location-tag">📍 {selectedCampaign()?.locations?.length || 0} Lokasi Penayangan</p> {/* Updated location display */}
                </div>
                <div class="status-badge" style="color: var(--accent-cyan); border-color: var(--accent-cyan);">ID: {selectedCampaign()?.id}</div>
              </div>

              <div class="grid-layout" style="margin-top:2rem;">
                <div>
                  <p class="card-title">Estimasi Pencapaian Audiens</p>
                  <h3 class="card-value" style="color: var(--accent-orange);">{selectedCampaign()?.displayAudience.toLocaleString()} <span class="card-unit">Orang</span></h3>
                </div>
                <div>
                  <p class="card-title">Rata-rata Durasi Menonton</p>
                  <h3 class="card-value" style="color: var(--accent-purple);">{(selectedCampaign()?.averageAttentionTime || 0).toFixed(1)} <span class="card-unit">Detik</span></h3>
                </div>
                <div>
                  <p class="card-title">Interaksi Live Terdeteksi</p>
                  <h3 class="card-value" style="color: var(--accent-cyan);">{selectedCampaign()?.totalAudience.toLocaleString()} <span class="card-unit">Orang</span></h3>
                </div>
              </div>

              <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Riwayat Audiens Terdeteksi</h3>
                <div class="table-container" style="max-height: 350px; overflow-y: auto;">
                  <table class="location-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Lokasi Iklan</th>
                        <th>Audiens Terdeteksi</th>
                        <th>Durasi Menonton</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={selectedCampaign()?.audienceLog}>{(log, idx) => (
                        <tr>
                          <td>{idx() + 1}</td>
                          <td>
                            {log.location}
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </td>
                          <td style="color: var(--accent-orange); font-weight: 500;">{log.audienceCount} Orang</td>
                          <td style="color: var(--accent-purple);">{log.attentionTime.toFixed(1)} Detik</td>
                        </tr>
                      )}</For>
                      {(selectedCampaign()?.audienceLog?.length || 0) === 0 && (
                        <tr>
                          <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Belum ada audiens terdeteksi...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        }>
          <>
            <div class="grid-layout">
              <div class="glass-card">
                <div class="card-icon">👥</div>
                <div class="card-title">TOTAL AUDIENS KESELURUHAN</div>
                <div class="card-value" style="color: var(--accent-cyan);">
                  {stats()?.overallAudience.toLocaleString()} <span class="card-unit">Orang</span>
                </div>
              </div>

              <div class="glass-card">
                <div class="card-icon">⏱️</div>
                <div class="card-title">RATA-RATA DURASI MENONTON</div>
                <div class="card-value" style="color: var(--accent-purple);">
                  {(stats()?.overallAttention || 0).toFixed(1)} <span class="card-unit">Detik</span>
                </div>
              </div>

              <div class="glass-card">
                <div class="card-icon">🎬</div>
                <div class="card-title">KAMPANYE AKTIF</div>
                <div class="card-value" style="color: var(--accent-orange);">
                  {stats()?.campaigns.length} <span class="card-unit">Video Iklan</span>
                </div>
              </div>
            </div>

            <div class="insight-highlight">
              <div class="insight-icon">💡</div>
              <div class="insight-text">
                <strong>AI Insights:</strong> {stats()?.insightSummary}
              </div>
            </div>

            <div class="pie-charts-grid" style="margin-bottom: 2rem;">
              <div class="glass-card chart-container" style="height: 300px; box-sizing: border-box; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1rem;">Proporsi Distribusi Aktivitas Iklan</h3>
                <div style="flex: 1; position: relative; min-height: 0; min-width: 0;"><canvas ref={doughnutCanvas}></canvas></div>
              </div>
              <div class="glass-card chart-container" style="height: 300px; box-sizing: border-box; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1rem;">Proporsi Total Audiens</h3>
                <div style="flex: 1; position: relative; min-height: 0; min-width: 0;"><canvas ref={pieCanvas}></canvas></div>
              </div>
            </div>

            <div class="chart-section" style="margin-bottom: 2rem;">
              <div class="glass-card chart-container" style="height: 320px; box-sizing: border-box;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">Tren Audiens ({timeScale() === 'day' ? 'Hari Ini' : (timeScale() === 'week' ? 'Minggu Ini' : 'Bulan Ini')})</h3>
                <div style="height: 250px; position:relative;">
                  <canvas ref={chartCanvas}></canvas>
                </div>
              </div>

              <div class="glass-card" style="height: 320px; box-sizing: border-box; display:flex; flex-direction:column;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">Aktifitas Terkini</h3>
                <div class="activity-feed" style="flex: 1;">
                  <For each={stats()?.recentEvents}>{(event) => (
                    <div class="feed-item">
                      <div style="font-size: 0.8rem; font-family: monospace; color: var(--text-secondary)">
                        {new Date(event.timestamp).toLocaleTimeString()} • {event.location}
                      </div>
                      <div style="font-weight: 600; margin: 0.2rem 0; color: #fff;">{event.campaign_name}</div>
                      <div style="display:flex; justify-content:space-between; font-size: 0.85rem">
                        <span style="color: var(--accent-cyan);">👤 {event.audience.total_count} terdeteksi</span>
                        <span style="color: var(--accent-purple);">⏱️ {event.audience.attention.average_attention_time_seconds.toFixed(1)}s avg</span>
                      </div>
                    </div>
                  )}</For>
                  {stats()?.recentEvents.length === 0 && <span style="color:var(--text-secondary);">Belum ada data...</span>}
                </div>
              </div>
            </div>

            <h3 style="margin-bottom:0.5rem;">Daftar Iklan & Lokasi (Detail)</h3>
            <p style="color:var(--text-secondary); margin-top:0; font-size:0.9rem;">Klik pada kampanye untuk melihat analitik spesifik.</p>
            <div class="campaign-list">
              <For each={stats()?.campaigns}>{(c) => (
                <div class="glass-card campaign-card" onClick={() => setSelectedCampaign(c)}>
                  <div>
                    <h4>{c.name}</h4>
                    <span class="location-tag">📍 {c.locations?.length || 0} Titik Lokasi</span>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: bold; color: var(--accent-color);">{c.displayAudience.toLocaleString()} <span style="font-size:0.8rem; font-weight:normal;">Audiens</span></div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Klik untuk detail →</div>
                  </div>
                </div>
              )}</For>
            </div>
          </>
        </Show>
      ) : (
        <div class="glass-card" style="text-align: center; padding: 4rem;">
          <h2>Menunggu Koneksi...</h2>
          <p style="color: var(--text-secondary);">Menghubungkan ke `simple-backend` dan `sample-ai`...</p>
        </div>
      )}
    </div>
  );
}

export default App;
