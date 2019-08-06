# CreepTD Statistics

Simple extension which replaces Flash-based charts with pure-JS canvas on CreepTD game statistics page.

Also, it adds some features:

- Zoom and pan at any point on the chart
- Logarithmic scale display
- Separate accumulated and per-round values
- Estimated money charts
- Show/hide 'lost lives' annotations

## Extension links

- https://chrome.google.com/webstore/detail/creeptd-statistics/cnedkcjfahpfmedpflodpcdbgigoenda
- https://addons.mozilla.org/addon/creeptd-statistics/

## Manual install

1. Download creeptd-stats.zip
2. Unpack into some directory
3. Go to Chrome -> Extensions. Enable "Developer mode"
4. Press "Load unpacked" button and select the directory where you unpacked the zip file

## Building

- Install inkscape (https://inkscape.org/), ninja-build (https://ninja-build.org/), nodejs (https://nodejs.org), zip utility. Add them to your path, if necessary
- Run `npm install`
- Run `ninja`
