import synchronize from '../third-party/dygraphs/src/extras/synchronizer';
import * as utils from './utils';
import * as i18n from './i18n';

let stats_div   = document.querySelectorAll('.cboxfull.boldbox')[1];
let charts      = utils.loadCharts({
    lives: 'chart2',
    actions: 'chart7',
    kills: 'chart8',
    income: 'chart3',
    spent_creeps: 'chart4',
    spent_towers: 'chart5',
    sellings: 'chart6',
});
let chart_order = ['lives', 'actions', 'kills', 'income', 'spent_creeps', 'spent_towers', 'sellings'];

if (charts && stats_div) {
    charts.heights = {
        lives: 100,
        actions: 100,
        kills: 100,
    };

    stats_div.innerHTML =
        '<p class="stat-info">Mouse whell on charts for zoomming, click and drag for panning, double click for toggling logarithmic scale</p>';
    let gs = chart_order.map(function(chart_name) {
        let div = document.createElement('div');
        div.className = 'chart-wrapper';
        stats_div.appendChild(div);
        return utils.createChart(charts, chart_name, div);
    });
    synchronize(gs, {selection: true, zoom: true, range: false});

    let summary_charts = utils.loadCharts({summary: 'chart1'});
    let summary_div = document.querySelectorAll('.cbox50')[1];

    if (summary_div && summary_charts) {
        summary_charts.colors = charts.colors;
        summary_charts.values = {summary: window.chart1.elements.map((x, i) => [i].concat(x.values))};
        let columns = window.chart1.elements.map((x) => x.text);

        utils.createChart(summary_charts, 'summary', summary_div, {
            pixelsPerLabel: 90,
            xRangePad: 100,
            yRangePad: 0,
            ylabel: null,
            drawGrid: false,
            plotter: utils.multiColumnBarPlotter,
            labels: [''].concat(window.chart1.x_axis.labels.labels.map((x) => x.text)),

            axes: {
                y: {
                    drawAxis: false,
                },

                x: {
                    axisLabelWidth: 120,
                    axisLabelFormatter: function(i) {
                        return columns[i];
                    },
                    valueFormatter: function(i) {
                        return columns[i];
                    },
                }
            }
        });
    }
}
