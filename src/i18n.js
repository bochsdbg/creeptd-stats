const messages = {
    "en": {
        "chart_title_lives": { "message": "Lives" },
        "chart_title_actions": { "message": "Actions" },
        "chart_title_kills": { "message": "Kills" },
        "chart_title_income": { "message": "Income" },
        "chart_title_spent_creeps": { "message": "Spent for creeps" },
        "chart_title_spent_towers": { "message": "Spent for towers" },
        "chart_title_sellings": { "message": "Sellings" },
        "chart_title_money": { "message": "Money" },

        "option_title_accumulative": { "message": "Accumulative" },
        "option_text_accumulative": { "message": "A" },
        "option_title_logscale": { "message": "Logarithmic scale" },
        "option_text_logscale": { "message": "L" },
        "option_title_diffview": { "message": "Difference view" },
        "option_text_diffview": { "message": "D" },

        "option_title_highlight_series": { "message": "Highlight current series" },
        "option_text_highlight_series": { "message": "H" },

        "option_title_show_annotations": { "message": "Show \"lives lost\" annotations" },
        "option_text_show_annotations": { "message": "A" },
        "annotations_lost_lifes": { "message": "Lost lifes: {lost_lifes}" },

        "option_title_legend_at_right_side": { "message": "Show charts' values on the right side" },
        "option_text_legend_at_right_side": { "message": "R" },
    },
}

const default_locale = 'en';
let current_locale = default_locale;

export function setLocale(locale) {
    if (messages.hasOwnProperty(locale)) {
        current_locale = locale; 
    }
}

function format(str, args) {
    let result = str.toString();
    for (let key in args) {
        result = result.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key]);
    }
    return result;
}

export function tr(msg, args) {
    let message = null;
    if (messages[current_locale].hasOwnProperty(msg)) {
        message = messages[current_locale][msg].message;
    } else {
        message = messages[default_locale].hasOwnProperty('msg') ? messages[default_locale][msg].message : msg;
    }
    return format(message, args);
}
