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

        for (var i = 0; i < sets[j].length; i++) {
            let p = sets[j][i];
            let center_x = p.canvasx;
            let x_left = center_x - bar_width * (0.5 - j / sets.length);
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
    let annotations = [];
    let annotations_loaded = false;

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
                if (!val || !val.hasOwnProperty("value")) {
                    data[round][player + 1] = val;
                } else {
                    if (val.tip && !annotations_loaded) {
                        let lost_lifes = val.tip.match(/(\d+)\)/);
                        annotations.push({ series: player_names[player], x: round, tickHeight: 0, tickWidth: 0, width: 4, height: 4, text: i18n.tr('annotations_lost_lifes', {lost_lifes: lost_lifes[1]})});
                    }
                    data[round][player + 1] = val.value;
                } 
            }
        }

        annotations_loaded = annotations.length !== 0;
    }

    return {
        rounds_count: rounds_count,
        players_count: players_count,
        values: values,
        player_names: player_names,
        colors: colors,
        annotations: annotations,
        heights: Array(players_count).fill(null)
    };
}

function normalizeWheel(/*object*/ event) /*object*/ {
    const PIXEL_STEP  = 10;
    const LINE_HEIGHT = 40;
    const PAGE_HEIGHT = 800;

    var sX = 0, sY = 0,       // spinX, spinY
        pX = 0, pY = 0;       // pixelX, pixelY
  
    // Legacy
    if ('detail'      in event) { sY = event.detail; }
    if ('wheelDelta'  in event) { sY = -event.wheelDelta / 120; }
    if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }
    if ('wheelDeltaX' in event) { sX = -event.wheelDeltaX / 120; }
  
    // side scrolling on FF with DOMMouseScroll
    if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
      sX = sY;
      sY = 0;
    }
  
    pX = sX * PIXEL_STEP;
    pY = sY * PIXEL_STEP;
  
    if ('deltaY' in event) { pY = event.deltaY; }
    if ('deltaX' in event) { pX = event.deltaX; }
  
    if ((pX || pY) && event.deltaMode) {
      if (event.deltaMode == 1) {          // delta in LINE units
        pX *= LINE_HEIGHT;
        pY *= LINE_HEIGHT;
      } else {                             // delta in PAGE units
        pX *= PAGE_HEIGHT;
        pY *= PAGE_HEIGHT;
      }
    }
  
    // Fall-back if spin cannot be determined
    if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
    if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }
  
    return { spinX  : sX,
             spinY  : sY,
             pixelX : pX,
             pixelY : pY };
  }

