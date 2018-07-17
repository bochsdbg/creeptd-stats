import Dygraph from '../third-party/dygraphs/src/dygraph';
import Crosshair from '../third-party/dygraphs/src/extras/crosshair';
import * as i18n from './i18n';

export function darkenColor(colorStr) {
    let color = Dygraph.toRGB_(colorStr);
    color.r   = Math.round(color.r / 2);
    color.g   = Math.round(color.g / 2);
    color.b   = Math.round(color.b / 2);
    return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
}

export function getTextNodeValue(elem) {
    return elem.childNodes[0].nodeValue;
}

export function offsetToPercentage(g, offsetX, offsetY) {
    // This is calculating the pixel offset of the leftmost date.
    var xOffset = g.toDomCoords(g.xAxisRange()[0], null)[0];
    var yar0    = g.yAxisRange(0);

    // This is calculating the pixel of the higest value. (Top pixel)
    var yOffset = g.toDomCoords(null, yar0[1])[1];

    // x y w and h are relative to the corner of the drawing area,
    // so that the upper corner of the drawing area is (0, 0).
    var x = offsetX - xOffset;
    var y = offsetY - yOffset;

    // This is computing the rightmost pixel, effectively defining the
    // width.
    var w = g.toDomCoords(g.xAxisRange()[1], null)[0] - xOffset;

    // This is computing the lowest pixel, effectively defining the height.
    var h = g.toDomCoords(null, yar0[0])[1] - yOffset;

    // Percentage from the left.
    var xPct = w == 0 ? 0 : (x / w);
    // Percentage from the top.
    var yPct = h == 0 ? 0 : (y / h);

    // The (1-) part below changes it from "% distance down from the top"
    // to "% distance up from the bottom".
    return [xPct, (1 - yPct)];
}

export function zoom(g, zoomInPercentage, xBias, yBias) {
    xBias = xBias || 0.5;
    yBias = yBias || 0.5;
    function adjustAxis(axis, extremes, zoomInPercentage, bias) {
        var delta     = axis[1] - axis[0];
        var increment = delta * zoomInPercentage;
        var foo       = [increment * bias, increment * (1 - bias)];
        return [Math.max(extremes[0], axis[0] + foo[0]), Math.min(extremes[1], axis[1] - foo[1])];
    }
    var yAxes     = g.yAxisRanges();
    var yExtremes = g.yAxisExtremes();
    var newYAxes  = [];
    for (var i = 0; i < yAxes.length; i++) { newYAxes[i] = adjustAxis(yAxes[i], yExtremes[i], zoomInPercentage, yBias); }

    g.updateOptions({
        dateWindow: adjustAxis(g.xAxisRange(), g.xAxisExtremes(), zoomInPercentage, xBias),
        // valueRange: newYAxes[0]
    });
}

export function multiColumnBarPlotter(e) {
    // We need to handle all the series simultaneously.
    if (e.seriesIndex !== 0) return;

    var g    = e.dygraph;
    var ctx  = e.drawingContext;
    var sets = e.allSeriesPoints;
    if (sets.length === 0) return;
    var y_bottom = e.dygraph.toDomYCoord(0);

    // Find the minimum separation between x-values.
    // This determines the bar width.
    var min_sep = Infinity;
    for (var j = 0; j < sets.length; j++) {
        var points = sets[j];
        for (var i = 1; i < points.length; i++) {
            var sep = points[i].canvasx - points[i - 1].canvasx;
            if (sep < min_sep) min_sep = sep;
        }
    }
    var bar_width = Math.floor(2.0 / 3 * min_sep);

    var fillColors   = g.getColors();
    var strokeColors = [];
    for (var i = 0; i < fillColors.length; i++) { strokeColors.push(darkenColor(fillColors[i])); }

    var max_yvals = new Array(sets[0].length).fill(0);
    for (var i = 0; i < sets.length; ++i) {
        for (var j = 0; j < sets[i].length; ++j) { max_yvals[j] = Math.max(max_yvals[j], sets[i][j].yval); }
    }

    for (var j = 0; j < sets.length; j++) {
        ctx.fillStyle   = fillColors[j];
        ctx.strokeStyle = strokeColors[j];

        var y_height_max = 0;
        for (var i = 0; i < sets[j].length; i++) { y_height_max = Math.max(y_height_max, y_bottom - sets[j][i].canvasy); }

        for (var i = 0; i < sets[j].length; i++) {
            var p        = sets[j][i];
            var center_x = p.canvasx;
            var x_left   = center_x - (bar_width / 2) * (1 - j / (sets.length - 1));
            // ctx.fillRect(x_left, p.canvasy, bar_width/sets.length, y_bottom - p.canvasy);
            var y = y_bottom - (p.yval / (max_yvals[i] + 0.1)) * y_bottom;
            ctx.strokeRect(x_left, y, bar_width / sets.length, y_bottom - y);
            ctx.fillRect(x_left, y, bar_width / sets.length, y_bottom - y);
        }
    }
}

