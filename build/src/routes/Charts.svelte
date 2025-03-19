<script lang="ts">
  import { onMount } from 'svelte';
  
  // Sample chart data and configuration
  let chartData = {
    barChart: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Data Transfer',
          data: [65, 59, 80, 81, 56, 55],
          backgroundColor: '#40babd'
        }
      ]
    },
    lineChart: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Network Latency',
          data: [28, 48, 40, 19, 86, 27],
          borderColor: '#5cb85c',
          backgroundColor: 'rgba(92, 184, 92, 0.1)'
        }
      ]
    },
    pieChart: {
      labels: ['Network', 'Storage', 'Compute', 'Encryption'],
      datasets: [
        {
          data: [30, 25, 25, 20],
          backgroundColor: ['#40babd', '#5cb85c', '#f0ad4e', '#5bc0de']
        }
      ]
    }
  };
  
  onMount(() => {
    // In a real implementation, we would initialize charts using a library like Chart.js
    console.log('Charts component mounted. Would initialize charts here.');
  });
</script>

<div class="charts-wrapper">
  <div class="container">
    <div class="charts-header">
      <h1 class="charts-heading">Charts</h1>
      <div class="charts-intro">
        <p>Kagi provides powerful data visualization capabilities through integration with popular charting libraries. Below are some examples of charts you can create with Kagi.</p>
      </div>
    </div>
    
    <div class="charts-content">
      <div class="chart-section">
        <h2 id="bar-charts">Bar Charts</h2>
        <p>Bar charts are useful for comparing multiple data points across categories.</p>
        <div class="chart-example">
          <div class="chart-container">
            <!-- This would be a real chart in production -->
            <div class="placeholder-chart">
              <div class="chart-title">Monthly Data Transfer</div>
              <div class="bars">
                {#each chartData.barChart.labels as label, i}
                  <div class="bar-group">
                    <div class="bar" style="height: {chartData.barChart.datasets[0].data[i] * 0.8}px"></div>
                    <div class="bar-label">{label}</div>
                  </div>
                {/each}
              </div>
              <div class="chart-caption">Example Bar Chart (simulated)</div>
            </div>
          </div>
          <div class="chart-code">
            <pre><code class="language-javascript">{`// Creating a bar chart with Kagi and Chart.js
const chart = new Kagi.Chart('barChart', {
  type: 'bar',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Data Transfer',
      data: [65, 59, 80, 81, 56, 55],
      backgroundColor: '#40babd'
    }]
  }
});`}</code></pre>
          </div>
        </div>
      </div>
      
      <div class="chart-section">
        <h2 id="line-charts">Line Charts</h2>
        <p>Line charts are perfect for showing trends over time or continuous data.</p>
        <div class="chart-example">
          <div class="chart-container">
            <!-- This would be a real chart in production -->
            <div class="placeholder-chart">
              <div class="chart-title">Network Latency Over Time</div>
              <div class="line-chart">
                <svg viewBox="0 0 300 150">
                  <polyline
                    points="
                      0,{150 - chartData.lineChart.datasets[0].data[0] * 1.5}
                      60,{150 - chartData.lineChart.datasets[0].data[1] * 1.5}
                      120,{150 - chartData.lineChart.datasets[0].data[2] * 1.5}
                      180,{150 - chartData.lineChart.datasets[0].data[3] * 1.5}
                      240,{150 - chartData.lineChart.datasets[0].data[4] * 1.5}
                      300,{150 - chartData.lineChart.datasets[0].data[5] * 1.5}
                    "
                    stroke="#5cb85c"
                    fill="none"
                    stroke-width="2"
                  />
                </svg>
                <div class="line-labels">
                  {#each chartData.lineChart.labels as label}
                    <span>{label}</span>
                  {/each}
                </div>
              </div>
              <div class="chart-caption">Example Line Chart (simulated)</div>
            </div>
          </div>
          <div class="chart-code">
            <pre><code class="language-javascript">{`// Creating a line chart with Kagi and Chart.js
const chart = new Kagi.Chart('lineChart', {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Network Latency',
      data: [28, 48, 40, 19, 86, 27],
      borderColor: '#5cb85c',
      backgroundColor: 'rgba(92, 184, 92, 0.1)'
    }]
  }
});`}</code></pre>
          </div>
        </div>
      </div>
      
      <div class="chart-section">
        <h2 id="pie-charts">Pie Charts</h2>
        <p>Pie charts are effective for showing proportional data and parts of a whole.</p>
        <div class="chart-example">
          <div class="chart-container">
            <!-- This would be a real chart in production -->
            <div class="placeholder-chart">
              <div class="chart-title">Resource Allocation</div>
              <div class="pie-chart">
                <div class="pie-segments">
                  <div class="pie-segment" style="--percentage: 30; --color: #40babd; --offset: 0;"></div>
                  <div class="pie-segment" style="--percentage: 25; --color: #5cb85c; --offset: 30;"></div>
                  <div class="pie-segment" style="--percentage: 25; --color: #f0ad4e; --offset: 55;"></div>
                  <div class="pie-segment" style="--percentage: 20; --color: #5bc0de; --offset: 80;"></div>
                </div>
                <div class="pie-legend">
                  {#each chartData.pieChart.labels as label, i}
                    <div class="legend-item">
                      <span class="legend-color" style="background-color: {chartData.pieChart.datasets[0].backgroundColor[i]};"></span>
                      <span class="legend-label">{label} ({chartData.pieChart.datasets[0].data[i]}%)</span>
                    </div>
                  {/each}
                </div>
              </div>
              <div class="chart-caption">Example Pie Chart (simulated)</div>
            </div>
          </div>
          <div class="chart-code">
            <pre><code class="language-javascript">{`// Creating a pie chart with Kagi and Chart.js
const chart = new Kagi.Chart('pieChart', {
  type: 'pie',
  data: {
    labels: ['Network', 'Storage', 'Compute', 'Encryption'],
    datasets: [{
      data: [30, 25, 25, 20],
      backgroundColor: ['#40babd', '#5cb85c', '#f0ad4e', '#5bc0de']
    }]
  }
});`}</code></pre>
          </div>
        </div>
      </div>
      
      <div class="charts-integration">
        <h2 id="integration">Integration</h2>
        <p>Kagi makes it easy to integrate with popular charting libraries like Chart.js, D3.js, and more. Install the Kagi Charts plugin to get started:</p>
        <div class="integration-code">
          <pre><code class="language-bash">{`npm install kagi-charts`}</code></pre>
        </div>
        <p>Then import it into your application:</p>
        <div class="integration-code">
          <pre><code class="language-javascript">{`import { KagiCharts } from 'kagi-charts';

// Initialize charts
const charts = new KagiCharts({
  engine: 'chartjs', // or 'd3', 'highcharts', etc.
  theme: 'light'
});`}</code></pre>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .charts-wrapper {
    padding: 45px 0;
  }
  
  .charts-header {
    margin-bottom: 40px;
    text-align: center;
  }
  
  .charts-heading {
    font-size: 2rem;
    margin-bottom: 15px;
    font-weight: bold;
  }
  
  .charts-intro {
    max-width: 800px;
    margin: 0 auto 40px;
  }
  
  .chart-section {
    margin-bottom: 60px;
  }
  
  .chart-section h2 {
    color: #40babd;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
  
  .chart-example {
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    margin-top: 20px;
  }
  
  .chart-container, .chart-code {
    flex: 1;
    min-width: 300px;
  }
  
  .chart-code pre {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 4px;
    overflow-x: auto;
  }
  
  .placeholder-chart {
    background: #fff;
    border: 1px solid #e3e3e3;
    border-radius: 4px;
    padding: 20px;
    height: 300px;
    display: flex;
    flex-direction: column;
  }
  
  .chart-title {
    font-weight: bold;
    text-align: center;
    margin-bottom: 15px;
  }
  
  .chart-caption {
    text-align: center;
    font-style: italic;
    color: #777;
    margin-top: auto;
  }
  
  /* Bar chart styles */
  .bars {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    height: 200px;
  }
  
  .bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .bar {
    width: 30px;
    background-color: #40babd;
    margin: 0 5px;
    transition: height 0.3s ease;
  }
  
  .bar-label {
    margin-top: 10px;
  }
  
  /* Line chart styles */
  .line-chart {
    height: 200px;
    display: flex;
    flex-direction: column;
  }
  
  .line-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
  }
  
  /* Pie chart styles */
  .pie-chart {
    height: 200px;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
  
  .pie-segments {
    width: 150px;
    height: 150px;
    position: relative;
    border-radius: 50%;
    overflow: hidden;
  }
  
  .pie-segment {
    position: absolute;
    width: 100%;
    height: 100%;
    transform: rotate(calc(3.6deg * var(--offset)));
    clip-path: polygon(50% 50%, 50% 0%, calc(50% + 50% * var(--cosine)) calc(50% - 50% * var(--sine)));
    background-color: var(--color);
  }
  
  .pie-segment::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
    background-color: var(--color);
    transform: rotate(calc(3.6deg * var(--percentage)));
  }
  
  .pie-legend {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .legend-color {
    width: 15px;
    height: 15px;
    display: inline-block;
    border-radius: 3px;
  }
  
  .integration-code {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 4px;
    margin: 15px 0;
    overflow-x: auto;
  }
</style> 