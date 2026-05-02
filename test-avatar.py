from PIL import Image, ImageDraw, ImageFont
import os

# Create a simple test avatar image
img = Image.new('RGB', (100, 100), color='#6366f1')
draw = ImageDraw.Draw(img)

# Add text
try:
    # Try to use a default font
    font = ImageFont.load_default()
    draw.text((35, 35), "TEST", fill='white', font=font)
except:
    # Fallback if font loading fails
    draw.text((35, 35), "TEST", fill='white')

# Save the image
img.save('test-avatar.png')
print("Test avatar created: test-avatar.png")