export function loadCharts(charts) {
    if (!charts) return null;

    let rounds_count = 0, players_count = 0;
    let values = {}, src_datas = {}, player_names = [], colors = [];

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
            values[chart_name]    = [];
            src_datas[chart_name] = src_data;
            has_data              = true;
        }
    }

    if (rounds_count === 0 || players_count === 0 || !has_data) { return null; }

    for (let chart_name in charts) {
        if (!(values[chart_name] instanceof Array)) continue;

        let data     = values[chart_name];
        let elements = src_datas[chart_name].elements;

        for (let player = 0; player < players_count; ++player) {
            if (!elements[player]) continue;

            if (elements[player].text) { player_names[player] = elements[player].text.replace(/^\d+\.\s*/, ''); }
            if (elements[player].colour) { colors[player] = elements[player].colour; }
        }

        for (let round = 0; round < rounds_count; ++round) {
            data[round] = [round];
            for (let player = 0; player < players_count; ++player) {
                let val                 = elements[player].values[round];
                data[round][player + 1] = !val || !val.hasOwnProperty('value') ? val : val.value;
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
    var normal = event.detail ? event.detail * -1 : event.wheelDelta / 40;
    // For me the normalized value shows 0.075 for one click. If I took
    // that verbatim, it would be a 7.5%.
    var percentage = normal / 50;

    var percentages = offsetToPercentage(g, event.offsetX, event.offsetY);
    var xPct        = percentages[0];
    var yPct        = percentages[1];

    zoom(g, percentage, xPct, yPct);
    event.preventDefault();
    event.stopPropagation();
}

export function createChart(charts, chart_name, elem, user_opts) {
    user_opts = user_opts || {};

    let labels = ['Round'].concat(charts.player_names);
    let prev_x = -1;

    let opts = {
        valueFormatter: function(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        labelsKMB: true,
        labels: labels,
        width: '100%',
        height: charts.heights[chart_name] ? charts.heights[chart_name] : 150,
        // logscale: true,
        animatedZooms: true,

        legend: 'follow',
        // labelsDiv: labelsDiv,
        labelsSeparateLines: false,

        legendFormatter: function(data) {
            if (data.x == null) {
                // This happens when there's no selection and {legend: 'always'} is set.
                return '';
                // return '<br>'
                //        + data.series
                //              .map(function(series) {
                //                  return series.dashHTML + ' ' + series.labelHTML
                //              })
                //              .join('<br>');
            }

            let html = data.xHTML + ': ';
            data.series.forEach((series) => {
                if (!series.isVisible) return;
                let style = 'color: ' + series.color;
                if (series.isHighlighted) {
                    style += '; font-weight: bold';
                }
                html += '<span style="' + style + '">' + series.yHTML + '</span> ';
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

        ylabel: i18n.tr('chart_title_' + chart_name),

        drawGrid: true,
        gridLineWidth: 0.1,
        // gridLinePattern: [1, 5],

        axisLineColor: '#fff',

        pixelsPerLabel: 30,
        independentTicks: true,
        colors: charts.colors,
        plugins: [
            new Crosshair({direction: "vertical"})
        ],

        highlightSeriesOpts: { strokeWidth: 2 },
        highlightSeriesBackgroundColor: 'rgba(0, 0, 0, 0.2)',
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
                    return 'R' + x;
                }
            },
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
                var logscale = g.getOption('logscale');
                logscale     = !logscale;
                g.updateOptions({logscale: logscale});

                event.preventDefault();
                event.stopPropagation();
            },
        }
    };

    for (let k in user_opts) {
        if (user_opts.hasOwnProperty(k)) { opts[k] = user_opts[k]; }
    }

    return new Dygraph(elem, charts.values[chart_name], opts);
}