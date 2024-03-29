/**
 * @license
 * Copyright 2015 Petr Shevtsov (petr.shevtsov@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/*global Dygraph:false */
/*jshint globalstrict: true */

import Dygraph from '../dygraph';

'use strict';

let crosshair = function(opt_options) {
    this.canvas_ = document.createElement("canvas");
    opt_options = opt_options || {};
    this.direction_ = opt_options.direction || null;
};

crosshair.prototype.toString = function() {
    return "Crosshair Plugin";
};

crosshair.prototype.activate = function(g) {
  g.graphDiv.appendChild(this.canvas_);

  return {
    select: this.select,
    deselect: this.deselect
  };
};

crosshair.prototype.select = function(e) {
  if (this.direction_ === null) {
    return;
  }

  var width = e.dygraph.width_;
  var height = e.dygraph.height_;
  this.canvas_.width = width;
  this.canvas_.height = height;
  this.canvas_.style.width = width + "px";    // for IE
  this.canvas_.style.height = height + "px";  // for IE

  var ctx = this.canvas_.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.beginPath();

  if (!e.dygraph.selPoints_[0]) return;

  var canvasx = Math.floor(e.dygraph.selPoints_[0].canvasx) + 0.5; // crisper rendering

  if (this.direction_ === "vertical" || this.direction_ === "both") {
    ctx.moveTo(canvasx, 0);
    ctx.lineTo(canvasx, height);
  }

  if (this.direction_ === "horizontal" || this.direction_ === "both") {
    for (var i = 0; i < e.dygraph.selPoints_.length; i++) {
      var canvasy = Math.floor(e.dygraph.selPoints_[i].canvasy) + 0.5; // crisper rendering
      ctx.moveTo(0, canvasy);
      ctx.lineTo(width, canvasy);
    }
  }

  ctx.stroke();
  ctx.closePath();
};

crosshair.prototype.deselect = function(e) {
  var ctx = this.canvas_.getContext("2d");
  ctx.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
};

crosshair.prototype.destroy = function() {
  this.canvas_ = null;
};

export default crosshair;
