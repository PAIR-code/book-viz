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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * @fileoverview Main app file. Calls the corresponding viz script depending on the values of the "vizChoice" dropdown.
 */
import * as grid_viz from './rectangle-grid-viz';
import * as cluster_viz from './cluster-viz';
import * as scroll_viz from './chapter-scroll-viz';
import * as zoom_viz from './zoom-viz';
import * as zoom_text_viz from './section-text-viz';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield (yield fetch('data/book_text_data.json')).json();
        const idxBookMap = {}; // Maps book name strings to their index in the data json
        for (let i = 0; i < data.length; i++) {
            const bookName = data[i].name.split('.')[0];
            const selectedString = (i == 0) ? ` data-selected="true">` : '>';
            idxBookMap[bookName] = i;
            $('#menuDropdown')
                .append(`<li class="mdl-menu__item" data-val="${bookName}"` +
                selectedString + `${bookName}</li>`);
        }
        console.log(idxBookMap);
        // Reinitialize dropdown after adding choices
        getmdlSelect.init('#bookChoiceDiv');
        $('.mdl-textfield__input.dropdown').on('change', (ev) => {
            const bookName = $('#bookChoice').val();
            const vizType = $('#vizChoice').val();
            const embType = $('#embChoice').val();
            let reduceType = $('#reduceChoice').val();
            const avgWindow = $('#avgChoice').val();
            const dimensions = $('#dimChoice').val();
            const order = $('#orderChoice').val();
            const splitBy = $('#splitChoice').val();
            if (vizType == 'heatmap') {
                reduceType = 'dist';
            }
            const embString = [embType, reduceType, avgWindow].join('-');
            if (reduceType == 'diffs') {
                $('#dimChoiceDiv').addClass('disabled-dropdown');
            }
            else {
                $('#dimChoiceDiv').removeClass('disabled-dropdown');
            }
            displayData(bookName, vizType, splitBy, embString, dimensions, order, data, idxBookMap);
        });
        $('#bookChoice').change();
    });
}
function displayData(bookName, vizType, splitBy, embType, dimensions, order, data, idxBookMap) {
    return __awaiter(this, void 0, void 0, function* () {
        $('#searchText').val('');
        const bookIdx = idxBookMap[bookName];
        if (vizType === 'grid-plot') {
            $('#visualizationBody').html('');
            const url = 'data/' + embType.split('-')[1] + '_bytes/' + bookIdx.toString() + '-' + embType;
            const fetchData = yield fetch(url);
            const embBuffer = yield fetchData.arrayBuffer();
            const embData = new Float32Array(embBuffer);
            const embLength = (embType.split('-')[1] == 'diffs') ? 1 : 3;
            grid_viz.drawGridPlot(bookIdx, embData, embLength, splitBy, dimensions, order, data);
        }
        else if (vizType === 'cluster-viz') {
            $('#visualizationBody').html('');
            const cluster_data = yield (yield fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
            const text = data[bookIdx]['sentences'];
            const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence'];
            cluster_viz.drawClusterPlot(cluster_data, text, chapterBreaks);
        }
        else if (vizType == 'zoom-viz') {
            $('#visualizationBody').html('');
            const cluster_data = yield (yield fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
            const text = data[bookIdx]['sentences'];
            const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence'];
            zoom_viz.drawZoomPlot(cluster_data, text, chapterBreaks);
        }
        else if (vizType == 'chapter-scroll-viz') {
            $('#container').html('');
            console.log("Here, book = ", bookIdx);
            const cluster_data = yield (yield fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
            const sentences = data[bookIdx]['sentences'];
            const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence'];
            const paragraphBreaks = data[bookIdx]['paragraph_breaks'];
            scroll_viz.init(cluster_data, sentences, paragraphBreaks, chapterBreaks);
        }
        else if (vizType == 'section-text-viz') {
            $('#container').html('');
            const cluster_data = yield (yield fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
            const sentences = data[bookIdx]['sentences'];
            const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence'];
            const paragraphBreaks = data[bookIdx]['paragraph_breaks'];
            zoom_text_viz.init(cluster_data, sentences, paragraphBreaks, chapterBreaks);
        }
    });
}
main();
//# sourceMappingURL=main.js.map