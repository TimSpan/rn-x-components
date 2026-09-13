#!/usr/bin/env python3
"""
X-Components 品牌图标生成器
- 主图形：白色圆头斜杠 X，品牌蓝渐变底（与官方 SVG 同源几何）
- 产物：
  1) assets/icons/x-icon-1024.png        应用主图标（圆角方，app.json 用）
  2) assets/icons/x-icon-square-1024.png 全出血方版（商店用）
  3) assets/icons/x-icon-transparent-512.png 透明底 X（文档/内嵌用）
  4) android res 全套：ic_launcher / ic_launcher_round / adaptive 三层（webp）
"""
from PIL import Image, ImageDraw
import os

ROOT = "/Users/myx/Desktop/rn-x-components/my-app"
ICONS = os.path.join(ROOT, "assets", "icons")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

# 品牌色（与 xTheme colorPrimary 一致）
BLUE_TOP = (74, 166, 255)      # #4AA6FF
BLUE_BOTTOM = (14, 111, 216)   # #0E6FD8
WHITE = (255, 255, 255, 255)


def draw_gradient(size):
    """对角线性渐变底"""
    img = Image.new("RGB", (size, size), BLUE_TOP)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)
            r = int(BLUE_TOP[0] + (BLUE_BOTTOM[0] - BLUE_TOP[0]) * t)
            g = int(BLUE_TOP[1] + (BLUE_BOTTOM[1] - BLUE_TOP[1]) * t)
            b = int(BLUE_TOP[2] + (BLUE_BOTTOM[2] - BLUE_TOP[2]) * t)
            px[x, y] = (r, g, b)
    return img


def draw_x(layer_size, stroke_ratio=0.155, extent_ratio=0.52, color=WHITE):
    """在 layer_size 画布中央画圆头 X（两根对角圆头短棒），返回 RGBA 图层"""
    layer = Image.new("RGBA", (layer_size, layer_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    stroke = int(layer_size * stroke_ratio)
    extent = layer_size * extent_ratio  # X 的总宽/高
    half = extent / 2
    cx = cy = layer_size / 2
    r = stroke / 2

    def rounded_bar(p1, p2):
        d.line([p1, p2], fill=color, width=stroke, joint="curve")
        for p in (p1, p2):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)

    rounded_bar((cx - half, cy - half), (cx + half, cy + half))
    rounded_bar((cx + half, cy - half), (cx - half, cy + half))
    return layer


def rounded_corners(img, radius):
    """圆角方裁切（带 alpha）"""
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def circle_crop(img):
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    s = img.size[0]
    d.ellipse([0, 0, s - 1, s - 1], fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def main():
    os.makedirs(ICONS, exist_ok=True)
    S = 1024

    # 1) 全出血方版
    square = draw_gradient(S).convert("RGBA")
    square.alpha_composite(draw_x(S))
    square.save(os.path.join(ICONS, "x-icon-square-1024.png"))

    # 2) 圆角方主图标（iOS/App 内风格，radius≈22.4%）
    master = rounded_corners(square, int(S * 0.224))
    master.save(os.path.join(ICONS, "x-icon-1024.png"))

    # 3) 透明底 X
    draw_x(512).save(os.path.join(ICONS, "x-icon-transparent-512.png"))

    # 4) 安卓全套
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for dpi, legacy in densities.items():
        adaptive = int(legacy * 108 / 48)  # 108dp 网格
        dpi_dir = os.path.join(RES, f"mipmap-{dpi}")
        os.makedirs(dpi_dir, exist_ok=True)

        # 经典启动图标（方 + 圆）
        icon = draw_gradient(legacy).convert("RGBA")
        icon.alpha_composite(draw_x(legacy))
        icon.save(os.path.join(dpi_dir, "ic_launcher.webp"))
        circle_crop(icon).save(os.path.join(dpi_dir, "ic_launcher_round.webp"))

        # 自适应三层
        bg = draw_gradient(adaptive).convert("RGBA")
        bg.save(os.path.join(dpi_dir, "ic_launcher_background.webp"))
        # 前景：X 收进安全区（66/108 ≈ 0.61）→ extent ≈ adaptive*0.52 再整体再缩
        fg = draw_x(adaptive, extent_ratio=0.40)
        fg.save(os.path.join(dpi_dir, "ic_launcher_foreground.webp"))
        # monochrome：纯白 X 透明底
        draw_x(adaptive, extent_ratio=0.40, color=(255, 255, 255, 255)).save(
            os.path.join(dpi_dir, "ic_launcher_monochrome.webp")
        )
        print(f"mipmap-{dpi}: legacy={legacy}px adaptive={adaptive}px done")

    print("ALL DONE →", ICONS)


if __name__ == "__main__":
    main()
