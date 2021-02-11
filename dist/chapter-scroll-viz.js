/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview The entire text on the lefthand side, and visualization of each chapter on the right.
 * The chapter viz switches when you scroll to a new chapter.
 */
import * as d3 from 'd3';
import * as utils from './utils';
// Create SVG element
let svg = d3.select("svg");
const numLevels = 3;
const height = 800, width = 300;
let x = d3.scaleLinear().range([0, width]).domain([numLevels, 0]);
let y = d3.scaleLinear().range([height, 0]);
d3.select('#fixed')
    .classed("svg-container", true);
const mainSvg = svg.attr('width', width)
    .attr('height', height)
    .attr('id', 'mainVizSvg')
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + `${width} ${height}`)
    .classed("svg-content-responsive", true);
let clusterSvg;
// Update visualization to display data from a new chapter
function updateChapter(data, sentences, currentChapter, chapterBreaks) {
    const chapterData = data.filter(function (entry) {
        return entry.chapter === currentChapter;
    });
    y.domain([chapterBreaks[currentChapter + 1], chapterBreaks[currentChapter]]);
    setOnScroll('div' + currentChapter, y);
    // const padding = y(1) - y(0)
    const rects = clusterSvg.selectAll("rect").data(chapterData);
    rects.exit().remove();
    rects.enter().append("rect")
        .merge(rects)
        .attr("y", function (d) { return y(d.x_start); })
        .attr("x", function (d) { return x(d.window_size + 1) + 0.05 * (x(0) - x(1)); })
        .attr("height", function (d) {
        let rectHeight = y(d.x_start + d.section_length) - y(d.x_start);
        const padding = (rectHeight <= 1) ? rectHeight * 0.05 : 1;
        return rectHeight - padding;
    })
        .attr("width", 0.9 * (x(0) - x(1)))
        .attr("cluster", function (d) { return d.cluster; })
        .attr("window", function (d) { return d.window_size; })
        .attr("start", function (d) { return d.x_start; })
        .attr("end", function (d) { return d.x_start + d.section_length; })
        .attr("cluster", function (d) { return d.cluster; })
        .style("fill", function (d) { return utils.arrayToRGBAString(d.rgb); })
        .style("opacity", 0.8)
        .on("click", function (d, i) {
        d3.selectAll("rect[window='" + d.window_size + "']").data().forEach(function (d) {
            $('span').slice(d.x_start, d.x_start + d.section_length).css("color", utils.arrayToRGBAString(d.rgb, 1));
        });
        d3.selectAll("rect[window='" + d.window_size + "']").style("opacity", 1.0);
        d3.selectAll("rect:not([window='" + d.window_size + "'])").style("opacity", 0.8);
    })
        .on("mouseover", function (d) {
        d3.selectAll(`rect[cluster='${d.cluster}'][window='${d.window_size}']`)
            .transition()
            .duration(200)
            .style('opacity', 1.0)
            .style("stroke", "black")
            .style("stroke-width", "1px");
    })
        .on("mouseout", function (d) {
        $("#info").html("");
        d3.selectAll(`rect[cluster='${d.cluster}'][window='${d.window_size}']`)
            .transition()
            .duration(200)
            .style('opacity', 1.0)
            .style("stroke-width", "0px");
    });
    // Initially color text according to left column
    d3.selectAll("rect[window='" + (numLevels - 1) + "']").data().forEach(function (d) {
        $('span').slice(d.x_start, d.x_start + d.section_length).css("color", utils.arrayToRGBAString(d.rgb, 1));
    });
    d3.selectAll("rect[window='" + (numLevels - 1) + "']").style("opacity", 1.0);
    d3.selectAll("rect:not([window='" + (numLevels - 1) + "'])").style("opacity", 0.8);
    rects.transition().duration(300);
}
// Move the line when text scrolls
let lastScrollTop = 0;
function setOnScroll(n, y) {
    let startingSpanIdx = ($("#" + n + " span").offset().top > 0) ? 0 : -1;
    let currentSpanId = $("#" + n + " span").get(startingSpanIdx).id;
    const midPoint = $("#main").height() / 2 + $("#main").position().top;
    let distanceToMidpoint = (id) => Math.abs($("span#" + id).offset().top - midPoint);
    $("#main").off('scroll').on('scroll', function () {
        console.log(currentSpanId);
        let currentScrollTop = $("#main").scrollTop();
        let newSpanOffset = (currentScrollTop > lastScrollTop) ? 1 : -1;
        let newSpanId = (parseInt(currentSpanId) + newSpanOffset).toString();
        if (distanceToMidpoint(newSpanId) <= distanceToMidpoint(currentSpanId)) {
            $("span#" + currentSpanId).css("font-weight", 500);
            $("span#" + newSpanId).css("font-weight", 600);
            clusterSvg.select("line")
                .transition()
                .attr("y1", y(parseInt(newSpanId)))
                .attr("y2", y(parseInt(newSpanId)));
            currentSpanId = newSpanId;
        }
        lastScrollTop = currentScrollTop;
    });
}
// Waypoints scroll constructor
function scroll(n, offset, func, prevIdx, nextIdx, data, sentences, chapterBreaks) {
    console.log("here", document.getElementById(n));
    return new Waypoint({
        element: document.getElementById(n),
        handler: function (direction) {
            console.log(n);
            const chapterIdx = direction == 'down' ? nextIdx : prevIdx;
            func(data, sentences, chapterIdx, chapterBreaks);
        },
        context: document.getElementById("main"),
        //start 75% from the top of the div
        offset: offset
    });
}
;
// Populate book text
function fillText(sentences, paragraphBreaks, chapterBreaks) {
    $("#container").append(`
            <div id="spacerDiv" style='height:55%'>
            </div>
        `);
    const chapterBreaksToEnd = chapterBreaks.concat([sentences.length]);
    // const paragraphBreaksToEnd = [1].concat(paragraphBreaks, [sentences.length])
    for (let c = 0; c < chapterBreaksToEnd.length - 1; c++) {
        let chapterText = sentences.slice(chapterBreaksToEnd[c], chapterBreaksToEnd[c + 1]);
        let chapterParagraphBreaks = paragraphBreaks.slice(chapterBreaksToEnd[c], chapterBreaksToEnd[c + 1]);
        // let chapterClusters = clusterArr.slice(chapterBreaksToEnd[c], chapterBreaksToEnd[c+1])
        let content = "<p>";
        for (let s = 0; s < chapterText.length; s++) {
            let prefix = (chapterParagraphBreaks[s] == 1) ? '<p>' : '';
            let suffix = '';
            if ((s == chapterText.length - 1) || (chapterParagraphBreaks[s + 1] == 1)) {
                suffix = '</p>';
            }
            content += (prefix + `<span id='${chapterBreaksToEnd[c] + s}' class='sentence'>
                                    ${chapterText[s]}</span>` + suffix);
        }
        $("#container").append(`<div id="div${c}">${content}</div>`);
    }
}
export function init(data, sentences, paragraphBreaks, chapterBreaks) {
    d3.selectAll("svg > *").remove();
    Waypoint.destroyAll();
    clusterSvg = d3.select('svg').append('g')
        .attr("class", "focus");
    clusterSvg.append("line")
        .style("stroke", "black")
        .style("stroke-width", "3")
        .attr("x1", x(numLevels))
        .attr("x2", x(0))
        .attr("y1", -2)
        .attr("y2", -2);
    fillText(sentences, paragraphBreaks, chapterBreaks);
    const chapterBreaksToEnd = chapterBreaks.concat([sentences.length]);
    const waypoints = new Array(chapterBreaks.length);
    for (let i = 0; i < chapterBreaks.length; i++) {
        console.log(i);
        let newWaypoint = scroll('div' + i.toString(), '50%', updateChapter, Math.max(0, i - 1), i, data, sentences, chapterBreaksToEnd);
        waypoints[i] = newWaypoint;
    }
}
//# sourceMappingURL=chapter-scroll-viz.js.map