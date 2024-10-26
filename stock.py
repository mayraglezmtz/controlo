from flask import Flask, jsonify, request
import pandas as pd

app = Flask(__name__)

# Load the inventory data
file_path = '/mnt/data/inventario.csv'
inventario_df = pd.read_csv(file_path)

def search_product_formatted(product_name):
    result = inventario_df[inventario_df['nombre'].str.contains(product_name, case=False, na=False)]
    if not result.empty:
        row = result.iloc[0]
        return f'The "{row["nombre"]}" costs "{row["precio_unitario"]}" MXN and there are "{row["cantidad_unidades"]}" units in stock.'
    else:
        return "Product not found."

@app.route('/search_product', methods=['POST'])
def search_product():
    # Retrieve the product name from the request
    data = request.json
    product_name = data.get("product_name", "")
    
    # Perform the product search
    if product_name:
        result = search_product_formatted(product_name)
        return jsonify({"result": result})
    else:
        return jsonify({"error": "No product name provided"}), 400

if __name__ == "__main__":
    app.run(debug=True)
