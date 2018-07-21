import Dygraph from "../third-party/dygraphs/src/dygraph";
import Crosshair from "../third-party/dygraphs/src/extras/crosshair";
import * as i18n from "./i18n";

export let highlightSeriesOpts = { strokeWidth: 2 };

export function darkenColor(colorStr) {
    let color = Dygraph.toRGB_(colorStr);
    color.r = Math.round(color.r / 2);
    color.g = Math.round(color.g / 2);
    color.b = Math.round(color.b / 2);
    return "rgb(" + color.r + "," + color.g + "," + color.b + ")";
}

export function getTextNodeValue(elem) {
    return elem.childNodes[0].nodeValue;
}

export function offsetToPercentage(g, offsetX, offsetY) {
    // This is calculating the pixel offset of the leftmost date.
    let xOffset = g.toDomCoords(g.xAxisRange()[0], null)[0];
    let yar0 = g.yAxisRange(0);

    // This is calculating the pixel of the higest value. (Top pixel)
    let yOffset = g.toDomCoords(null, yar0[1])[1];

    // x y w and h are relative to the corner of the drawing area,
    // so that the upper corner of the drawing area is (0, 0).
    let x = offsetX - xOffset;
    let y = offsetY - yOffset;

    // This is computing the rightmost pixel, effectively defining the
    // width.
    let w = g.toDomCoords(g.xAxisRange()[1], null)[0] - xOffset;

    // This is computing the lowest pixel, effectively defining the height.
    let h = g.toDomCoords(null, yar0[0])[1] - yOffset;

    // Percentage from the left.
    let xPct = w == 0 ? 0 : x / w;
    // Percentage from the top.
    let yPct = h == 0 ? 0 : y / h;

    // The (1-) part below changes it from "% distance down from the top"
    // to "% distance up from the bottom".
    return [xPct, 1 - yPct];
}

export function zoom(g, zoomInPercentage, xBias, yBias) {
    xBias = xBias || 0.5;
    yBias = yBias || 0.5;
    function adjustAxis(axis, extremes, zoomInPercentage, bias) {
        let delta = axis[1] - axis[0];
        let increment = delta * zoomInPercentage;
        let foo = [increment * bias, increment * (1 - bias)];
        return [Math.max(extremes[0], axis[0] + foo[0]), Math.min(extremes[1], axis[1] - foo[1])];
    }
    let yAxes = g.yAxisRanges();
    let yExtremes = g.yAxisExtremes();
    let newYAxes = [];
    for (let i = 0; i < yAxes.length; i++) {
        newYAxes[i] = adjustAxis(yAxes[i], yExtremes[i], zoomInPercentage, yBias);
    }

    g.updateOptions({
        dateWindow: adjustAxis(g.xAxisRange(), g.xAxisExtremes(), zoomInPercentage, xBias)
        // valueRange: newYAxes[0]
    });
}

export function multiColumnBarPlotter(e) {
    // We need to handle all the series simultaneously.
    if (e.seriesIndex !== 0) return;

    let g = e.dygraph;
    let ctx = e.drawingContext;
    let sets = e.allSeriesPoints;
    if (sets.length === 0) return;
    let y_bottom = e.dygraph.toDomYCoord(0);

    // Find the minimum separation between x-values.
    // This determines the bar width.
    let min_sep = Infinity;
    for (var j = 0; j < sets.length; j++) {
        let points = sets[j];
        for (var i = 1; i < points.length; i++) {
            let sep = points[i].canvasx - points[i - 1].canvasx;
            if (sep < min_sep) min_sep = sep;
        }
    }
    let bar_width = Math.floor((2.0 / 3) * min_sep);

    let fillColors = g.getColors();
    let strokeColors = [];
    for (var i = 0; i < fillColors.length; i++) {
        strokeColors.push(darkenColor(fillColors[i]));
    }

    let max_yvals = new Array(sets[0].length).fill(0);
    for (var i = 0; i < sets.length; ++i) {
        for (var j = 0; j < sets[i].length; ++j) {
            max_yvals[j] = Math.max(max_yvals[j], sets[i][j].yval);
        }
    }

    for (var j = 0; j < sets.length; j++) {
        ctx.fillStyle = fillColors[j];
        ctx.strokeStyle = strokeColors[j];

        let y_height_max = 0;
        for (var i = 0; i < sets[j].length; i++) {
            y_height_max = Math.max(y_height_max, y_bottom - sets[j][i].canvasy);
        }

        for (var i = 0; i < sets[j].length; i++) {
            let p = sets[j][i];
            let center_x = p.canvasx;
            let x_left = center_x - (bar_width / 2) * (1 - j / (sets.length - 1));
            // ctx.fillRect(x_left, p.canvasy, bar_width/sets.length, y_bottom - p.canvasy);
            let y = y_bottom - (p.yval / (max_yvals[i] + 0.1)) * y_bottom;
            ctx.strokeRect(x_left, y, bar_width / sets.length, y_bottom - y);
            ctx.fillRect(x_left, y, bar_width / sets.length, y_bottom - y);
        }
    }
}

