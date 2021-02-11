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
 * @fileoverview Creates a grid with a 3-level viz of book sections on the left,
 * and the full book text on the right. Top words and important sections are
 * highlighted in the text.
*/
import * as d3 from 'd3';
import * as utils from './utils';
const numLevels = 3;
let spanPositions = [];
const height = 700, width = 500;
const margin = { top: 10, right: 10, bottom: 10, left: 20 };
let x = d3.scaleLinear().range([width, margin.left]).domain([0, numLevels]);
let y = d3.scaleLinear().range([height, 0]);
let ignoreScrollEvents = false;
let currentWindow;
const mainSvg = d3.select("div#svg-container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .classed("svg-content-responsive", true);
let clusterSvg;
function createPlot(data, chapterBreaks, sentences) {
    clusterSvg = mainSvg.append('g').attr("id", "clusterSvg");
    // Add line denoting chapter breaks
    const chapterAxis = clusterSvg.append("line")
        .style("stroke", "black")
        .attr("x1", 5)
        .attr("y1", y(0))
        .attr("x2", 5)
        .attr("y2", height);
    const chapterDots = clusterSvg.selectAll("circle").data(chapterBreaks)
        .enter().append("circle")
        .style("fill", "black")
        .attr("r", 2)
        .attr("cx", 5)
        .attr("cy", function (d) { return y(d); });
    // Add columns with section data
    const rects = clusterSvg.selectAll("rect.text-rect").data(data);
    rects.exit().remove();
    rects.enter().append("rect")
        .merge(rects)
        .attr("class", "text-rect")
        .attr("y", function (d) { return y(d.x_start); })
        .attr("x", function (d) { return x(d.window_size + 1); })
        .attr("height", function (d) { return y(d.section_length); })
        .attr("width", 0.99 * (x(0) - x(1)))
        .attr("cluster", function (d) { return d.cluster; })
        .attr("window", function (d) { return d.window_size; })
        .attr("start", function (d) { return d.x_start; })
        .attr("end", function (d) { return d.x_start + d.section_length; })
        .attr("section-id", function (d) { return d.id; })
        .style("fill", function (d) { return utils.arrayToRGBAString(d.rgb); })
        .style("opacity", function (d) {
        if (d.window_size == currentWindow) {
            return 1;
        }
        else {
            return 0.5;
        }
    });
    // Add labels to rectangles
    let allLabels = [];
    rects.enter().append("text")
        .style("fill", "white")
        .attr("x", function (d, i) {
        return x(d.window_size + 1) + 5;
    })
        .attr("y", function (d) {
        return y(d.x_start + d.section_length / 2);
    })
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "start")
        .attr("window_size", function (d) { return d.window_size; })
        .attr("content", function (d) { return getTopWordForDisplay(d, data); })
        .style("style", "label")
        .style("font-size", function (d) {
        const rectHeight = $(`rect[section-id='${d.id}']`)[0].getBoundingClientRect().height;
        const textHeight = Math.min(Math.floor(rectHeight), 12);
        return `${textHeight}px`;
    })
        .attr("class", "annotation")
        .text(function (d) {
        let topWord = getTopWordForDisplay(d, data);
        if (topWord != "") {
            allLabels.push(topWord);
        }
        return topWord;
    });
    $("text[content='']").remove();
    // Color the text according to embeddings + denote top words and sentences.
    colorText(currentWindow);
    markTopWordsAndSentences(currentWindow);
    // On hover over text, outline other sections with the same cluster label. 
    // On click, show pop up modal with text from these sections.
    let infoDisplayed = false;
    $("span.sentence").mouseover(function (event) {
        const sectionId = parseInt(event.currentTarget.getAttribute("section-id"));
        console.log(event.currentTarget);
        console.log(data[sectionId]);
        const selectedSection = data[sectionId];
        d3.selectAll("rect[window='" + selectedSection.window_size + "']").filter(function (d) {
            return d.cluster == selectedSection.cluster;
        }).style("stroke", "black").style("stroke-width", "1px");
    }).mouseout(function (event) {
        d3.selectAll("rect[window='" + currentWindow + "']").style("stroke", "none");
        const sectionId = parseInt(event.currentTarget.getAttribute("section-id"));
    }).click(function (event) {
        infoDisplayed = true;
        $("#myModal").css("display", "block");
        let currentChapter = 0;
        const sectionId = parseInt(event.currentTarget.getAttribute("section-id"));
        const selectedSection = data[sectionId];
        $("#innerModal").append(`<div class='info-text' 
                                    style='color:black;'}; margin-bottom: 2px;'>
                                    TOP WORDS IN SECTION
                                    </div>`);
        $("#innerModal").append(`<div class='info-text' 
                                    style='color:grey;'}; margin-bottom: 5px;'>
                                    ${data[sectionId]['top_words'].join(", ")}
                                    </div>`);
        d3.selectAll("rect[window='" + selectedSection.window_size + "']").filter(function (d) {
            return d.cluster == selectedSection.cluster;
        }).data().forEach(function (d) {
            if (d['id'] == sectionId) {
                return;
            }
            let topSentenceString = "";
            if (d['chapter'] + 1 != currentChapter) {
                currentChapter = d['chapter'] + 1;
                $("#innerModal").append(`<div class='info-text' 
                                    style='color:black;'}; margin-bottom: 2px;'>
                                    CHAPTER ${d.chapter + 1}
                                    </div>`);
            }
            for (let s = 0; s < d.top_sentences.length; s++) {
                topSentenceString += sentences[d.top_sentences[s]];
                topSentenceString += " . . . ";
            }
            $("#innerModal").append(`<div class='info-text book-exerpt' 
                                      section-id='${d.id}'
                                      style='color:${utils.arrayToRGBAString(d.rgb)}; margin-bottom: 5px;'>
                                      ${topSentenceString}
                                      </div>`);
        });
        $(".book-exerpt").mouseover(function (subEvent) {
            const selectedExerptSectionId = parseInt(subEvent.currentTarget.getAttribute("section-id"));
            d3.select(`rect[section-id='${selectedExerptSectionId}']`)
                .style("stroke", "black")
                .style("stroke-width", "1px");
        }).mouseout(function (subEvent) {
            const selectedExerptSectionId = parseInt(subEvent.currentTarget.getAttribute("section-id"));
            d3.select(`rect[section-id='${selectedExerptSectionId}']`)
                .style("stroke", "none");
        });
        currentChapter = 0;
    });
    // Initialize brush and move position on scroll.
    let brush = d3.brushY()
        .extent([[0, 0], [width, height]])
        .on("end", brushed);
    clusterSvg.append("g")
        .attr("class", "brush")
        .call(brush);
    $("#main").off('scroll').on('scroll', function () {
        infoDisplayed = false;
        const ignore = ignoreScrollEvents;
        if (ignore)
            return;
        const newExtent = getNewExtent();
        console.log(newExtent);
        d3.select(".brush").call(brush.move, [y(newExtent[0]), y(newExtent[1])]);
    });
    rects.transition().duration(300);
}
function getTopWordForDisplay(d, data) {
    let top_word = d.top_words[0];
    if (d.window_size == 1) {
        if (top_word == (data[d.parent_ids[0]].top_words[0])) {
            top_word = d.top_words[1];
        }
    }
    else if (d.window_size == 0) {
        const firstTopWord = data[Math.max(...d.parent_ids)].top_words[0];
        let secondTopWord = data[Math.min(...d.parent_ids)].top_words[0];
        if (firstTopWord == secondTopWord) {
            secondTopWord = data[Math.min(...d.parent_ids)].top_words[1];
        }
        if (top_word == firstTopWord || top_word == secondTopWord) {
            top_word = d.top_words[1];
            if (top_word == firstTopWord || top_word == secondTopWord) {
                top_word = d.top_words[2];
            }
        }
    }
    return top_word;
}
function markTopWordsAndSentences(newWindow) {
    currentWindow = newWindow;
    d3.selectAll("rect[window='" + newWindow + "']").data().forEach(function (d) {
        for (let section_idx = d.x_start; section_idx < d.x_start + d.section_length; section_idx++) {
            let section_html = $(`span#${section_idx}`).html();
            const top_words = d['top_words'];
            for (let word_idx = 0; word_idx < top_words.length; word_idx++) {
                let regex_word = new RegExp('\\b' + top_words[word_idx] + '\\b', "ig");
                section_html = section_html.replace(regex_word, function (match) {
                    return `<span style='border-color:${utils.arrayToRGBAString(d.rgb, 0.5)}' class='underline'>${match}</span>`;
                });
            }
            $(`span#${section_idx}`).html(section_html);
        }
        for (let top_sentence_idx = 0; top_sentence_idx < d.top_sentences.length; top_sentence_idx++) {
            let top_sentence_idx_in_book = d.top_sentences[top_sentence_idx];
            let section_html = $(`span#${top_sentence_idx_in_book}`).html();
            $(`span#${top_sentence_idx_in_book}`).addClass("bold");
        }
    });
}
function colorText(newWindow) {
    d3.selectAll("rect[window='" + currentWindow + "']").data().forEach(function (d) {
        $('span.sentence').slice(d.x_start, d.x_start + d.section_length)
            .css("color", utils.arrayToRGBAString(d.rgb, 1))
            .attr("cluster", d.cluster)
            .attr("section-id", d.id);
    });
}
function updateLevel(direction) {
    if (direction == 'prev') {
        if (currentWindow == numLevels - 1) {
            return;
        }
        currentWindow += 1;
    }
    else {
        if (currentWindow == 0) {
            return;
        }
        currentWindow -= 1;
    }
    if (currentWindow == numLevels - 1) {
        $("#prev").addClass("disabled");
        $("#next").removeClass("disabled");
    }
    else if (currentWindow == 0) {
        $("#next").addClass("disabled");
        $("#prev").removeClass("disabled");
    }
    else {
        $("#prev").removeClass("disabled");
        $("#next").removeClass("disabled");
    }
    d3.selectAll('rect.text-rect')
        .style("opacity", function (d) {
        if (d.window_size == currentWindow) {
            return 1;
        }
        else {
            return 0.5;
        }
    });
    $('#container').find('span.underline').contents().unwrap().end();
    $("span.sentence").removeClass("bold");
    colorText(currentWindow);
    markTopWordsAndSentences(currentWindow);
}
function brushed() {
    const selection = d3.event.selection;
    if (!d3.event.sourceEvent || !selection)
        return;
    ignoreScrollEvents = true;
    const firstSentence = Math.floor(y.invert(selection[0]));
    $(`span#${firstSentence}`)[0].scrollIntoView();
    setTimeout(function () { ignoreScrollEvents = false; }, 100);
}
function getNewExtent() {
    const currentScrollTop = $("#main").scrollTop();
    const currentScrollBottom = currentScrollTop + $("#main").height();
    let firstSpanIdx = 0;
    while (spanPositions[firstSpanIdx] < currentScrollTop) {
        firstSpanIdx += 1;
    }
    let lastSpanIdx = firstSpanIdx + 1;
    while (spanPositions[lastSpanIdx] < currentScrollBottom) {
        lastSpanIdx += 1;
    }
    console.log(firstSpanIdx, lastSpanIdx);
    return [firstSpanIdx, lastSpanIdx];
}
function fillText(sentences, paragraphBreaks, chapterBreaks) {
    $("#container").append(`
            <div id="spacerDiv" style='height:20%'>
            </div>
        `);
    const chapterBreaksToEnd = chapterBreaks.concat([sentences.length]);
    for (let c = 0; c < chapterBreaksToEnd.length - 1; c++) {
        let chapterText = sentences.slice(chapterBreaksToEnd[c], chapterBreaksToEnd[c + 1]);
        let chapterParagraphBreaks = paragraphBreaks.slice(chapterBreaksToEnd[c], chapterBreaksToEnd[c + 1]);
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
    // $("#innerModal").css("opacity", 0)
    $("#innerModal").html("");
    currentWindow = 2;
    $("#prev").addClass("disabled");
    $("#next").removeClass("disabled");
    $("#prev").unbind().click(function () {
        console.log("here");
        updateLevel("prev");
    });
    $("#next").unbind().click(function () {
        updateLevel("next");
    });
    // When the user clicks on <span> (x), close the modal
    $("#close").click(function () {
        console.log("here");
        $("#myModal").css("display", "none");
        $("#innerModal").html("");
    });
    // When the user clicks anywhere outside of the modal, close it
    $(window).click(function (event) {
        if (event.target == $("#modalContent")) {
            $("#myModal").css("display", "none");
            $("#innerModal").html("");
        }
    });
    data.forEach(function (d, i) {
        d['id'] = i;
    });
    y.domain([sentences.length, 0]);
    console.log(y.domain);
    fillText(sentences, paragraphBreaks, chapterBreaks);
    for (let spanIdx = 0; spanIdx < sentences.length; spanIdx++) {
        spanPositions.push($(`span#${spanIdx}`).position().top);
    }
    const chapterBreaksToEnd = chapterBreaks.concat([sentences.length]);
    createPlot(data, chapterBreaksToEnd, sentences);
}
//# sourceMappingURL=section-text-viz.js.map