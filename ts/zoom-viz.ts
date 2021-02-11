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
 * @fileoverview A zoom-able visualization prototype.
 */

import * as d3 from 'd3'
import * as utils from './utils';

declare const $: any;
let currentLevel: number;

export function drawZoomPlot(data: any, text: string[], chapterBreaks: number[]) {
    const num_levels = 3
    const height: number = 100, width: number = 700;
    const contextHeight: number = 12;
    const margin: {top: number; right: number; bottom: number;
                left: number;} = {top: 10, right: 10, bottom: 10, left:
                10};
    
    currentLevel = num_levels;

    // set up svg
    const mainSvg = d3.select('#visualizationBody')
                    .classed("svg-container", true)
                    .append('svg')
                    .attr('id', 'mainVizSvg')
                    .attr("preserveAspectRatio", "xMinYMin meet")
                    .attr("viewBox", "0 0 " + `${width} ${contextHeight + height}`)
                    .classed("svg-content-responsive", true)

    const contextSvg = mainSvg.append('g')
                              .attr("class", "context")
                              .attr("transform", 
                              `translate(0,0)`)

    const clusterSvg = mainSvg.append('g')
                              .attr("class", "focus")
                              .attr("transform", 
                              `translate(0,0)`);

    const x = d3.scaleLinear()
            .range([ 0, width ])
            .domain([0, text.length])

    const contextX = d3.scaleLinear()
                .range([ 0, width ])
                .domain([0, text.length])

    const y = d3.scaleLinear()
            .range([ height - margin.bottom, margin.top + contextHeight ])
            .domain([0, 1])

    // add the section data
    clusterSvg.selectAll()
        .data(data.filter(function (entry: any) {
            return entry.window_size === num_levels - 1;
        }))
        .enter()
        .append("rect")
            .attr("x", function(d: any) { return x(d.x_start) + x(0.25) })
            .attr("y", function(d: any) { return y(1) })
            .attr("width", function(d: any) {return Math.max(0, x(d.section_length) - x(0.5))})
            .attr("height", 0.9*(y(0) - y(1)))
            .attr("cluster", function(d: any) {return d.cluster})
            .attr("window", function(d: any) {return d.window_size})
            .style("fill", function(d: any) {return utils.arrayToRGBAString(d.rgb)} )
            .style("opacity", 0.8)
            .on('mouseover', (d, i, n) => {tooltipOn(d, i, n, text)})
            .on('mouseout', (d, i, n) => {tooltipOff(d, i, n)})
    
    clusterSvg.call(d3.zoom().on("zoom", function () {
        const e = d3.event;
        const transform = d3.event.transform;

        const scale = Math.max(transform.k, 1.0)
        const tx = Math.min(0, Math.max(width * (1 - scale), transform.x));

        console.log(transform)
        console.log(tx)

        const transformString = 'translate(' + tx + ',' + '0) scale(' + scale + ',1)';
        clusterSvg.attr("transform", transformString)
        contextSvg.attr("transform", transformString)

        if (scale > 1.2) {
            console.log('here')
            const newDomain = d3.event.transform.rescaleX(x).domain()
            const sectionsInDomain = data.filter(function (entry: any) {
                    return (
                        entry.window_size === currentLevel &&
                        entry.x_start > newDomain[0] &&
                        entry.x_start < newDomain[1]);
                })

            let sectionChange = false;
            if (sectionsInDomain.length < 15 && currentLevel > 0) {
                currentLevel -= 1;
                sectionChange = true; 
            } else if (sectionsInDomain.length > 30 && currentLevel < num_levels - 1) {
                currentLevel += 1;
                sectionChange = true; 
            } 
            if (sectionChange) {
                const rects = clusterSvg.selectAll("rect")
                .data(data.filter(function (entry: any) {
                    return entry.window_size === currentLevel;
                }))
                rects.exit().remove()
                rects.enter().append("rect")
                .merge(rects as any)
                .attr("x", function(d: any) { return x(d.x_start) + x(0.25) })
                .attr("y", function(d: any) { return y(1) })
                .attr("width", function(d: any) {return Math.max(0, x(d.section_length) - x(0.5))})
                .attr("height", 0.9*(y(0) - y(1)))
                .attr("cluster", function(d: any) {return d.cluster})
                .attr("window", function(d: any) {return d.window_size})
                .style("fill", function(d: any) {return utils.arrayToRGBAString(d.rgb)} )
                .style("opacity", 0.8)
                .on('mouseover', (d, i, n) => {tooltipOn(d, i, n, text)})
                .on('mouseout', (d, i, n) => {tooltipOff(d, i, n)})
                }
            }
            
    }))
            

    let chapterBreakJSON: {chapter_start: number, chapter_length: number}[] = []
    chapterBreaks.push(text.length)
    for (let i = 0; i < chapterBreaks.length - 1; i++) {
        chapterBreakJSON.push({
            'chapter_start': chapterBreaks[i],
            'chapter_length': chapterBreaks[i+1] - chapterBreaks[i]
        })
    } 
    contextSvg.selectAll()
        .data(chapterBreakJSON)
        .enter()
        .append("rect")
            .attr("x", function(d: any) {return x(d.chapter_start) + x(0.5);})
            .attr("y", contextHeight*0.15)
            .attr("width", function(d: any) {return Math.max(0, x(d.chapter_length) - x(1))})
            .attr("height", contextHeight*0.7)
            .style("fill", "grey");
}


const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);               

function tooltipOn(d: any, i: number, n: any, text: string[]) {
    tooltip.style('width', Math.floor($("#mainVizSvg")[0].getBoundingClientRect().width) + 'px');

    const currentEl = n[i];
    const gX = $("#mainVizSvg")[0].getBoundingClientRect().x 
    const gY = $("#mainVizSvg")[0].getBoundingClientRect().y + $("#mainVizSvg")[0].getBoundingClientRect().height

    d3.select(currentEl).classed('selected', true);
    d3.selectAll(`rect[cluster='${d.cluster}'][window='${d.window_size}']`)
      .transition()
      .duration(200)
      .style('opacity', 1.0)

    tooltip.transition()
           .duration(200)
           .style('opacity', .8);

    const selection_text = text.slice(d.x_start, d.x_start + d.section_length).join(" ");
    tooltip.html(selection_text)
        .style('left', gX + 'px')
        .style('top', gY + 'px')
        .style('border-color', utils.arrayToRGBAString(d.rgb))
}

function tooltipOff(d: any, i: number, n: any) {
    const currentEl = n[i];
    d3.select(currentEl).classed('selected', false);
    d3.selectAll(`rect[cluster='${d.cluster}'][window='${d.window_size}']`)
      .transition()
      .duration(200)
      .style('opacity', 0.8)
      .style("stroke-width", "0px");

    tooltip.transition().duration(500).style('opacity', 0);
}