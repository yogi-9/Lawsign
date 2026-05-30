import os
import re
import time
import json
import logging
from flask import Flask, request, jsonify
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
import cv2
import numpy as np
from PIL import Image

app = Flask(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# --- Constants & Patterns ---
PATTERNS = [
    'signature', 'sign here', 'signed by', 'authorized signatory',
    'witness', 'party a', 'party b', 'party 1', 'party 2',
    'lessor', 'lessee', 'buyer', 'seller', 'guarantor', 'executor',
    'notary public', 'हस्ताक्षर', 'साक्षी'
]
KEYWORD_REGEX = re.compile(r'(' + '|'.join(PATTERNS) + r')', re.IGNORECASE)

def clamp(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def calc_pct(x, y_top, w, h, page_w, page_h):
    # As per instructions: PDF origin is bottom-left, so field_y_from_top = page_height - bbox_top
    y_from_top = page_h - y_top
    
    xPct = (x / page_w) * 100
    yPct = (y_from_top / page_h) * 100
    wPct = (w / page_w) * 100
    hPct = (h / page_h) * 100
    
    return {
        'xPct': clamp(xPct, 0, 95),
        'yPct': clamp(yPct, 0, 95),
        'widthPct': clamp(wPct, 3, 60),
        'heightPct': clamp(hPct, 2, 15)
    }

def dedup_fields(fields):
    if not fields:
        return []
    
    # Sort by confidence descending so we keep the highest confidence
    fields = sorted(fields, key=lambda f: f['confidence'], reverse=True)
    deduped = []
    
    for f in fields:
        is_dup = False
        for d in deduped:
            if f['page'] == d['page']:
                if abs(f['xPct'] - d['xPct']) <= 3 and abs(f['yPct'] - d['yPct']) <= 3:
                    is_dup = True
                    break
        if not is_dup:
            deduped.append(f)
            
    # Sort final output by page ASC then yPct ASC
    deduped.sort(key=lambda f: (f['page'], f['yPct']))
    return deduped

def extract_text_near(words, x_min, x_max, y_min, y_max):
    text = []
    for w in words:
        if w['x0'] >= x_min and w['x1'] <= x_max and w['top'] >= y_min and w['bottom'] <= y_max:
            text.append(w['text'])
    return ' '.join(text)

def process_pdf(file_path):
    fields = []
    total_pages = 0
    extracted_any_text = False
    
    try:
        with pdfplumber.open(file_path, password='') as pdf:
            total_pages = len(pdf.pages)
            for page_idx, page in enumerate(pdf.pages):
                page_num = page_idx + 1
                page_w = page.width
                page_h = page.height
                
                words = page.extract_words(x_tolerance=3, y_tolerance=3)
                if words:
                    extracted_any_text = True
                
                # --- Pass 1: Underscore line detection ---
                chars = page.chars
                underscore_seqs = []
                current_seq = []
                for c in chars:
                    if c['text'] == '_':
                        if not current_seq:
                            current_seq.append(c)
                        else:
                            # touches next char's x0 within 2pt
                            if abs(c['x0'] - current_seq[-1]['x1']) <= 2 and abs(c['top'] - current_seq[-1]['top']) <= 2:
                                current_seq.append(c)
                            else:
                                if len(current_seq) >= 8:
                                    underscore_seqs.append(current_seq)
                                current_seq = [c]
                    else:
                        if len(current_seq) >= 8:
                            underscore_seqs.append(current_seq)
                        current_seq = []
                if len(current_seq) >= 8:
                    underscore_seqs.append(current_seq)
                    
                for seq in underscore_seqs:
                    x = seq[0]['x0']
                    y = seq[0]['top']
                    w = seq[-1]['x1'] - seq[0]['x0']
                    h = 18
                    
                    # Look 60pt ABOVE
                    near_text = extract_text_near(words, x-50, x+w+50, y-60, y)
                    label = 'Signature'
                    match = KEYWORD_REGEX.search(near_text)
                    if match:
                        label = match.group(1).title()
                        
                    pcts = calc_pct(x, y, w, h, page_w, page_h)
                    f = {
                        'page': page_num,
                        **pcts,
                        'label': label,
                        'confidence': 0.98,
                        'method': 'underscore_line'
                    }
                    fields.append(f)

                # --- Pass 2: Keyword + blank space detection ---
                for w_idx, w in enumerate(words):
                    match = KEYWORD_REGEX.search(w['text'])
                    if match:
                        label = match.group(1).title()
                        # Same line colon check
                        line_text = extract_text_near(words, 0, page_w, w['top']-2, w['bottom']+2)
                        
                        box_x, box_y, box_w, box_h = None, None, None, None
                        
                        if ':' in line_text:
                            colon_idx = line_text.find(':')
                            # Just place it after the colon
                            box_x = w['x1'] + 10
                            box_y = w['top']
                            box_w = page_w - box_x - 50
                            box_h = 18
                        else:
                            # Look 15-40pt below
                            below_y_min = w['bottom'] + 15
                            below_y_max = w['bottom'] + 40
                            
                            found_line = False
                            # Check drawn lines
                            for line in page.edges + page.lines:
                                if 'top' in line and 'bottom' in line and line['width'] > 40:
                                    # Horizontal line
                                    if abs(line['top'] - line['bottom']) < 5:
                                        if below_y_min <= line['top'] <= below_y_max:
                                            box_x = line['x0']
                                            box_y = line['top'] - 14
                                            box_w = line['width']
                                            box_h = 18
                                            found_line = True
                                            break
                            if not found_line:
                                box_x = w['x0']
                                box_y = w['bottom'] + 20
                                box_w = page_w - box_x - 50
                                box_h = 18
                                
                        if box_x is not None:
                            pcts = calc_pct(box_x, box_y, box_w, box_h, page_w, page_h)
                            fields.append({
                                'page': page_num,
                                **pcts,
                                'label': label,
                                'confidence': 0.92,
                                'method': 'keyword_label'
                            })

                # --- Pass 3: Drawn line detection ---
                for line in page.edges + page.lines:
                    if 'top' in line and 'bottom' in line and 'x0' in line and 'x1' in line:
                        if line['width'] > 60 and abs(line['top'] - line['bottom']) < 5:
                            # In bottom 50%
                            if line['top'] > page_h / 2:
                                # No text within 5pt above
                                text_above = extract_text_near(words, line['x0'], line['x1'], line['top']-5, line['top'])
                                if not text_above.strip():
                                    # Valid blank line
                                    box_x = line['x0']
                                    box_y = line['top'] - 14
                                    box_w = line['width']
                                    box_h = 18
                                    
                                    near_text = extract_text_near(words, line['x0']-50, line['x1']+50, line['top']-80, line['top'])
                                    label = 'Signature'
                                    match = KEYWORD_REGEX.search(near_text)
                                    if match:
                                        label = match.group(1).title()
                                        
                                    pcts = calc_pct(box_x, box_y, box_w, box_h, page_w, page_h)
                                    fields.append({
                                        'page': page_num,
                                        **pcts,
                                        'label': label,
                                        'confidence': 0.88,
                                        'method': 'drawn_line'
                                    })
    except Exception as e:
        logger.error(f"Error in process_pdf: {e}")
        pass
        
    return fields, total_pages, extracted_any_text

def process_image(file_path, is_pdf=False, num_pages=1):
    fields = []
    total_pages = num_pages
    
    try:
        images = []
        if is_pdf:
            images = convert_from_path(file_path, dpi=300)
            total_pages = len(images)
        else:
            images = [Image.open(file_path).convert('RGB')]
            
        for page_idx, img in enumerate(images):
            page_num = page_idx + 1
            
            # --- Pass 4: Tesseract OCR ---
            # Get dict
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            img_w, img_h = img.size
            
            # Group words into lines
            lines_data = {}
            n_boxes = len(data['text'])
            for i in range(n_boxes):
                if int(data['conf'][i]) > 0:
                    text = data['text'][i].strip()
                    if not text:
                        continue
                    key = (data['block_num'][i], data['par_num'][i], data['line_num'][i])
                    if key not in lines_data:
                        lines_data[key] = {
                            'text': [text],
                            'x0': data['left'][i],
                            'y0': data['top'][i],
                            'x1': data['left'][i] + data['width'][i],
                            'y1': data['top'][i] + data['height'][i]
                        }
                    else:
                        lines_data[key]['text'].append(text)
                        lines_data[key]['x0'] = min(lines_data[key]['x0'], data['left'][i])
                        lines_data[key]['y0'] = min(lines_data[key]['y0'], data['top'][i])
                        lines_data[key]['x1'] = max(lines_data[key]['x1'], data['left'][i] + data['width'][i])
                        lines_data[key]['y1'] = max(lines_data[key]['y1'], data['top'][i] + data['height'][i])
            
            for key, line in lines_data.items():
                line_text = ' '.join(line['text'])
                match = KEYWORD_REGEX.search(line_text)
                if match:
                    label = match.group(1).title()
                    x = line['x0']
                    y = line['y0']
                    w = line['x1'] - line['x0']
                    h = line['y1'] - line['y0']
                    
                    # Just put below keyword
                    box_x = x
                    box_y = y + h + 20
                    box_w = img_w - x - 100
                    box_h = h if h > 10 else 40
                    
                    pcts = calc_pct(box_x, box_y, box_w, box_h, img_w, img_h)
                    fields.append({
                        'page': page_num,
                        **pcts,
                        'label': label,
                        'confidence': 0.85,
                        'method': 'tesseract_ocr'
                    })
            
            # Hough lines for underscores/drawn lines
            open_cv_image = np.array(img)
            gray = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=60, maxLineGap=10)
            
            if lines is not None:
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    if abs(y1 - y2) < 5: # Horizontal
                        box_x = min(x1, x2)
                        box_y = min(y1, y2) - 40
                        box_w = abs(x2 - x1)
                        box_h = 40
                        
                        pcts = calc_pct(box_x, box_y, box_w, box_h, img_w, img_h)
                        fields.append({
                            'page': page_num,
                            **pcts,
                            'label': 'Signature',
                            'confidence': 0.85,
                            'method': 'tesseract_line'
                        })

    except Exception as e:
        logger.error(f"Error in process_image: {e}")
        pass
        
    return fields, total_pages

@app.route('/detect-fields', methods=['POST'])
def detect_fields():
    start_time = time.time()
    req_data = request.json
    
    if not req_data or 'file_path' not in req_data:
        return jsonify({'success': False, 'error': 'Missing file_path'})
        
    file_path = req_data['file_path']
    mime_type = req_data.get('mime_type', 'application/pdf')
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'error': 'File not found'})
        
    fields = []
    page_count = 1
    
    try:
        if mime_type == 'application/pdf':
            pdf_fields, p_count, extracted_text = process_pdf(file_path)
            fields.extend(pdf_fields)
            page_count = p_count
            
            if not extracted_text:
                img_fields, _ = process_image(file_path, is_pdf=True, num_pages=page_count)
                fields.extend(img_fields)
        else:
            img_fields, p_count = process_image(file_path, is_pdf=False)
            fields.extend(img_fields)
            page_count = p_count
            
        fields = dedup_fields(fields)
        
        # --- Pass 5: Positional Heuristics removed to allow Node.js fallback ---
        
        for f in fields:
            logger.info(f"[ocr] page {f['page']}: \"{f['label']}\" at ({f['xPct']:.1f}%, {f['yPct']:.1f}%) conf={f['confidence']:.2f} via {f['method']}")
            
        processing_time = int((time.time() - start_time) * 1000)
        
        return jsonify({
            'success': True,
            'fields': fields,
            'pageCount': page_count,
            'processingTimeMs': processing_time
        })
        
    except Exception as e:
        logger.error(f"Error processing {file_path}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'engine': 'pdfplumber+tesseract'
    })

if __name__ == '__main__':
    logger.info("Starting LawSign OCR Python Microservice on port 5002")
    app.run(host='0.0.0.0', port=5002)
