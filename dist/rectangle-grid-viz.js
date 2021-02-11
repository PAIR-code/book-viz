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
 * @fileoverview Functions relating to visualizing books w/ rectangles arranged
 * in a grid. Each rectangle corresponds to a sentence and each block of
 * rectangles corresponds to a chapter.  The tooltip is used to view the text
 * corresponding to each sentence.  This viz corresponds to the 'grid-plot'
 * selection in the main page dropdown.
 */
import * as d3 from 'd3';
import * as utils from './utils';
const rectHeight = 4;
export function drawGridPlot(bookIdx, embData, embLength, splitBy, dimensions, order, data) {
    const chapterBreaks = data[bookIdx]['chapter_breaks_by_' + splitBy.slice(0, -1)];
    const textChunks = data[bookIdx][splitBy];
    const height = 400, width = 800;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const maxRectPerCol = Math.trunc(height / rectHeight);
    const embsFlat = Array.from(embData);
    let embs = [];
    while (embsFlat.length)
        embs.push(embsFlat.splice(0, embLength));
    // set up svg
    const chapterPlotSvg = d3.select('#visualizationBody')
        .classed('svg-container', true)
        .append('svg')
        .attr('id', 'mainVizSvg')
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr('viewBox', '0 0 ' +
        `${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .classed('svg-content-responsive', true)
        .append('g');
    const nbins = chapterBreaks.length;
    const parData = utils.getParData(textChunks, chapterBreaks, embs, order, dimensions);
    const binFunc = d3.histogram()
        .domain([0, nbins])
        .thresholds(nbins)
        .value(d => d.value);
    const binnedData = binFunc(parData).filter(d => d.length > 0);
    const colsPerBin = binnedData.map(bin => Math.ceil(bin.length / maxRectPerCol));
    const totalCols = utils.sum(colsPerBin) + colsPerBin.length - 1;
    const rectWidth = width / totalCols;
    const binXPositions = colsPerBin.map((col, idx, arr) => utils.sum(arr.slice(0, idx)) + idx);
    const xScale = d3.scaleLinear().domain([0, totalCols + 1]).range([0, width]);
    // g container for each bin
    const binContainer = chapterPlotSvg
        .selectAll('.gBin')
        .data(binnedData);
    binContainer.exit().remove();
    const binContainerEnter = binContainer.enter()
        .append('g')
        .attr('class', 'gBin')
        .attr('transform', d => `translate(${xScale(binXPositions[d.x0])},
                                                    ${margin.top})`);
    // need to populate the bin containers with data the first time
    binContainerEnter.selectAll('rect')
        .data(((d) => d.map((p, i) => {
        return { idx: i, text: p.text, value: p.value, emb: p.emb };
    })))
        .enter()
        .append('rect')
        .attr('class', 'enter')
        .attr('id', (d) => d.idx)
        .attr('x', (d) => {
        return Math.floor(d.idx / maxRectPerCol) * rectWidth;
    })
        .attr('y', (d) => (d.idx % maxRectPerCol) * rectHeight)
        .attr('original_y', (d) => (d.idx % maxRectPerCol) * rectHeight)
        .attr('width', rectWidth * 0.9)
        .attr('height', 0)
        .attr('text', (d) => d.text)
        .style('fill', (d) => {
        return embeddingToRGBA(d.emb, dimensions);
    })
        .on('mouseover', (d, i, n) => { tooltipOn(d, i, n, dimensions); })
        .on('mouseout', (d, i, n) => { tooltipOff(d, i, n); })
        .transition()
        .attr('height', rectHeight - 1)
        .duration(500);
    binContainerEnter.merge(binContainer)
        .attr('transform', d => `translate(${xScale(binXPositions[d.x0])}, ${margin.top})`);
    $('#searchText').on('input', (ev) => {
        const searchStr = $('#searchText').val().toLowerCase();
        if (!(searchStr) || (searchStr.length == 0)) {
            d3.selectAll('rect').style('opacity', 1.0);
        }
        else {
            d3.selectAll('rect')
                .filter(function (d, i) {
                return d.text.toLowerCase().search(`.*${searchStr}.*`);
            })
                .style('opacity', 0.3);
            d3.selectAll('rect')
                .filter(function (d, i) {
                return !(d.text.toLowerCase().search(`.*${searchStr}.*`));
            })
                .style('opacity', 1.0);
        }
    });
}
const tooltipWidth = 200;
const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('width', tooltipWidth + 'px');
function tooltipOn(d, i, n, dimensions) {
    const currentEl = n[i];
    const currentElX = currentEl.getBoundingClientRect().x;
    const currentElY = currentEl.getBoundingClientRect().y;
    const currentElWidth = currentEl.getBoundingClientRect().width;
    let gX;
    if (currentElX < $('#mainVizSvg').width() / 2.0) {
        gX = currentElX + currentElWidth;
    }
    else {
        gX = currentElX - tooltipWidth - currentElWidth / 2.0;
    }
    let gY = currentElY;
    d3.select(currentEl).classed('selected', true);
    d3.select(currentEl)
        .transition()
        .duration(200)
        .attr('height', rectHeight)
        .attr('y', parseFloat(currentEl.getAttribute('original_y')) - 0.5);
    tooltip.transition().duration(200).style('opacity', .9);
    tooltip.html(d.text)
        .style('left', gX + 'px')
        .style('top', gY + 'px')
        .style('border-color', embeddingToRGBA(d.emb, dimensions));
}
function tooltipOff(d, i, n) {
    const currentEl = n[i];
    d3.select(currentEl).classed('selected', false);
    d3.select(currentEl)
        .transition()
        .duration(200)
        .attr('height', rectHeight - 1)
        .attr('y', parseFloat(currentEl.getAttribute('original_y')));
    tooltip.transition().duration(500).style('opacity', 0);
}
function embeddingToRGBA(embRow, dimensions) {
    if (embRow.length == 1) {
        let newEmbRow = [0, 0, 0, embRow[0]];
        return arrayToRGBAString(newEmbRow);
    }
    if (dimensions === 'all') {
        embRow.push(1);
        return arrayToRGBAString(embRow);
    }
    else {
        let newEmbRow = [0, 0, 0, 0];
        newEmbRow[parseInt(dimensions)] = 255;
        newEmbRow[3] = embRow[parseInt(dimensions)];
        return arrayToRGBAString(newEmbRow);
    }
}
function arrayToRGBAString(arr) {
    return ('rgba(' + arr[0] * 255 + ',' + arr[1] * 255 + ',' + arr[2] * 255 + ',' +
        arr[3] + ')');
}
//# sourceMappingURL=rectangle-grid-viz.js.map