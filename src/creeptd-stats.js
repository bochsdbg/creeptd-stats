(function() {

var content_div        = document.getElementById('content');
var stats_div          = content_div.children[content_div.children.length - 1];
var stats_div_children = stats_div.querySelectorAll('h3,script');

var charts        = [];
var current_chart = {};

var darkenColor =
    function(colorStr) {
    // Defined in dygraph-utils.js
    var color = Dygraph.toRGB_(colorStr);
    color.r = Math.round(color.r / 2);
    color.g = Math.round(color.g / 2);
    color.b = Math.round(color.b / 2);
    // color.r   = Math.floor((255 + color.r) / 2);
    // color.g   = Math.floor((255 + color.g) / 2);
    // color.b   = Math.floor((255 + color.b) / 2);
    return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
}


var multiColumnBarPlotter =
    function(e) {
    // We need to handle all the series simultaneously.
    if (e.seriesIndex !== 0) return;

    var g        = e.dygraph;
    var ctx      = e.drawingContext;
    var sets     = e.allSeriesPoints;
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
        for (var j = 0; j < sets[i].length; ++j) { 
            max_yvals[j] = Math.max(max_yvals[j], sets[i][j].yval); 
        }
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

var getTextNodeValue = function(elem) {
    return elem.childNodes[0].nodeValue;
};

for (var i = 0; i < stats_div_children.length; ++i) {
    var elem = stats_div_children[i];
    if (elem.tagName === 'H3') {
        current_chart = {title: getTextNodeValue(elem)};
        charts.push(current_chart);
    } else if (elem.tagName === 'SCRIPT') {
        var script_text = getTextNodeValue(elem);
        var matches     = /"(\w+)"\s*,\s*(\w+)\s*,\s*(\w+)/.exec(script_text);
        if (matches !== null) {
            current_chart.data_var_name = matches[1];
            current_chart.width         = matches[2];
            current_chart.height        = matches[3];
        }
    }
}

var dataFromChart = function(chart) {
    var data     = [];
    var raw_data = chart.elements.map(function(el) {
        return el.values.map(function(x) {
            x = x.hasOwnProperty('value') ? x.value : x;
            return x;
        });
    });

    for (var i = 0; i < raw_data[0].length; i++) {
        var row = [i];
        for (var k = 0; k < raw_data.length; k++) { row.push(raw_data[k][i]); }

        data.push(row);
    }
    return data;
};

function offsetToPercentage(g, offsetX, offsetY) {
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

function onDblClick(event, g, context) {
    var logscale = g.getOption('logscale');
    logscale     = !logscale;
    g.updateOptions({logscale: logscale});

    event.preventDefault();
    event.stopPropagation();
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

var formatValue =
    function(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function zoom(g, zoomInPercentage, xBias, yBias) {
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

var optsFromChart = function(chart) {
    function onMouseDown(event, g, context) {
        context.initializeMouseDown(event, g, context);
        Dygraph.startPan(event, g, context);
    }

    function onMouseMove(event, g, context) {
        if (context.isPanning) {
            Dygraph.movePan(event, g, context);
        } else if (context.isZooming) {
            Dygraph.moveZoom(event, g, context);
        }
    }

    function onMouseUp(event, g, context) {
        if (context.isPanning) {
            Dygraph.endPan(event, g, context);
        } else if (context.isZooming) {
            Dygraph.endZoom(event, g, context);
        }
    }

    var labels = ['Round'];
    for (var i = 0; i < chart.elements.length; ++i) {
        var el = chart.elements[i];
        labels.push(el.text);
    }
    var colors = chart.elements.map(function(x) {
        return x.colour;
    });

    var labelsDiv = document.getElementById('labels');


    var prev_x = -1;

    return {
        valueFormatter: formatValue,

        labelsKMB: true,
        labels: labels,
        // logscale: true,
        animatedZooms: true,

        legend: 'follow',

        // labelsDiv: labelsDiv,
        labelsSeparateLines: true,

        panEdgeFraction: 0.0001,
        xRangePad: 0,
        yRangePad: 0,
        // strokeBorderColor: '#000',
        // strokeBorderWidth: 1,
        strokeWidth: 1,

        drawGrid: true,
        gridLineWidth: 0.1,
        // gridLinePattern: [1, 5],

        axisLineColor: '#fff',

        pixelsPerLabel: 30,
        independentTicks: true,
        colors: colors,

        drawHighlightPointCallback: function(g, name, ctx, canvasx, canvasy, color, radius) {
            // var extremes = g.yAxisExtremes();
            var x = Math.floor(canvasx + 0.5);
            if (prev_x === x) return;

            ctx.beginPath();
            ctx.strokeStyle = '#AAAAAA';
            ctx.lineWidth   = 0.5;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, g.getOption('height'));
            ctx.stroke();

            prev_x = x;
        },

        // xlabel: "round",
        axes: {
            x: {
                valueFormatter: function(x) {
                    return 'Round ' + x;
                }
            }
        },

        // annotationMouseOverHandler: function(ann, point, dg, event) {
        // ann.div.innerHTML = ann.text;
        // ann.div.style.display = 'block';
        // alert(ann.text);
        // },

        // annotationMouseOutHandler: function(ann, point, dg, event) {
        // ann.div.innerHTML = '';
        // ann.div.style.display = null;
        // },

        interactionModel: {
            mousewheel: scrollV3,
            mousedown: onMouseDown,
            mousemove: onMouseMove,
            mouseup: onMouseUp,
            dblclick: onDblClick,
        }
    };
};

var addChart = function(parentElem, chart) {
    var div_elem       = document.createElement('div');
    div_elem.className = 'chart-wrapper';
    parentElem.appendChild(div_elem);

    var chart_data = window[chart.data_var_name];
    var data       = dataFromChart(chart_data);
    var opts       = optsFromChart(chart_data);

    opts.ylabel  = chart.title;
    opts.width  = '100%';
    opts.height = chart.height;

    var g = new Dygraph(div_elem, data, opts);
    g.ready(function() {
        var series      = g.getLabels();
        var annotations = [];

        for (var i = 0; i < chart_data.elements.length; ++i) {
            for (var j = 0; j < chart_data.elements[i].values.length; ++j) {
                var tip = chart_data.elements[i].values[j].tip;
                if (!tip) continue;
                var matches = /(\d+)\)$/.exec(tip);
                tip         = tip.replace('#val#', series[i + 1]);
                // annotations.push({series: series[i+1], x: j, shortText: matches[1], text: tip});
                annotations.push({series: series[i + 1], x: j, text: tip, width: 3, height: 3, tickHeight: 0, tickWidth: 0});
            }
        }

        g.setAnnotations(annotations);
    });

    return g;
};

stats_div.innerHTML = '<p class="stat-info">Mouse whell on charts for zoomming, click and drag for panning, double click for toggling logarithmic scale</p>';

window.addEventListener('load', function() {
    var game_stats_div = document.querySelectorAll('.cbox50')[1];
    if (game_stats_div != null) {
        var script_elem = game_stats_div.querySelector('script');
        var script_text = getTextNodeValue(script_elem);
        var matches     = /\(\s*"(\w+)/.exec(script_text);
        var chart_data  = window[matches[1]];

        var columns = [];
        chart_data.elements.map(function(x, i) {
            columns[i] = x.text;
        });

        var values = chart_data.elements.map(function(x, i) {
            var vals = x.values;
            vals.unshift(i);
            return vals;
        });

        game_stats_div.innerHTML = '';

        var opts     = optsFromChart(chart_data);
        opts.plotter = multiColumnBarPlotter;
        opts.width   = '100%';
        opts.height  = 120;
        opts.labels  = chart_data.x_axis.labels.labels.map(function(x) {
            return x.text;
        });
        opts.labels.unshift('Num');
        opts.colors         = chart_data.x_axis.labels.labels.map(function(x) {
            return x.colour;
        });
        opts.pixelsPerLabel = 90;
        opts.xRangePad      = 100;
        opts.yRangePad      = 0;
        opts.drawGrid       = false;

        opts.axes = {
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

        new Dygraph(game_stats_div, values, opts);
    }


    var gs   = charts.map(function(chart) {
        return addChart(stats_div, chart);
    });
    var sync = Dygraph.synchronize(gs, {selection: true, zoom: true, range: false});
    // for (var i = 0; i < charts.length; ++i) { ; }
}, false);
})();
