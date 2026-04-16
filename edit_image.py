from PIL import Image, ImageDraw, ImageFont

# Load image
img = Image.open('public/og-image.png')
draw = ImageDraw.Draw(img)

# We will draw a semi-transparent red box to figure out where "예수인교회" is.
# Let's grid it out.
width, height = img.size

# Draw coordinate lines
for x in range(0, width, 50):
    draw.line((x, 0, x, height), fill="blue")
for y in range(0, height, 50):
    draw.line((0, y, width, y), fill="blue")

img.save('public/coordinate_test.png')
print("Saved coordinate_test.png", width, "x", height)
