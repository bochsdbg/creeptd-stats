import Dygraph from '../third-party/dygraphs/src/dygraph';

export function darkenColor(colorStr) {
    let color = Dygraph.toRGB_(colorStr);
    color.r = Math.round(color.r / 2);
    color.g = Math.round(color.g / 2);
    color.b = Math.round(color.b / 2);
    return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
} 