export function loadCharts(charts) {
    if (!charts) return null;

    let rounds_count = 0;
    let players_count = 0;
    let values = {};
    let src_datas = {};
    let player_names = [];
    let colors = [];

    let has_data = false;

    for (let chart_name in charts) {
        let var_name = charts[chart_name];

        let src_data = window[var_name];
        if (!src_data || !(src_data.elements instanceof Array)) continue;
        let elements = src_data.elements;
        if (!elements.length) continue;
        if (elements.length > players_count) players_count = elements.length;

        let has_values = false;
        for (let j = 0; j < elements.length; ++j) {
            if (!elements[j].values || !(elements[j].values instanceof Array)) continue;
            if (elements[j].values.length > rounds_count) rounds_count = elements[j].values.length;
            has_values = true;
        }
        if (has_values) {
            values[chart_name] = [];
            src_datas[chart_name] = src_data;
            has_data = true;
        }
    }

    if (rounds_count === 0 || players_count === 0 || !has_data) {
        return null;
    }

    for (let chart_name in charts) {
        if (!(values[chart_name] instanceof Array)) continue;

        let data = values[chart_name];
        let elements = src_datas[chart_name].elements;

        for (let player = 0; player < players_count; ++player) {
            if (!elements[player]) continue;

            if (elements[player].text) {
                player_names[player] = elements[player].text.replace(/^\d+\.\s*/, "");
            }
            if (elements[player].colour) {
                colors[player] = elements[player].colour;
            }
        }

        for (let round = 0; round < rounds_count; ++round) {
            data[round] = [round];
            for (let player = 0; player < players_count; ++player) {
                let val = elements[player].values[round];
                data[round][player + 1] = !val || !val.hasOwnProperty("value") ? val : val.value;
            }
        }
    }

    return {
        rounds_count: rounds_count,
        players_count: players_count,
        values: values,
        player_names: player_names,
        colors: colors,
        heights: Array(players_count).fill(null)
    };
}

function scrollV3(event, g, context) {
    // if (lastClickedGraph != g) {
    //   return;
    // }
    let normal = event.detail ? event.detail * -1 : event.wheelDelta / 40;
    // For me the normalized value shows 0.075 for one click. If I took
    // that verbatim, it would be a 7.5%.
    let percentage = normal / 50;

    let percentages = offsetToPercentage(g, event.offsetX, event.offsetY);
    let xPct = percentages[0];
    let yPct = percentages[1];

    zoom(g, percentage, xPct, yPct);
    event.preventDefault();
    event.stopPropagation();
}

export function createOptionElem(initial_value, option_name, callback) {
    let opt_elem = document.createElement("label");
    opt_elem.className = "button-checkable";
    let input_elem = document.createElement("input");
    input_elem.type = "checkbox";
    input_elem.checked = initial_value;
    let inner_span = document.createElement("span");
    inner_span.innerHTML = i18n.tr("option_text_" + option_name);
    opt_elem.title = i18n.tr("option_title_" + option_name);
    opt_elem.onclick = function(e) {
        e.stopPropagation();
        if (callback) {
            callback(!!input_elem.checked);
        }
    };
    opt_elem.appendChild(input_elem);
    opt_elem.appendChild(inner_span);
    return opt_elem;
}

