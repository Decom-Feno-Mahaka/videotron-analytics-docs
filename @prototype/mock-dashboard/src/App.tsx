import { createSignal, onCleanup, onMount, For, Show } from 'solid-js';
import Chart from 'chart.js/auto';
import './index.css';

type Campaign = {
  id: string;
  name: string;
  location: string;
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
  campaigns: Campaign[];
  chartData: { label: string; value: number }[];
  recentEvents: EventPayload[];
};

function App() {
  const [stats, setStats] = createSignal<StatsResponse | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);
  const [timeScale, setTimeScale] = createSignal('day');
  const [selectedCampaign, setSelectedCampaign] = createSignal<Campaign | null>(null);

  let chartCanvas: HTMLCanvasElement | undefined;
  let chartInstance: Chart | null = null;

  const fetchStats = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/stats?timeScale=${timeScale()}`);
      if (res.ok) {
        const data: StatsResponse = await res.json();
        setStats(data);
        setIsConnected(true);
        updateChart(data.chartData);
        
        // If a campaign is currently selected, update its reference to latest data
        if (selectedCampaign()) {
           const updated = data.campaigns.find(c => c.id === selectedCampaign()?.id);
           if (updated) setSelectedCampaign(updated);
        }
      } else { setIsConnected(false); }
    } catch { setIsConnected(false); }
  };

  const updateChart = (data: {label: string, value: number}[]) => {
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
      chartInstance = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Tren Audiens',
            data: values,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderWidth: 2,
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
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aabf' } },
            x: { grid: { display: false }, ticks: { color: '#a0aabf' } }
          }
        }
      });
    }
  };

  onMount(() => {
    const interval = setInterval(fetchStats, 1500);
    onCleanup(() => {
        clearInterval(interval);
        if (chartInstance) chartInstance.destroy();
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
              <button class={timeScale() === 'day' ? 'active' : ''} onClick={() => {setTimeScale('day'); fetchStats();}}>Hari</button>
              <button class={timeScale() === 'week' ? 'active' : ''} onClick={() => {setTimeScale('week'); fetchStats();}}>Minggu</button>
              <button class={timeScale() === 'month' ? 'active' : ''} onClick={() => {setTimeScale('month'); fetchStats();}}>Bulan</button>
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
                            <h2 style="margin-top:0; font-size:2rem;">{selectedCampaign()?.name}</h2>
                            <p class="location-tag">📍 {selectedCampaign()?.location}</p>
                        </div>
                        <div class="status-badge" style="color: #6366f1; border-color: var(--accent-color);">ID: {selectedCampaign()?.id}</div>
                    </div>

                    <div class="grid-layout" style="margin-top:2rem;">
                        <div>
                            <p class="card-title">Estimasi Pencapaian Audiens</p>
                            <h3 class="card-value">{selectedCampaign()?.displayAudience.toLocaleString()} <span class="card-unit">Orang</span></h3>
                        </div>
                        <div>
                            <p class="card-title">Rata-rata Perhatian</p>
                            <h3 class="card-value">{selectedCampaign()?.averageAttentionTime.toFixed(1)} <span class="card-unit">Detik</span></h3>
                        </div>
                        <div>
                            <p class="card-title">Interaksi Live Terdeteksi</p>
                            <h3 class="card-value">{selectedCampaign()?.totalAudience.toLocaleString()} <span class="card-unit">Orang</span></h3>
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
                  <div class="card-value">
                    {stats()?.overallAudience.toLocaleString()} <span class="card-unit">Orang</span>
                  </div>
                </div>
                
                <div class="glass-card">
                  <div class="card-icon">⏱️</div>
                  <div class="card-title">Rata-rata Waktu Perhatian</div>
                  <div class="card-value">
                    {stats()?.overallAttention.toFixed(1)} <span class="card-unit">Detik</span>
                  </div>
                </div>

                <div class="glass-card">
                  <div class="card-icon">🎬</div>
                  <div class="card-title">Kampanye Aktif</div>
                  <div class="card-value">
                    {stats()?.campaigns.length} <span class="card-unit">Video Iklan</span>
                  </div>
                </div>
              </div>

              <div class="chart-section" style="margin-bottom: 2rem;">
                <div class="glass-card chart-container" style="height: 320px; box-sizing: border-box;">
                  <h3 style="margin-top: 0; margin-bottom: 1rem;">Tren Audiens ({timeScale() === 'day' ? 'Hari Ini' : (timeScale() === 'week' ? 'Minggu Ini' : 'Bulan Ini')})</h3>
                  <div style="height: 230px; position:relative;">
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
                        <div style="font-weight: 600; margin: 0.2rem 0;">{event.campaign_name}</div>
                        <div style="display:flex; justify-content:space-between; font-size: 0.85rem">
                          <span>👤 {event.audience.total_count} terdeteksi</span>
                          <span style="color: var(--accent-color)">⏱️ {event.audience.attention.average_attention_time_seconds.toFixed(1)}s avg</span>
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
                             <span class="location-tag">📍 {c.location}</span>
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