function scrollV3(event, g, context) {
    // if (lastClickedGraph != g) {
    //   return;
    // }
    let delta = normalizeWheel(event);
    
    let normal = -5 * delta.spinY;
    // console.log('DeltaY: ', normal);
    // console.log('DeltaMode: ', event.deltaMode);
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

export function getDataSource(charts, chart_name) {
    let opts = charts.options[chart_name];
    if (opts && opts.hasOwnProperty('diffview') && opts.diffview) {
        return charts.diffvalues[chart_name];
    } else if (opts && opts.hasOwnProperty('accumulative') && !opts.accumulative) {
        return charts.per_round_values[chart_name];
    } else {
        return charts.values[chart_name];
    }
}

export function updateOption(option_name, option_value, dygraph, chart_name, charts) {
    charts.options[chart_name][option_name] = option_value;
    if (option_name === 'logscale') {
        dygraph.updateOptions({ logscale: option_value });
    } else {
        dygraph.updateOptions({ file: getDataSource(charts, chart_name) });
    }
    saveOptions(charts.options);
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
            return x.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ",").replace(/\.000$/g, '');
        },

        logscale: chart_options.logscale ? true : false,
        labelsKMB: true,
        labels: labels,
        width: "100%",
        height: charts.heights[chart_name] ? charts.heights[chart_name] : 150,
        animatedZooms: true,

        // legend: "follow",
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
            wheel: scrollV3,

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

    let values = getDataSource(charts, chart_name);
    if (!values) return null;

    let dygraph = new Dygraph(elem, values, opts);
    if (chart_options.show_annotations && charts.annotations) {
        dygraph.ready(() => dygraph.setAnnotations(charts.annotations));
    }

    let opts_elem = document.createElement("div");
    opts_elem.className = "chart-options";

    if (chart_options.hasOwnProperty("logscale")) {
        opts_elem.appendChild(
            createOptionElem(charts.options[chart_name].logscale, "logscale", function(value) {
                updateOption('logscale', value, dygraph, chart_name, charts);
            })
        );
    }

    if (chart_options.hasOwnProperty("accumulative")) {
        opts_elem.appendChild(
            createOptionElem(charts.options[chart_name].accumulative, "accumulative", function(value) {
                updateOption('accumulative', value, dygraph, chart_name, charts);
            })
        );
    }

    if (chart_options.hasOwnProperty("diffview")) {
        opts_elem.appendChild(
            createOptionElem(charts.options[chart_name].diffview, "diffview", function(value) {
                updateOption('diffview', value, dygraph, chart_name, charts);
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

export function countAccumulativeValues(vals) {
    if (!vals || !vals[0]) return null;
    let result = [vals[0]];
    for (let round_num = 1; round_num < vals.length; ++round_num) {
        result[round_num] = [vals[round_num][0]];
        for (let i = 1; i < vals[round_num].length; ++i) {
            result[round_num][i] = vals[round_num][i] + result[round_num - 1][i];
        }
    }
    return result;
}

export function countDiffValues(vals) {
    if (!vals || !vals[0]) return null;
    let result = [vals[0]];

    for (let round_num = 0; round_num < vals.length; ++round_num) {
        result[round_num] = [vals[round_num][0]];
        let mean = 1.0;
        let count = 0;
        for (let j = 1; j < vals[round_num].length; ++j) {
            if (vals[round_num][j]) {
                mean *= vals[round_num][j];
                count++;
            }
        }
        mean = Math.pow(mean, 1 / count);
        for (let j = 1; j < vals[round_num].length; ++j) {
            result[round_num][j] = vals[round_num][j] / mean;
        }
    }
    return result;
}

export function countMoney(starting_money, charts) {
    let accumulated_vals = charts.values;
    let per_round_values = charts.per_round_values;

    let income = accumulated_vals.income;
    let rounds_count = charts.rounds_count;
    let row_size = charts.players_count + 1;

    let prev_row = Array(row_size).fill(starting_money);
    let result = Array(rounds_count);

    for (let round_num = 0; round_num < rounds_count; ++round_num) {
        let row = Array(row_size);
        row[0] = round_num;

        for (let i = 1; i < row_size; ++i) {
            // let money_got = (income ? income[round_num][i] : 0) + Math.abs(per_round_values.sellings[round_num][i]);
            let money_total = accumulated_vals.money ? accumulated_vals.money[round_num][i] : 0;
            let spent_creeps = accumulated_vals.spent_creeps ? accumulated_vals.spent_creeps[round_num][i] : 0;
            let spent_towers = accumulated_vals.spent_towers ? accumulated_vals.spent_towers[round_num][i] : 0;
            let investment = accumulated_vals.spent_creeps
                ? 0
                : (accumulated_vals.income && accumulated_vals.income[round_num + 1])
                    ? (accumulated_vals.income[round_num + 1][i] - 200) * 10
                    : 0;
            let money_for_killing = 0;
            for (let k = 1; k < row_size; ++k) {
                if (i !== k && accumulated_vals.spent_creeps && accumulated_vals.spent_creeps[round_num][k]) {
                    money_for_killing += accumulated_vals.income[round_num][k] || 0;
                }
            }
            // money_got += money_for_killing;
            let money_spent = spent_towers + spent_creeps + investment;
            let new_val = money_total + money_for_killing - money_spent + Math.abs(accumulated_vals.sellings[round_num][i]);
            // row[i] = Math.max(new_val, 0);
            row[i] = new_val;

        }

        result[round_num] = row;
        prev_row = row;
    }
    return result;
}

export function countAccumulativeMoney(charts) {
    let result = new Array(charts.rounds_count);
    result[0] = new Array(charts.players_count + 1);
    result[0][0] = 0;
    for (let i = 1; i <= charts.players_count; ++i) {
        result[0][i] = 200 + (charts.values.income ? charts.values.income[0][i] : 0);
    }

    for (let round_num = 1; round_num < charts.rounds_count; ++round_num) {
        let row = new Array(charts.players_count + 1);
        row[0] = round_num;
        for (let i = 1; i <= charts.players_count; ++i) {
            row[i] = result[round_num - 1][i] + (charts.values.income ? charts.values.income[round_num][i] : 0);
        }
        // for (let i = 1; i <= charts.players_count; ++i) {
        //     row[i] = charts.per_round_values.money[round_num][i] + (charts.values.spent_creeps ? charts.values.spent_creeps[round_num][i] : 0) + charts.values.spent_towers[round_num][i];
        // }
        result[round_num] = row;
    }
    return result;
}

export function invertValues(values) {
    let result = new Array(values.length);
    for (let round_num = 0; round_num < values.length; ++round_num) {
        let row = new Array(values[round_num].length);
        row[0] = round_num;
        for (let i = 1; i < values[round_num].length; ++i) {
            row[i] = -values[round_num][i];
        }
        result[round_num] = row;
    }
    return result;
}

export function mergeObjects(dest, src) {
    Object.keys(src).forEach(function(key){
        if (src[key] instanceof Object && dest[key] instanceof Object) {
            dest[key] = mergeObjects(dest[key], src[key]);
        } else {
            dest[key] = src[key];
        }
    });
    return dest;
}

export function loadOptions(defaults) {
    let storage = window.localStorage;
    if (!storage) return defaults;
    let options = storage.getItem('ctd_stat_charts_options__');
    if (!options) return defaults;
    options = JSON.parse(options);
    let result = mergeObjects({}, defaults);
    return mergeObjects(result, options);
}

export function saveOptions(options) {
    let storage = window.localStorage;
    if (!storage) return;
    storage.setItem('ctd_stat_charts_options__', JSON.stringify(options));
}
