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
    },
}

const default_locale = 'en';
let current_locale = default_locale;

export function setLocale(locale) {
    if (messages.hasOwnProperty(locale)) {
        current_locale = locale; 
    }
}

export function tr(msg) {
    if (messages[current_locale].hasOwnProperty(msg)) {
        return messages[current_locale][msg].message;
    } else {
        return messages[default_locale].hasOwnProperty('msg') ? messages[default_locale][msg].message : msg;
    }
}
