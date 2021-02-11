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
 * @fileoverview Main app file. Calls the corresponding viz script depending on the values of the "vizChoice" dropdown.
 */

import * as grid_viz from './rectangle-grid-viz'
import * as cluster_viz from './cluster-viz'
import * as scroll_viz from './chapter-scroll-viz'
import * as zoom_viz from './zoom-viz'
import * as zoom_text_viz from './section-text-viz'

declare const getmdlSelect: any;
declare const $: any;

async function main() {
  const data: any =
      await (await fetch('data/book_text_data.json')).json();
  const idxBookMap: {[bookname: string]: number} =
      {};  // Maps book name strings to their index in the data json
  for (let i = 0; i < data.length; i++) {
    const bookName = data[i].name.split('.')[0];
    const selectedString = (i == 0) ? ` data-selected="true">` : '>'
    idxBookMap[bookName] = i;
    $('#menuDropdown')
        .append(
            `<li class="mdl-menu__item" data-val="${bookName}"` +
            selectedString + `${bookName}</li>`);
  }

  console.log(idxBookMap);

  // Reinitialize dropdown after adding choices
  getmdlSelect.init('#bookChoiceDiv');

  $('.mdl-textfield__input.dropdown').on('change', (ev: InputEvent) => {
    
    const bookName: string = $('#bookChoice').val();
    const vizType: string = $('#vizChoice').val();
    const embType: string = $('#embChoice').val();
    let reduceType: string = $('#reduceChoice').val();
    const avgWindow: string = $('#avgChoice').val();
    const dimensions: string = $('#dimChoice').val();
    const order: string = $('#orderChoice').val();
    const splitBy: string = $('#splitChoice').val();

    if (vizType == 'heatmap') {
      reduceType = 'dist'
    }
    const embString = [embType, reduceType, avgWindow].join('-');

    if (reduceType == 'diffs') {
      $('#dimChoiceDiv').addClass('disabled-dropdown');
    }
    else {
      $('#dimChoiceDiv').removeClass('disabled-dropdown');
    }

    displayData(
        bookName, vizType, splitBy, embString, dimensions, 
        order, data, idxBookMap);
  });

  $('#bookChoice').change();
}

async function displayData(
    bookName: string, vizType: string, splitBy: string, embType: string, dimensions: string,
    order: string, data: any, idxBookMap: {[bookname: string]: number}) {

  $('#searchText').val('');
  const bookIdx: number = idxBookMap[bookName];

  if (vizType === 'grid-plot') {
    $('#visualizationBody').html('');
    const url = 'data/' + embType.split('-')[1] + '_bytes/' + bookIdx.toString() + '-' + embType 
    const fetchData = await fetch(url)
    const embBuffer = await fetchData.arrayBuffer();
    const embData = new Float32Array(embBuffer)
    const embLength = (embType.split('-')[1] == 'diffs') ? 1 : 3
    grid_viz.drawGridPlot(bookIdx, embData, embLength, splitBy, dimensions, order, data);
  } else if (vizType === 'cluster-viz') {
    $('#visualizationBody').html('');
    const cluster_data: any =
      await (await fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
    const text = data[bookIdx]['sentences']
    const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence']
    cluster_viz.drawClusterPlot(cluster_data, text, chapterBreaks);
  } else if (vizType == 'zoom-viz') {
    $('#visualizationBody').html('');
    const cluster_data: any =
      await (await fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
    const text = data[bookIdx]['sentences']
    const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence']
    zoom_viz.drawZoomPlot(cluster_data, text, chapterBreaks);
  } else if (vizType == 'chapter-scroll-viz') {
    $('#container').html('')
    console.log("Here, book = ", bookIdx)
    const cluster_data: any =
      await (await fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
    const sentences = data[bookIdx]['sentences']
    const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence']
    const paragraphBreaks = data[bookIdx]['paragraph_breaks']
    scroll_viz.init(cluster_data, sentences, paragraphBreaks, chapterBreaks);

  } else if (vizType == 'section-text-viz') {
    $('#container').html('')
    const cluster_data: any =
      await (await fetch('data/section_text_data/' + bookIdx.toString() + '-universal-umap-1-cutoff-cluster-data.json')).json();
    const sentences = data[bookIdx]['sentences']
    const chapterBreaks = data[bookIdx]['chapter_breaks_by_sentence']
    const paragraphBreaks = data[bookIdx]['paragraph_breaks']
    zoom_text_viz.init(cluster_data, sentences, paragraphBreaks, chapterBreaks);
  }
}

main();
