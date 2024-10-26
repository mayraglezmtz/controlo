import cv2
from pyzbar.pyzbar import decode
import numpy as np
import csv
import os

def save_to_csv(product_info, csv_filename='products.csv'):
    file_exists = os.path.isfile(csv_filename)
    with open(csv_filename, mode='a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['barcode']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(product_info)
        print(f"Product information saved to {csv_filename}.")

def process_barcode_image(image):
    # Convert PIL image to OpenCV format
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    decoded_objects = decode(image_cv)

    for obj in decoded_objects:
        barcode_data = obj.data.decode('utf-8')
        print(f"Barcode detected: {barcode_data}")
        save_to_csv({'barcode': barcode_data})

    if decoded_objects:
        return f"Processed {len(decoded_objects)} barcodes."
    else:
        return "No barcode detected."
