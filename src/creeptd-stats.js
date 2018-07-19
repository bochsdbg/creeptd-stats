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
let chart_order = ['lives', 'actions', 'kills', 'income', 'spent_creeps', 'spent_towers', 'sellings', 'money'];
let options = {
    accumulative: true,
    logscale: false,
};

if (charts && stats_div) {
    charts.heights = {
        lives: 100,
        actions: 100,
        kills: 100,
    };

    charts.per_round_values = {
        income: utils.countPerRoundValues(charts.values.income),
        spent_creeps: utils.countPerRoundValues(charts.values.spent_creeps),
        spent_towers: utils.countPerRoundValues(charts.values.spent_towers),
        sellings: utils.countPerRoundValues(charts.values.sellings),
    };

    charts.values.money = utils.countMoney(200, charts);

    // charts.values.spent_creeps = per_round_values.spent_creeps;
    // charts.values.spent_towers = per_round_values.spent_towers;
    // charts.values.sellings = per_round_values.sellings;

    stats_div.innerHTML =
        '<p class="stat-info">Mouse wheel on charts for zooming, click and drag for panning, double click for toggling logarithmic scale</p>';
    let gs = chart_order.map(function(chart_name) {
        let div = document.createElement('div');
        div.className = 'chart-wrapper';
        stats_div.appendChild(div);
        return utils.createChart(charts, chart_name, div);
    });
    gs = gs.filter((x) => x != null);
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
