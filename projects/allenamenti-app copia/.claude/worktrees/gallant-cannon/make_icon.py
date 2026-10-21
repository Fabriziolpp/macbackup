from PIL import Image, ImageDraw, ImageFont
import os, math

def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size

    # ── Background: dark rounded square ──────────────────────────
    radius = s * 0.22
    bg_color = (26, 26, 36)
    def rounded_rect(draw, xy, r, fill):
        x0, y0, x1, y1 = xy
        r = int(r)
        draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
        draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
        draw.ellipse([x0, y0, x0+2*r, y0+2*r], fill=fill)
        draw.ellipse([x1-2*r, y0, x1, y0+2*r], fill=fill)
        draw.ellipse([x0, y1-2*r, x0+2*r, y1], fill=fill)
        draw.ellipse([x1-2*r, y1-2*r, x1, y1], fill=fill)

    rounded_rect(d, [0, 0, s-1, s-1], radius, bg_color)

    # ── Accent gradient strip (simulate with two rects) ──────────
    accent = (59, 130, 246)   # blue-500
    accent2 = (99, 102, 241)  # indigo-500

    # ── Dumbbell drawing ─────────────────────────────────────────
    cx = s / 2
    cy = s / 2

    bar_h   = s * 0.085
    bar_w   = s * 0.52
    plate_w = s * 0.10
    plate_h = s * 0.38
    collar_w= s * 0.055
    collar_h= s * 0.28
    end_w   = s * 0.07
    end_h   = s * 0.44

    plate_color  = (59, 130, 246)
    collar_color = (37, 99, 235)
    end_color    = (29, 78, 216)
    bar_color    = (148, 163, 184)
    bar_shine    = (203, 213, 225)

    def hrect(draw, cx, cy, w, h, fill, rx=0):
        x0 = cx - w/2
        y0 = cy - h/2
        if rx:
            rounded_rect(draw, [x0, y0, x0+w, y0+h], rx, fill)
        else:
            draw.rectangle([x0, y0, x0+w, y0+h], fill=fill)

    # Bar
    hrect(d, cx, cy, bar_w, bar_h, bar_color)
    # Bar shine
    hrect(d, cx, cy - bar_h*0.18, bar_w, bar_h*0.3, bar_shine)

    # Left side
    lx = cx - bar_w/2
    hrect(d, lx - collar_w/2, cy, collar_w, collar_h, collar_color)
    hrect(d, lx - collar_w - plate_w/2, cy, plate_w, plate_h, plate_color, rx=s*0.02)
    hrect(d, lx - collar_w - plate_w - end_w/2, cy, end_w, end_h, end_color, rx=s*0.03)

    # Right side
    rx2 = cx + bar_w/2
    hrect(d, rx2 + collar_w/2, cy, collar_w, collar_h, collar_color)
    hrect(d, rx2 + collar_w + plate_w/2, cy, plate_w, plate_h, plate_color, rx=s*0.02)
    hrect(d, rx2 + collar_w + plate_w + end_w/2, cy, end_w, end_h, end_color, rx=s*0.03)

    # ── Small label "GYM" at bottom ──────────────────────────────
    try:
        font_size = max(int(s * 0.11), 8)
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Futura.ttc", font_size)
    except:
        font = ImageFont.load_default()

    text = "GYM"
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (s - tw) / 2
    ty = cy + s * 0.22
    d.text((tx, ty), text, fill=(148, 163, 184), font=font)

    return img

# Build iconset
iconset_path = "/tmp/Allenamenti.iconset"
os.makedirs(iconset_path, exist_ok=True)

sizes = [16, 32, 64, 128, 256, 512, 1024]
for sz in sizes:
    img = draw_icon(sz)
    img.save(f"{iconset_path}/icon_{sz}x{sz}.png")
    if sz <= 512:
        img2x = draw_icon(sz * 2)
        img2x.save(f"{iconset_path}/icon_{sz}x{sz}@2x.png")

print("Iconset created at", iconset_path)
