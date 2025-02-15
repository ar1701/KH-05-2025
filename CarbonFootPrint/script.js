let wasteList = [];
let chart = null;

const carbonFactors = {
    paper: 0.9,
    wood: 0.6,
    plastic: 2.5,
    fabric: 1.1,
    food: 1.8,
    expired: 2.0
};

const ecoTips = {
    paper: "Tip: Recycling paper can save up to 17 trees per ton!",
    wood: "Tip: Consider upcycling wood waste into furniture or art pieces.",
    plastic: "Tip: Reduce plastic waste by using reusable containers.",
    fabric: "Tip: Donate usable fabric items to local charities.",
    food: "Tip: Start composting to reduce food waste emissions.",
    expired: "Tip: Plan your purchases to minimize expired food waste."
};

function calculateCarbon() {
    const wasteType = document.getElementById('waste-type').value;
    const weight = parseFloat(document.getElementById('weight').value);

    if (!wasteType || !weight) {
        alert('Please fill in all fields');
        return;
    }

    const carbonFootprint = weight * carbonFactors[wasteType];
    document.getElementById('carbon-value').textContent = `Carbon Footprint: ${carbonFootprint.toFixed(2)} kg CO₂e`;
    document.getElementById('comparison').textContent = `Equivalent to driving ${(carbonFootprint * 4).toFixed(1)} km in an average car`;
    document.getElementById('eco-tip').textContent = ecoTips[wasteType];

    document.getElementById('result').classList.add('show');

    wasteList.push({ type: wasteType, weight: weight, carbon: carbonFootprint });
    updateChart();
}

function updateChart() {
    const ctx = document.getElementById('emissions-chart');

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: wasteList.map(waste => waste.type),
            datasets: [{
                label: 'Carbon Emissions (kg CO₂e)',
                data: wasteList.map(waste => waste.carbon),
                backgroundColor: '#4CAF50'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Set a random eco tip on page load
document.getElementById('eco-tip').textContent = ecoTips[Object.keys(ecoTips)[Math.floor(Math.random() * Object.keys(ecoTips).length)]];