export function createChart(charts, chart_name, elem, user_opts) {
    user_opts = user_opts || {};

    let chart_options = {};
    for (let k in charts.options[chart_name]) {
        chart_options[k] = charts.options[chart_name][k];
    }

    for (let k in charts.options.global) {
        if (!chart_options.hasOwnProperty(k)) {
            chart_options[k] = charts.options.global[k];
        }
    }

    let labels = ["Round"].concat(charts.player_names);

    let opts = {
        valueFormatter: function(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        logscale: chart_options.logscale ? true : false,
        labelsKMB: true,
        labels: labels,
        width: "100%",
        height: charts.heights[chart_name] ? charts.heights[chart_name] : 150,
        animatedZooms: true,

        legend: "follow",
        // labelsDiv: labelsDiv,
        labelsSeparateLines: false,

        legendFormatter: function(data) {
            if (data.x == null) {
                // This happens when there's no selection and {legend: 'always'} is set.
                return "";
                // return '<br>'
                //        + data.series
                //              .map(function(series) {
                //                  return series.dashHTML + ' ' + series.labelHTML
                //              })
                //              .join('<br>');
            }

            let html = data.xHTML + ": ";
            data.series.forEach(series => {
                if (!series.isVisible) return;
                let style = "color: " + series.color;
                if (series.isHighlighted) {
                    style += "; font-weight: bold";
                }
                html += '<span style="' + style + '">' + series.yHTML + "</span> ";
            });
            // let html = this.getLabels()[0] + ': ' + data.xHTML;
            // data.series.forEach(function(series) {
            //     if (!series.isVisible) return;
            //     let labeledData = series.labelHTML + ': ' + series.yHTML;
            //     if (series.isHighlighted) { labeledData = '<b>' + labeledData + '</b>'; }
            //     html += '<br>' + series.dashHTML + ' ' + labeledData;
            // });
            return html;
        },

        panEdgeFraction: 0.0001,
        xRangePad: 0,
        yRangePad: 0,
        // strokeBorderColor: '#000',
        // strokeBorderWidth: 1,
        strokeWidth: 1,

        ylabel: i18n.tr("chart_title_" + chart_name),

        drawGrid: true,
        gridLineWidth: 0.1,
        digitsAfterDecimal: 0,
        minStep: 1,

        // ticker: function(min, max, pixels, opts, dygraph, vals) {
        //     return [
        //         {}
        //     ];
        // },
        // gridLinePattern: [1, 5],

        axisLineColor: "#fff",

        pixelsPerLabel: 30,
        independentTicks: true,
        colors: charts.colors,
        plugins: [new Crosshair({ direction: "vertical" })],

        highlightSeriesOpts: chart_options.highlight_series ? highlightSeriesOpts : null,
        highlightSeriesBackgroundColor: "rgba(0, 0, 0, 0.2)",
        highlightCircleSize: 0,

        // drawHighlightPointCallback: function(g, name, ctx, canvasx, canvasy, color, radius) {
        //     // var extremes = g.yAxisExtremes();
        //     var x = Math.floor(canvasx + 0.5);
        //     if (prev_x === x) return;

        //     ctx.beginPath();
        //     ctx.strokeStyle = '#AAAAAA';
        //     ctx.lineWidth   = 0.5;
        //     ctx.moveTo(x, 0);
        //     ctx.lineTo(x, g.getOption('height'));
        //     ctx.stroke();

        //     prev_x = x;
        // },

        // xlabel: "round",
        axes: {
            x: {
                valueFormatter: function(x) {
                    return "R" + x;
                }
            }
        },

        interactionModel: {
            mousewheel: scrollV3,

            mousedown: function(event, g, context) {
                context.initializeMouseDown(event, g, context);
                Dygraph.startPan(event, g, context);
            },

            mousemove: function(event, g, context) {
                if (context.isPanning) {
                    Dygraph.movePan(event, g, context);
                } else if (context.isZooming) {
                    Dygraph.moveZoom(event, g, context);
                }
            },

            mouseup: function(event, g, context) {
                if (context.isPanning) {
                    Dygraph.endPan(event, g, context);
                } else if (context.isZooming) {
                    Dygraph.endZoom(event, g, context);
                }
            },

            dblclick: function(event, g, context) {
                let logscale = g.getOption("logscale");
                logscale = !logscale;
                g.updateOptions({ logscale: logscale });

                event.preventDefault();
                event.stopPropagation();
            }
        }
    };

    for (let k in user_opts) {
        if (user_opts.hasOwnProperty(k)) {
            opts[k] = user_opts[k];
        }
    }

    let values = null;
    if (chart_options.hasOwnProperty("accumulative")) {
        values = chart_options.accumulative ? charts.values[chart_name] : charts.per_round_values[chart_name];
    }
    if (!values) {
        values = charts.values[chart_name] ? charts.values[chart_name] : charts.per_round_values[chart_name];
    }

    if (!values) return null;

    let dygraph = new Dygraph(elem, values, opts);

    let opts_elem = document.createElement("div");
    opts_elem.className = "chart-options";

    if (chart_options.hasOwnProperty("logscale")) {
        opts_elem.appendChild(
            createOptionElem(charts.options[chart_name].logscale, "logscale", function(value) {
                charts.options[chart_name].logscale = value;
                dygraph.updateOptions({ logscale: value });
            })
        );
    }

    if (chart_options.hasOwnProperty("accumulative")) {
        opts_elem.appendChild(
            createOptionElem(charts.options[chart_name].accumulative, "accumulative", function(value) {
                charts.options[chart_name].accumulative = value;
                dygraph.updateOptions({
                    file: value ? charts.values[chart_name] : charts.per_round_values[chart_name]
                });
            })
        );
    }

    elem.appendChild(opts_elem);

    return dygraph;
}

export function countPerRoundValues(vals) {
    if (!vals || !vals[0]) return null;
    let result = [vals[0]];
    for (let round_num = 1; round_num < vals.length; ++round_num) {
        result[round_num] = [vals[round_num][0]];
        for (let i = 1; i < vals[round_num].length; ++i) {
            result[round_num][i] = vals[round_num][i] - vals[round_num - 1][i];
        }
    }
    return result;
}

export function countMoney(starting_money, charts) {
    let accumulated_vals = charts.values;
    let per_round_values = charts.per_round_values;

    let income = accumulated_vals.income;
    if (!income) return null;
    let rounds_count = income.length;
    let row_size = income[0].length;

    let prev_row = Array(row_size).fill(starting_money);
    let result = Array(rounds_count);

    for (let round_num = 0; round_num < rounds_count; ++round_num) {
        let row = Array(row_size);
        row[0] = round_num;

        for (let i = 1; i < row_size; ++i) {
            let money_got = income[round_num][i] + Math.abs(per_round_values.sellings[round_num][i]);
            let spent_creeps = per_round_values.spent_creeps ? per_round_values.spent_creeps[round_num][i] : 0;
            let spent_towers = per_round_values.spent_towers ? per_round_values.spent_towers[round_num][i] : 0;
            let money_for_killing = 0;
            for (let k = 1; k < row_size; ++k) {
                if (i !== k && per_round_values.spent_creeps && per_round_values.spent_creeps[round_num][k]) {
                    money_for_killing += per_round_values.income[round_num][k] || 0;
                }
            }
            money_got += money_for_killing;
            let investment = per_round_values.spent_creeps
                ? 0
                : per_round_values.income[round_num + 1]
                    ? per_round_values.income[round_num + 1][i] * 10
                    : 0;
            let money_spent = spent_towers + spent_creeps + investment;
            let new_val = prev_row[i] + money_got - money_spent;
            row[i] = Math.max(new_val, 0);
            // row[i] = new_val;
        }

        result[round_num] = row;
        prev_row = row;
    }
    return result;
}
