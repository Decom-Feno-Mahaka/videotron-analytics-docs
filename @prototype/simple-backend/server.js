const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory stats
let campaigns = {};
let recentEvents = [];
const MAX_EVENTS = 50;

function initCampaign(id, name, location) {
    if (!campaigns[id]) {
        campaigns[id] = {
            id, name, location,
            totalAudience: 0,
            averageAttentionTime: 0,
            eventsCount: 0
        };
    }
}

app.post('/api/events', (req, res) => {
    const event = req.body;
    if (!event || !event.campaign_id) return res.status(400).json({error:'Invalid'});
    
    initCampaign(event.campaign_id, event.campaign_name, event.location);
    const c = campaigns[event.campaign_id];
    const a = event.audience;
    
    c.totalAudience += a.total_count;
    c.eventsCount++;
    const newAtt = a.attention.average_attention_time_seconds;
    c.averageAttentionTime = c.averageAttentionTime === 0 ? newAtt : (c.averageAttentionTime * 0.9) + (newAtt * 0.1);
    
    recentEvents.unshift(event);
    if (recentEvents.length > MAX_EVENTS) recentEvents.pop();

    res.status(200).json({status: 'ok'});
});

// To simulate timescales, we'll generate some static history charts data on the fly based on the timescale
app.get('/api/stats', (req, res) => {
    const scale = req.query.timeScale || 'day'; // day, week, month
    let multiplier = scale === 'month' ? 30 : (scale === 'week' ? 7 : 1);
    
    // Create chart data: array of objects { label, value } for line chart
    const labels = scale === 'day' ? ['08:00', '12:00', '16:00', '20:00'] :
                   (scale === 'week' ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] :
                   ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4']);
    
    const chartData = labels.map((l, idx) => ({
        label: l,
        // Make the line chart curve nicely
        value: Math.floor(Math.sin(idx) * 100 * multiplier + 300 * multiplier + Math.random() * 50 * multiplier)
    }));

    // Generate campaigns list
    const campaignsList = Object.values(campaigns).map(c => ({
        ...c,
        // Scale the numbers purely for visual mock effect
        displayAudience: c.totalAudience + (multiplier > 1 ? Math.floor(c.totalAudience * multiplier * (Math.random() + 0.5)) : 0)
    }));
    
    // Overall Stats
    const totalAudience = Object.values(campaigns).reduce((acc, c) => acc + c.totalAudience, 0);
    const overallAudience = totalAudience + (multiplier > 1 ? Math.floor(totalAudience * multiplier) : 0);
    
    // Average overall Attention Time
    const activeCampaigns = Object.values(campaigns).filter(c => c.eventsCount > 0);
    let overallAttention = 0;
    if (activeCampaigns.length > 0) {
        overallAttention = activeCampaigns.reduce((acc, c) => acc + c.averageAttentionTime, 0) / activeCampaigns.length;
    }

    res.json({
        scale,
        overallAudience,
        overallAttention,
        campaigns: campaignsList,
        chartData,
        recentEvents: recentEvents.slice(0, 10)
    });
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
