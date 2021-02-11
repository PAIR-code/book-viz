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
/**  Reformats data into a list with ChapterText entries, which include the sentence or paragraph
 *   text, the chapter number, and the embedding of that text. If order == 'color', order the resulting
 *   output by hue in HSL color.
 * */
export function getParData(paragraphs, chapterBreaks, embeddings, order, dimensions) {
    if (order == 'color') {
        return getPerColorJson(paragraphs, embeddings, dimensions);
    }
    else {
        return getPerChapterJson(paragraphs, chapterBreaks, embeddings);
    }
}
function getPerChapterJson(paragraphs, chapterBreaks, embeddings) {
    // create parData, where each entry corresponds to a paragraph,
    // and is a json of form {value = chapter #, text = paragraph text}
    let parData = new Array(paragraphs.length);
    for (let chapter = 0; chapter < chapterBreaks.length; chapter++) {
        const nextChapterParCutoff = ((chapter === chapterBreaks.length - 1) ? paragraphs.length :
            chapterBreaks[chapter + 1]);
        let currentParagraphNum = chapterBreaks[chapter];
        while (currentParagraphNum < nextChapterParCutoff) {
            parData[currentParagraphNum] = {
                value: chapter,
                text: paragraphs[currentParagraphNum],
                emb: embeddings[currentParagraphNum]
            };
            currentParagraphNum += 1;
        }
    }
    parData = parData.filter(d => d ? true : false);
    return parData;
}
function getPerColorJson(paragraphs, embeddings, dimension) {
    let textColorData = [];
    for (let i = 0; i < paragraphs.length; i++) {
        textColorData.push({ 'text': paragraphs[i], 'rgb': embeddings[i], 'hsl': embeddings[i] });
    }
    if (embeddings[0].length == 1) {
        dimension = '0';
    }
    const sortedColorData = sortTextByColor(textColorData, dimension);
    let parData = new Array(paragraphs.length);
    for (let i = 0; i < paragraphs.length; i++) {
        parData[i] = {
            value: 0,
            text: sortedColorData[i]['text'],
            emb: sortedColorData[i]['rgb']
        };
    }
    parData = parData.filter(d => d ? true : false);
    return parData;
}
export const sum = (arr) => {
    return arr.reduce((a, b) => a + b, 0);
};
// Color Functions
function rgbToHsl(c) {
    let r = c[0], g = c[1], b = c[2];
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    }
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return new Array(h * 360, s, l);
}
function sortTextByColor(textColorData, dimension) {
    let sortedData;
    if (dimension == 'all') {
        for (let i = 0; i < textColorData.length; i++) {
            textColorData[i]['hsl'] = rgbToHsl(textColorData[i]['rgb']);
        }
        sortedData = textColorData.sort((c1, c2) => {
            // Sort by hue
            return c1.hsl[0] - c2.hsl[0];
        });
    }
    else {
        sortedData = textColorData.sort((c1, c2) => {
            // Sort by hue
            return c1.rgb[parseInt(dimension)] - c2.rgb[parseInt(dimension)];
        });
    }
    return sortedData;
}
export function arrayToRGBAString(arr, opacity = 0.8) {
    return ('rgba(' + arr[0] * 255 + ',' + arr[1] * 255 + ',' + arr[2] * 255 + ',' + opacity + ')');
}
//# sourceMappingURL=utils.js.map